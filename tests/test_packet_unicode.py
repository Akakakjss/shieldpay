from io import BytesIO
import hashlib

import pytest
from fastapi import HTTPException

from backend.packet import assert_packet_text_supported, build_pdf


def make_case(text):
    digest = hashlib.sha256(text.encode('utf-8')).hexdigest()
    return {
        'id': 'case', 'order_id': 'order', 'reason': 'reason',
        'analysis': {'provider': 'local', 'packet_hash': 'abc', 'recommendation': 'review',
                     'summary': 'summary', 'claims': [], 'gaps': [], 'contradictions': [], 'limitations': []},
        'sources': [{'id': 'source', 'order_id': 'order', 'title': 'title',
                     'occurred_at': '2026-01-01', 'sha256': digest, 'text': text}],
    }


def test_pdf_extracts_supported_unicode_source_verbatim():
    PdfReader = pytest.importorskip('pypdf').PdfReader
    text = 'Café — “quoted” Ελληνικά Кириллица'
    digest = hashlib.sha256(text.encode('utf-8')).hexdigest()
    case = make_case(text)
    pdf = build_pdf(case, 'demo')
    extracted = '\n'.join(page.extract_text() for page in PdfReader(BytesIO(pdf)).pages)
    assert text in extracted
    assert digest in extracted
    assert case['sources'][0]['text'] == text
    assert case['sources'][0]['sha256'] == digest


@pytest.mark.parametrize('char', ['\u0370', '\u0301', '商', '📦', 'م', '\u202e'])
def test_uncovered_or_shaping_dependent_characters_block_approval_and_pdf(char):
    case = make_case('evidence ' + char)
    for action in (assert_packet_text_supported, lambda value: build_pdf(value, 'demo')):
        with pytest.raises(HTTPException) as exc:
            action(case)
        assert exc.value.status_code == 422
        assert f'U+{ord(char):04X}' in exc.value.detail


def test_unicode_source_approval_and_packet_endpoint(tmp_path):
    import json
    from fastapi.testclient import TestClient
    from backend.app import create_app
    from backend.config import Settings

    PdfReader = pytest.importorskip('pypdf').PdfReader
    app = create_app(Settings(ai='lexical', db_path=str(tmp_path / 'unicode.db')))
    snippet = 'Café — “quoted” Ελληνικά Кириллица'
    with TestClient(app) as client:
        with app.state.store.connect() as db:
            source = json.loads(db.execute("SELECT data FROM sources WHERE id='1042-order'").fetchone()[0])
            source['text'] += '\n' + snippet
            source['sha256'] = hashlib.sha256(source['text'].encode('utf-8')).hexdigest()
            db.execute('UPDATE sources SET data=? WHERE id=?', (json.dumps(source), source['id']))
        analysis = client.post('/api/cases/DEMO-1042/analyze').json()
        assert analysis['can_submit'] is True
        response = client.post('/api/cases/DEMO-1042/approve', json={
            'packet_hash': analysis['packet_hash'], 'approved_by': 'Test reviewer'})
        assert response.status_code == 200, response.text
        response = client.get('/api/cases/DEMO-1042/packet.pdf')
        assert response.status_code == 200
        extracted = '\n'.join(p.extract_text() for p in PdfReader(BytesIO(response.content)).pages)
        assert snippet in extracted
        assert source['sha256'] in extracted
