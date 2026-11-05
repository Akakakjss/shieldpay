import pytest
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings

URL = '/api/demo/cases/DEMO-1042/late-message'


def test_late_message_invalidates_an_actual_approved_packet(tmp_path):
    app = create_app(Settings(mode='demo', ai='lexical', db_path=str(tmp_path / 'drift.db')))
    with TestClient(app) as client:
        analysis = client.post('/api/cases/DEMO-1042/analyze').json()
        approval = client.post('/api/cases/DEMO-1042/approve', json={
            'packet_hash': analysis['packet_hash'], 'approved_by': 'Demo reviewer'}).json()
        assert approval['status'] == 'approved'
        response = client.post(URL)
        assert response.status_code == 200, response.text
        result = response.json()
        assert result['simulated'] is True
        assert result['network_writes_sent'] == 0
        assert result['invalidated_approvals'] == 1
        assert result['previous_packet_hash'] == analysis['packet_hash']
        current = client.get('/api/cases/DEMO-1042').json()
        assert current['analysis'] is None
        assert current['risk'] == 'review'
        assert any(s['id'] == result['source_id'] and 'Issue: NOT_RECEIVED' in s['text'] for s in current['sources'])
        assert client.get('/api/cases/DEMO-1042/packet.pdf').status_code == 409
        assert client.post('/api/cases/DEMO-1042/submit', json={
            'packet_hash': analysis['packet_hash'], 'approval_id': approval['approval_id']}).status_code == 409
        refreshed = client.post('/api/cases/DEMO-1042/analyze').json()
        assert refreshed['can_submit'] is False
        assert refreshed['recommendation'] == 'refund_review'
        assert refreshed['packet_hash'] != analysis['packet_hash']
        assert client.get('/api/cases/DEMO-1042').json()['risk'] == 'blocked'
        assert any(a['action'] == 'demo_late_message' for a in client.get('/api/cases/DEMO-1042').json()['audit'])
        with app.state.store.connect() as db:
            assert db.execute('SELECT status FROM approvals WHERE id=?', (approval['approval_id'],)).fetchone()[0] == 'invalidated'


def test_sandbox_rejects_drift_even_with_valid_admin_token(tmp_path):
    app = create_app(Settings(mode='sandbox', ai='lexical', admin_token='test-only-admin', db_path=str(tmp_path / 'sandbox.db')))
    with TestClient(app) as client:
        assert client.post(URL).status_code == 401
        response = client.post(URL, headers={'X-Admin-Token': 'test-only-admin'})
        assert response.status_code == 409
        assert app.state.store.list_cases('sandbox') == []


def test_repeat_drift_and_unresolved_submission_cannot_add_more_records(tmp_path):
    app = create_app(Settings(mode='demo', ai='lexical', db_path=str(tmp_path / 'repeat.db')))
    with TestClient(app) as client:
        analysis = client.post('/api/cases/DEMO-1042/analyze').json()
        approval = client.post('/api/cases/DEMO-1042/approve', json={
            'packet_hash': analysis['packet_hash'], 'approved_by': 'Demo reviewer'}).json()
        with app.state.store.connect() as db:
            db.execute("UPDATE approvals SET status='submitting' WHERE id=?", (approval['approval_id'],))
        original = client.get('/api/cases/DEMO-1042').json()
        assert client.post(URL).status_code == 409
        assert client.get('/api/cases/DEMO-1042').json() == original
        with app.state.store.connect() as db:
            db.execute("UPDATE approvals SET status='approved' WHERE id=?", (approval['approval_id'],))
        assert client.post(URL).status_code == 200
        after = client.get('/api/cases/DEMO-1042').json()
        assert client.post(URL).status_code == 409
        assert client.get('/api/cases/DEMO-1042').json() == after
        assert client.post('/api/demo/cases/PP-D-NOT-DEMO/late-message').status_code == 404
