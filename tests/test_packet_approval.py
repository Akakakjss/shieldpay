import hashlib
import json
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings


def test_unsupported_pdf_text_cannot_be_approved_without_a_renderable_packet(tmp_path):
    app = create_app(Settings(ai="lexical", db_path=str(tmp_path / "demo.db")))
    with TestClient(app) as client:
        with app.state.store.connect() as db:
            source = json.loads(db.execute("SELECT data FROM sources WHERE id='1042-order'").fetchone()[0])
            source["text"] += "\nOriginal note: 商品未收到"
            source["sha256"] = hashlib.sha256(source["text"].encode()).hexdigest()
            db.execute("UPDATE sources SET data=? WHERE id=?", (json.dumps(source), source["id"]))
        result = client.post("/api/cases/DEMO-1042/analyze").json()
        assert result["can_submit"] is True
        assert client.get("/api/cases/DEMO-1042/packet.pdf").status_code == 422
        response = client.post("/api/cases/DEMO-1042/approve", json={"packet_hash": result["packet_hash"], "approved_by": "Test reviewer"})
        assert response.status_code == 422
        assert "cannot safely render" in response.json()["detail"]
        with app.state.store.connect() as db:
            assert db.execute("SELECT count(*) FROM approvals").fetchone()[0] == 0
