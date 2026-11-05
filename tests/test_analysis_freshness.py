import importlib
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings
from backend.demo_drift import inject_late_message


def test_source_change_during_analysis_cannot_restore_old_analysis_or_ready_badge(tmp_path, monkeypatch):
    module = importlib.import_module('backend.app')
    original = module.analyze
    app = create_app(Settings(mode='demo', ai='lexical', db_path=str(tmp_path / 'race.db')))
    with TestClient(app) as client:
        def raced(case, retriever):
            result = original(case, retriever)
            inject_late_message(app.state.store, case['id'])
            return result
        monkeypatch.setattr(module, 'analyze', raced)
        response = client.post('/api/cases/DEMO-1042/analyze')
        assert response.status_code == 409, response.text
        current = client.get('/api/cases/DEMO-1042').json()
        assert current['analysis'] is None
        assert current['risk'] == 'review'
