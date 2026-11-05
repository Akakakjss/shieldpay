import json
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings


def test_payload_preview_uses_same_json_builder_and_never_calls_paypal(tmp_path):
    app = create_app(Settings(mode='demo', ai='lexical', db_path=str(tmp_path / 'preview.db')))
    with TestClient(app) as client:
        def forbidden(*args, **kwargs):
            raise AssertionError('Payload preview must never call PayPal')
        app.state.paypal._request = forbidden
        analysis = client.post('/api/cases/DEMO-1042/analyze').json()
        response = client.get('/api/cases/DEMO-1042/payload-preview')
        assert response.status_code == 200, response.text
        preview = response.json()
        assert preview['preview_only'] is True
        assert preview['environment'] == 'sandbox'
        assert preview['packet_hash'] == analysis['packet_hash']
        assert preview['file'] == {'name':'shieldpay-evidence.pdf', 'media_type':'application/pdf'}
        evidence = preview['input']['evidences'][0]
        assert evidence['evidence_type'] == 'PROOF_OF_FULFILLMENT'
        assert evidence['evidence_info']['tracking_info'][0]['tracking_number'] == 'SYNTH-TRACK-1042'
        assert evidence['evidence_info']['tracking_info'][0]['carrier_name'] == 'UPS'
        assert evidence['documents'] == [{'name':'shieldpay-evidence.pdf'}]
        assert evidence['notes'] == 'ShieldPay packet ' + analysis['packet_hash']
        assert 'synthetic' in preview['detail'].lower()
        assert all(a['action'] not in {'approved','submission_started'} for a in client.get('/api/cases/DEMO-1042').json()['audit'])


def test_missing_carrier_is_an_actionable_preview_conflict_not_server_error(tmp_path):
    import hashlib
    app = create_app(Settings(mode='demo', ai='lexical', db_path=str(tmp_path / 'carrier.db')))
    with TestClient(app) as client:
        with app.state.store.connect() as db:
            source = json.loads(db.execute("SELECT data FROM sources WHERE id='1042-carrier'").fetchone()[0])
            source['text'] = source['text'].replace('Carrier: UPS\n', '')
            source['sha256'] = hashlib.sha256(source['text'].encode('utf-8')).hexdigest()
            db.execute('UPDATE sources SET data=? WHERE id=?', (json.dumps(source), source['id']))
        assert client.post('/api/cases/DEMO-1042/analyze').status_code == 200
        response = client.get('/api/cases/DEMO-1042/payload-preview')
        assert response.status_code == 409, response.text
        assert 'Carrier' in response.json()['detail']
