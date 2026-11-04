"""Submission/import serialization; callbacks never contact PayPal."""
import json
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.actions import approve, submit
from backend.analysis import snapshot
from backend.app import create_app
from backend.config import Settings
from backend.importing import ImportInput, import_sources

CASE = "DEMO-1042"


def setup_case(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "state.db"), ai="lexical"))
    client = TestClient(app)
    client.__enter__()
    analysis = client.post(f"/api/cases/{CASE}/analyze").json()
    approval = client.post(f"/api/cases/{CASE}/approve", json={"packet_hash": analysis["packet_hash"], "approved_by": "Alex"}).json()
    with app.state.store.connect() as db:
        db.execute("UPDATE cases SET mode='sandbox' WHERE id=?", (CASE,))
    return app, client, analysis, approval


def import_payload():
    return ImportInput.model_validate({"reviewed_by": "Reviewer", "acknowledged_unverified": True, "sources": [{"type": "order", "title": "replacement", "text": "Order: TEST", "occurred_at": "2025-01-01T00:00:00Z", "order_id": "TEST"}]})


def test_submission_claim_prevents_concurrent_source_replacement(tmp_path):
    app, client, analysis, approval = setup_case(tmp_path)
    entered = Barrier(2, timeout=5)
    release = Barrier(2, timeout=5)
    calls = []

    def callback(case, approval_id):
        calls.append(approval_id)
        entered.wait()
        release.wait()
        return {"status": "uncertain", "receipt": "test", "verified": False}

    try:
        before = app.state.store.get_case(CASE, "sandbox")["sources"]
        with ThreadPoolExecutor(max_workers=2) as pool:
            pending = pool.submit(submit, app.state.store, "sandbox", CASE, approval["approval_id"], analysis["packet_hash"], callback)
            entered.wait()
            try:
                with pytest.raises(HTTPException) as exc:
                    pool.submit(import_sources, app.state.store, CASE, import_payload()).result(timeout=5)
                assert exc.value.status_code == 409
            finally:
                release.wait()
            assert pending.result(timeout=5)["status"] == "uncertain"
        assert app.state.store.get_case(CASE, "sandbox")["sources"] == before
        assert calls == [approval["approval_id"]]
    finally:
        client.__exit__(None, None, None)


@pytest.mark.parametrize("status", ["uncertain", "accepted"])
def test_unresolved_outcome_blocks_new_packet_and_preserves_receipt(tmp_path, status):
    app, client, analysis, approval = setup_case(tmp_path)
    store = app.state.store
    calls = []
    def callback(case, approval_id):
        calls.append(approval_id)
        return {"status": status, "receipt": "original", "verified": False}

    try:
        original = submit(store, "sandbox", CASE, approval["approval_id"], analysis["packet_hash"], callback)
        assert submit(store, "sandbox", CASE, approval["approval_id"], analysis["packet_hash"], callback) == original
        with pytest.raises(HTTPException) as exc:
            import_sources(store, CASE, import_payload())
        assert exc.value.status_code == 409
        # Simulate a stale historical replacement or another source mutation path.
        with store.connect() as db:
            source_row = db.execute("SELECT id,data FROM sources WHERE case_id=? LIMIT 1", (CASE,)).fetchone()
            source = json.loads(source_row["data"])
            source["id"] = "new-source-uuid"
            db.execute("UPDATE sources SET id=?,data=? WHERE id=?", (source["id"], json.dumps(source), source_row["id"]))
            case = store._case(db.execute("SELECT * FROM cases WHERE id=?", (CASE,)).fetchone(), db)
            revised = case["analysis"]
            revised["source_snapshot"] = snapshot(case)
            revised["packet_hash"] = "new-packet-hash"
            db.execute("UPDATE cases SET analysis=? WHERE id=?", (json.dumps(revised), CASE))
        second = approve(store, "sandbox", CASE, "new-packet-hash", "Different reviewer")
        with pytest.raises(HTTPException) as exc:
            submit(store, "sandbox", CASE, second["approval_id"], "new-packet-hash", callback)
        assert exc.value.status_code == 409
        assert calls == [approval["approval_id"]]
    finally:
        client.__exit__(None, None, None)


def test_import_transaction_first_makes_waiting_submission_stale(tmp_path, monkeypatch):
    app, client, analysis, approval = setup_case(tmp_path)
    store = app.state.store
    imported = Barrier(2, timeout=5)
    release = Barrier(2, timeout=5)
    starting_submit = Barrier(2, timeout=5)
    real_record = store.record
    calls = []

    def record(case_id, action, detail, db=None):
        result = real_record(case_id, action, detail, db)
        if action == "sources_imported":
            imported.wait()
            release.wait()
        return result

    def submit_after_import_started():
        starting_submit.wait()
        return submit(store, "sandbox", CASE, approval["approval_id"], analysis["packet_hash"],
                      lambda *args: calls.append(args))

    monkeypatch.setattr(store, "record", record)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            importing = pool.submit(import_sources, store, CASE, import_payload())
            imported.wait()
            submitting = pool.submit(submit_after_import_started)
            starting_submit.wait()
            release.wait()
            assert importing.result(timeout=5)["imported"] == 1
            with pytest.raises(HTTPException) as exc:
                submitting.result(timeout=5)
            assert exc.value.status_code == 409
        assert calls == []
        assert store.get_case(CASE, "sandbox")["analysis"] is None
    finally:
        client.__exit__(None, None, None)
