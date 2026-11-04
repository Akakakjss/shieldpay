import hashlib
import io
import json
from fastapi.testclient import TestClient
from pypdf import PdfReader
from backend.app import create_app
from backend.config import Settings


def test_pdf_approval_and_idempotent_simulated_submission(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "state.db"), ai="lexical"))
    with TestClient(app) as client:
        url = "/api/cases/DEMO-1042"
        assert client.get(url + "/packet.pdf").status_code == 409
        analysis = client.post(url + "/analyze").json()
        response = client.get(url + "/packet.pdf")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF-")
        text = "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(response.content)).pages)
        assert "SYNTHETIC" in text
        assert analysis["packet_hash"] in text
        assert "1042-carrier" in text
        assert "SHA256" in text
        assert "ORDER-9999" not in text
        assert client.post(url + "/approve", json={"packet_hash": "0" * 64, "approved_by": "Alex"}).status_code == 409
        approval = client.post(url + "/approve", json={"packet_hash": analysis["packet_hash"], "approved_by": "Alex"}).json()
        assert approval["status"] == "approved"
        assert client.post(url + "/approve", json={"packet_hash": analysis["packet_hash"], "approved_by": "Alex"}).json() == approval
        assert client.post(url + "/submit", json={"approval_id": "unknown", "packet_hash": analysis["packet_hash"]}).status_code == 409
        payload = {"approval_id": approval["approval_id"], "packet_hash": analysis["packet_hash"]}
        result = client.post(url + "/submit", json=payload)
        assert result.status_code == 200, result.text
        assert result.json()["status"] == "simulated"
        assert result.json()["verified"] is False
        assert "no" in result.json()["detail"].lower()
        assert client.post(url + "/submit", json=payload).json() == result.json()
        audit = client.get(url).json()["audit"]
        assert sum(a["action"] == "simulated_submission" for a in audit) == 1
        assert client.post("/api/demo/reset").json() == {"ok": True}
        assert client.get(url).json()["analysis"] is None


def test_stale_source_and_unsafe_case_cannot_be_approved_or_submitted(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "state.db"), ai="lexical"))
    with TestClient(app) as client:
        url = "/api/cases/DEMO-1042"
        analysis = client.post(url + "/analyze").json()
        approval = client.post(url + "/approve", json={"packet_hash": analysis["packet_hash"], "approved_by": "Alex"}).json()
        with app.state.store.connect() as db:
            source = json.loads(db.execute("SELECT data FROM sources WHERE id='1042-carrier'").fetchone()[0])
            source["text"] = source["text"].replace("DELIVERED", "IN_TRANSIT")
            source["sha256"] = hashlib.sha256(source["text"].encode()).hexdigest()
            db.execute("UPDATE sources SET data=? WHERE id=?", (json.dumps(source), source["id"]))
        assert client.get(url + "/packet.pdf").status_code == 409
        assert client.post(url + "/submit", json={"approval_id": approval["approval_id"], "packet_hash": analysis["packet_hash"]}).status_code == 409
        assert client.post(url + "/approve", json={"packet_hash": analysis["packet_hash"], "approved_by": "Alex"}).status_code == 409
        blocked = client.post("/api/cases/DEMO-1043/analyze").json()
        assert client.post("/api/cases/DEMO-1043/approve", json={"packet_hash": blocked["packet_hash"], "approved_by": "Alex"}).status_code == 409
        response = client.post(url + "/approve", json={"packet_hash": "bad", "approved_by": " "})
        assert response.status_code == 422
        assert isinstance(response.json()["detail"], str)
