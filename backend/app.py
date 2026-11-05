from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from starlette._utils import get_route_path
from fastapi.responses import JSONResponse, Response, FileResponse
from pathlib import Path
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, field_validator
from backend.packet import build_pdf
from backend.actions import approve, submit, check_current, locked_case
from backend.paypal import PayPal, PayPalError
import secrets
from backend.config import Settings
from backend.demo import seed
from backend.store import Store
from backend.retrieval import Retriever
from backend.analysis import analyze, snapshot
from backend.importing import ImportInput, import_sources


class ApprovalInput(BaseModel):
    packet_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    approved_by: str = Field(min_length=1, max_length=100)

    @field_validator("approved_by")
    @classmethod
    def nonempty_name(cls, value):
        value = value.strip()
        if not value or any(ord(c) < 32 for c in value):
            raise ValueError("A nonempty reviewer name without control characters is required")
        return value


class SubmitInput(BaseModel):
    packet_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    approval_id: str = Field(min_length=1, max_length=100)


def create_app(settings=None, frontend_dist=None):
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(settings.db_path)
        if settings.mode == "demo":
            seed(app.state.store)
        try:
            yield
        finally:
            app.state.paypal.close()

    app = FastAPI(title="ShieldPay", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.retriever = Retriever(settings.ai)
    app.state.paypal = PayPal(settings)
    app.state.paypal_network_tested = False

    @app.middleware("http")
    async def require_admin_for_sandbox_mutations(request: Request, call_next):
        # Match the router's trusted ASGI root-path normalization, never Host-derived URL parsing.
        path = get_route_path(request.scope)
        mutation = request.method not in {"GET", "HEAD", "OPTIONS"} and path.startswith("/api/")
        sensitive_read = path == "/api/cases" or path.startswith("/api/cases/") or path == "/api/audit"
        if settings.mode == "sandbox" and (mutation or sensitive_read):
            operation = "mutations" if mutation else "records"
            if not settings.admin_token:
                return JSONResponse(status_code=503, content={"detail": "Set SHIELDPAY_ADMIN_TOKEN before enabling sandbox " + operation})
            supplied = request.headers.get("X-Admin-Token", "")
            if not supplied or not secrets.compare_digest(supplied.encode(), settings.admin_token.encode()):
                return JSONResponse(status_code=401, content={"detail": "A valid X-Admin-Token is required for sandbox " + operation}, headers={"Cache-Control": "no-store"})
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(PayPalError)
    async def paypal_error(request, exc):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return JSONResponse(status_code=422, content={"detail": "Invalid request: " + "; ".join(str(e["loc"][-1]) + ": " + e["msg"] for e in exc.errors())})

    def case(case_id):
        found = app.state.store.get_case(case_id, settings.mode)
        if not found:
            raise HTTPException(404, "Case not found")
        return found

    @app.get("/api/health")
    def health():
        return dict(status="ok", mode=settings.mode,
                    ai=app.state.retriever.status(),
                    paypal=dict(configured=settings.paypal_configured, environment="sandbox"))

    @app.get("/api/cases")
    def cases():
        return [{k:v for k,v in c.items() if k not in {"sources", "analysis", "audit"}} for c in app.state.store.list_cases(settings.mode)]

    @app.get("/api/cases/{case_id}")
    def detail(case_id: str):
        return case(case_id)

    @app.post("/api/cases/{case_id}/sources/import")
    def import_case_sources(case_id: str, payload: ImportInput):
        if settings.mode != "sandbox":
            raise HTTPException(409, "Merchant evidence import is available only in sandbox mode")
        return import_sources(app.state.store, case_id, payload)

    @app.post("/api/cases/{case_id}/analyze")
    def analyze_case(case_id: str):
        result = analyze(case(case_id), app.state.retriever)
        import json
        with app.state.store.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            latest = locked_case(app.state.store, db, case_id, settings.mode)
            if snapshot(latest) != result["source_snapshot"]:
                raise HTTPException(409, "Evidence or dispute state changed during analysis; review the latest records and analyze again")
            data = json.loads(db.execute("SELECT data FROM cases WHERE id=?", (case_id,)).fetchone()[0])
            data["risk"] = "ready" if result["can_submit"] else ("blocked" if result["contradictions"] else "review")
            db.execute("UPDATE cases SET analysis=?,data=? WHERE id=?", (json.dumps(result), json.dumps(data), case_id))
            app.state.store.record(case_id, "analyzed", "Evidence consistency policy applied; provider=" + result["provider"], db)
        return result

    @app.get("/api/cases/{case_id}/packet.pdf")
    def packet(case_id: str):
        current = case(case_id)
        check_current(current)
        return Response(build_pdf(current, settings.mode), media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="shieldpay-{current["id"]}.pdf"'})

    @app.get("/api/cases/{case_id}/payload-preview")
    def payload_preview(case_id: str):
        from backend.evidence_payload import build_evidence_payload
        from backend.paypal import DOCUMENT_NAME
        current = case(case_id)
        analysis = check_current(current, require_defense=True)
        try:
            payload = build_evidence_payload(current, "ShieldPay packet " + analysis["packet_hash"])
        except ValueError as exc:
            raise HTTPException(409, "Payload preview blocked: " + str(exc)) from exc
        return dict(environment="sandbox", preview_only=True, packet_hash=analysis["packet_hash"],
                    input=payload, file=dict(name=DOCUMENT_NAME, media_type="application/pdf"),
                    detail=("Synthetic data preview. " if settings.mode == "demo" else "Local sandbox packet preview. ") +
                           "Multipart input JSON plus a generated binary PDF; no PayPal request sent. This preview does not approve or submit the packet.")

    @app.post("/api/cases/{case_id}/approve")
    def approve_case(case_id: str, payload: ApprovalInput):
        return approve(app.state.store, settings.mode, case_id, payload.packet_hash, payload.approved_by)

    @app.post("/api/cases/{case_id}/submit")
    def submit_case(case_id: str, payload: SubmitInput):
        def send(current, approval_id):
            # Only IDs obtained through sandbox sync are accepted. Sources never supply URLs or actions.
            if not current["id"].startswith("PP-") or current["id"].startswith("DEMO-"):
                raise HTTPException(409, "Synthetic IDs cannot be sent to sandbox")
            return app.state.paypal.provide_evidence(current["id"], build_pdf(current, "sandbox"),
                "ShieldPay packet " + current["analysis"]["packet_hash"], approval_id, expected_case=current)
        return submit(app.state.store, settings.mode, case_id, payload.approval_id, payload.packet_hash, send)

    @app.get("/api/paypal/status")
    def paypal_status():
        return dict(configured=settings.paypal_configured, environment="sandbox", mode=settings.mode,
                    admin_configured=bool(settings.admin_token), network_tested=app.state.paypal_network_tested,
                    detail="Sandbox OAuth and dispute reads succeeded in this process. Evidence-write permissions and dispute outcomes are not verified." if app.state.paypal_network_tested else ("Credentials configured, not proof of OAuth or Disputes permissions. Enable Disputes in PayPal App features." if settings.paypal_configured else "Sandbox credentials missing. Demo never calls PayPal."))

    @app.post("/api/paypal/sync")
    def paypal_sync():
        if settings.mode != "sandbox":
            raise HTTPException(409, "PayPal sync is available only in sandbox mode")
        details, since = app.state.paypal.list_disputes()
        app.state.paypal_network_tested = True
        from backend.sync import map_dispute
        mapped = [map_dispute(d) for d in details]
        for item in mapped:
            app.state.store.put_case(item, mode="sandbox")
            app.state.store.record(item["id"], "sandbox_synced", "Fetched exact dispute details. No synthetic or inferred merchant evidence imported.")
        return dict(imported=len(mapped), since=since, has_more=False,
                    detail="Imported all returned pages for the last 90 days. Import order-scoped merchant records with explicit unverified-provenance acknowledgment; cases remain blocked until evidence checks pass.")

    @app.get("/api/audit")
    def audit():
        ids = {c["id"] for c in app.state.store.list_cases(settings.mode)}
        return [a for a in app.state.store.audit() if a["case_id"] in ids]

    @app.post("/api/demo/cases/{case_id}/late-message")
    def late_message(case_id: str):
        if settings.mode != "demo":
            raise HTTPException(409, "Synthetic drift scenarios are disabled in sandbox mode")
        from backend.demo_drift import inject_late_message
        return inject_late_message(app.state.store, case_id)

    @app.post("/api/demo/reset")
    def reset():
        if settings.mode != "demo":
            raise HTTPException(409, "Synthetic reset is disabled in sandbox mode")
        app.state.store.reset_demo()
        seed(app.state.store)
        return {"ok": True}

    dist = Path(frontend_dist) if frontend_dist is not None else Path(__file__).resolve().parents[1] / "frontend" / "dist"
    if (dist / "index.html").is_file():
        dist = dist.resolve()

        @app.get("/{path:path}", include_in_schema=False)
        def frontend(path: str):
            if path == "api" or path.startswith("api/"):
                raise HTTPException(404, "API resource not found")
            target = (dist / path).resolve()
            if not target.is_relative_to(dist):
                raise HTTPException(404, "Resource not found")
            if target.is_file():
                return FileResponse(target)
            return FileResponse(dist / "index.html")

    return app


app = create_app()
