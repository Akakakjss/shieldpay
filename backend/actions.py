import json
from uuid import uuid4
from fastapi import HTTPException
from backend.analysis import snapshot, analyze
from backend.retrieval import Retriever


def check_current(case, packet_hash=None, require_defense=False):
    analysis = case["analysis"]
    if not analysis:
        raise HTTPException(409, "Analyze this case before building or approving a packet")
    if analysis["source_snapshot"] != snapshot(case):
        raise HTTPException(409, "Evidence or dispute state changed; analyze and review a new packet")
    if packet_hash is not None and packet_hash != analysis["packet_hash"]:
        raise HTTPException(409, "Stale packet hash; review the current packet")
    if require_defense:
        # Recheck deadlines/status without a network operation or trusting a previous decision.
        policy = analyze(case, Retriever("lexical"))
        if not analysis["can_submit"] or not policy["can_submit"]:
            raise HTTPException(409, "Evidence is not eligible for a defense; resolve gaps and contradictions")
        from backend.packet import assert_packet_text_supported
        assert_packet_text_supported(case)
    return analysis


def locked_case(store, db, case_id, mode):
    row = db.execute("SELECT * FROM cases WHERE id=? AND mode=?", (case_id, mode)).fetchone()
    if not row:
        raise HTTPException(404, "Case not found")
    return store._case(row, db)


def unresolved_submission(db, case_id):
    return db.execute(
        "SELECT id FROM approvals WHERE case_id=? AND status IN ('submitting','uncertain','accepted') LIMIT 1",
        (case_id,),
    ).fetchone()


def approve(store, mode, case_id, packet_hash, approved_by):
    with store.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        case = locked_case(store, db, case_id, mode)
        check_current(case, packet_hash, require_defense=True)
        row = db.execute("SELECT id,status FROM approvals WHERE case_id=? AND packet_hash=? AND approved_by=? ORDER BY rowid DESC LIMIT 1", (case_id, packet_hash, approved_by)).fetchone()
        if row and row["status"] == "approved":
            return dict(approval_id=row["id"], packet_hash=packet_hash, status="approved")
        if row:
            raise HTTPException(409, "This approved packet has already entered submission; do not approve it again")
        approval_id = str(uuid4())
        db.execute("INSERT INTO approvals VALUES(?,?,?,?,?,NULL)", (approval_id, case_id, packet_hash, approved_by, "approved"))
        store.record(case_id, "approved", "Explicit local approval by " + approved_by + "; packet=" + packet_hash + "; NOT a PayPal submission.", db)
    return dict(approval_id=approval_id, packet_hash=packet_hash, status="approved")


def submit(store, mode, case_id, approval_id, packet_hash, submit_sandbox=None):
    with store.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        case = locked_case(store, db, case_id, mode)
        check_current(case, packet_hash, require_defense=True)
        row = db.execute("SELECT * FROM approvals WHERE id=? AND case_id=? AND packet_hash=?", (approval_id, case_id, packet_hash)).fetchone()
        if not row:
            raise HTTPException(409, "Matching explicit approval required")
        if row["result"]:
            return json.loads(row["result"])
        if row["status"] != "approved":
            raise HTTPException(409, "Submission already in progress or its outcome is uncertain; reconcile before retrying")
        # Only one local submission may use a case+packet, even across distinct approvers.
        used = db.execute("SELECT * FROM approvals WHERE case_id=? AND packet_hash=? AND status != 'approved'", (case_id, packet_hash)).fetchone()
        if used:
            if used["result"]:
                return json.loads(used["result"])
            raise HTTPException(409, "Packet already entered submission; reconcile before retrying")
        if unresolved_submission(db, case_id):
            raise HTTPException(409, "Another submission for this case is unresolved; reconcile before submitting a new packet")
        db.execute("UPDATE approvals SET status='submitting' WHERE id=?", (approval_id,))
        store.record(case_id, "submission_started", "Local one-use gate claimed; packet=" + packet_hash, db)
    if mode == "demo":
        result = dict(status="simulated", receipt="SIM-" + approval_id, verified=False,
                      detail="Simulation only. No PayPal request was sent and no dispute was changed.")
    else:
        from backend.paypal import PayPalError
        try:
            if submit_sandbox is None:
                raise HTTPException(503, "Sandbox adapter is not configured")
            result = submit_sandbox(case, approval_id)
        except (PayPalError, HTTPException) as exc:
            # The adapter raises only preflight blockers. Failures after a write
            # dispatch are returned as an explicit uncertain/accepted result.
            with store.connect() as db:
                db.execute("UPDATE approvals SET status='blocked' WHERE id=?", (approval_id,))
                store.record(case_id, "submission_blocked", str(exc.detail), db)
            raise
        except Exception:
            # Unknown failure: never free the gate for an automatic retry.
            with store.connect() as db:
                db.execute("UPDATE approvals SET status='uncertain' WHERE id=?", (approval_id,))
                store.record(case_id, "submission_uncertain", "Unexpected local failure. Reconcile the exact sandbox dispute before retrying; raw errors are not logged.", db)
            raise HTTPException(503, "Submission outcome is uncertain. Reconcile the exact sandbox dispute before retrying.") from None
    with store.connect() as db:
        db.execute("UPDATE approvals SET status=?,result=? WHERE id=?", (result["status"], json.dumps(result), approval_id))
        store.record(case_id, "simulated_submission" if mode == "demo" else "sandbox_submission_result", json.dumps(result), db)
    return result
