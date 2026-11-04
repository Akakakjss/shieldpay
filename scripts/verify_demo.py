"""Exercise an already-running synthetic demo over real HTTP.

Usage: uv run --with pypdf python scripts/verify_demo.py
This resets synthetic data. It refuses to run against sandbox mode.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import urllib.error
import urllib.request
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8787')
    parser.add_argument('--output', default='artifacts/http-verification.json')
    args = parser.parse_args()
    base = args.base_url.rstrip('/')
    evidence = {'at': datetime.now(UTC).isoformat(), 'base_url': base, 'checks': []}

    def call(method, path, body=None, expected=200):
        data = json.dumps(body).encode() if body is not None else (b'' if method == 'POST' else None)
        request = urllib.request.Request(base + path, data=data, method=method, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                status, content, headers = response.status, response.read(), dict(response.headers)
        except urllib.error.HTTPError as error:
            status, content, headers = error.code, error.read(), dict(error.headers)
        assert status == expected, f'{method} {path}: expected {expected}, got {status}: {content[:500]!r}'
        if 'application/pdf' in headers.get('Content-Type', headers.get('content-type', '')):
            return content
        return json.loads(content)

    def passed(name, detail=None):
        evidence['checks'].append({'name': name, 'passed': True, 'detail': detail})
        print('PASS', name, detail if detail is not None else '', flush=True)

    health = call('GET', '/api/health')
    assert health['mode'] == 'demo', 'Refusing to reset or mutate anything except synthetic demo mode.'
    passed('demo isolation', health)
    call('POST', '/api/demo/reset')
    cases = call('GET', '/api/cases')
    assert len(cases) >= 3
    passed('synthetic scenarios available', len(cases))
    analyses = []
    for case in cases:
        case_id = case['id']
        analysis = call('POST', f'/api/cases/{case_id}/analyze')
        detail = call('GET', f'/api/cases/{case_id}')
        sources = {source['id']: source for source in detail['sources'] if source['order_id'] == detail['order_id']}
        assert analysis['provider'] in ('local-onnx', 'lexical-baseline'), analysis['provider']
        assert len(analysis['packet_hash']) == 64
        assert analysis['claims'] or not analysis['can_submit']
        for claim in analysis['claims']:
            assert claim['source_ids'], 'Uncited claim'
            assert claim['quote'], 'Empty evidence quotation'
            for source_id in claim['source_ids']:
                assert source_id in sources, 'Cross-order or missing citation'
                assert claim['quote'] in sources[source_id]['text'], 'Quote not verbatim'
                assert sources[source_id]['sha256'] == hashlib.sha256(sources[source_id]['text'].encode()).hexdigest()
        passed('scoped exact citations and source hashes: ' + case_id, {'provider': analysis['provider'], 'recommendation': analysis['recommendation'], 'can_submit': analysis['can_submit']})
        analyses.append((case_id, analysis))

    ready = [(case_id, a) for case_id, a in analyses if a['can_submit']]
    blocked = [(case_id, a) for case_id, a in analyses if not a['can_submit']]
    assert ready and len(blocked) >= 2, 'Need both defendable and unsupported scenarios'
    case_id, a = ready[0]
    call('POST', f'/api/cases/{case_id}/approve', {'packet_hash': '0' * 64, 'approved_by': 'HTTP verification'}, expected=409)
    passed('stale packet approval rejected')
    call('POST', f'/api/cases/{case_id}/submit', {'approval_id': 'nonexistent', 'packet_hash': a['packet_hash']}, expected=409)
    passed('unapproved submission rejected')
    for blocked_id, blocked_a in blocked:
        call('POST', f'/api/cases/{blocked_id}/approve', {'packet_hash': blocked_a['packet_hash'], 'approved_by': 'HTTP verification'}, expected=409)
    passed('unsupported evidence cannot be approved', len(blocked))
    pdf = call('GET', f'/api/cases/{case_id}/packet.pdf')
    assert pdf.startswith(b'%PDF')
    from pypdf import PdfReader
    reader = PdfReader(BytesIO(pdf))
    text = '\n'.join(page.extract_text() for page in reader.pages)
    assert case_id in text
    assert 'synthetic' in text.lower() or 'demo' in text.lower()
    assert a['packet_hash'] in text.replace('\n', '').replace(' ', '')
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    packet_path = output.parent / 'sample-evidence.pdf'
    packet_path.write_bytes(pdf)
    passed('actual PDF with synthetic label and approved packet hash', {'bytes': len(pdf), 'pages': len(reader.pages), 'sha256': hashlib.sha256(pdf).hexdigest()})
    approval = call('POST', f'/api/cases/{case_id}/approve', {'packet_hash': a['packet_hash'], 'approved_by': 'HTTP verification'})
    payload = {'approval_id': approval['approval_id'], 'packet_hash': a['packet_hash']}
    receipt = call('POST', f'/api/cases/{case_id}/submit', payload)
    assert receipt['status'] == 'simulated' and receipt['verified'] is False
    repeated = call('POST', f'/api/cases/{case_id}/submit', payload)
    assert repeated == receipt, 'Duplicate submission returned a different receipt'
    passed('explicit approval and idempotent simulated submission', receipt)
    audit = call('GET', '/api/audit')
    assert audit
    passed('audit retained', len(audit))
    # Leave a clean queue for the next human or browser walkthrough.
    call('POST', '/api/demo/reset')
    evidence['passed'] = True
    evidence['total_checks'] = len(evidence['checks'])
    output.write_text(json.dumps(evidence, indent=2), encoding='utf-8')
    print(f'Verified {len(evidence["checks"])} HTTP checks. Evidence: {output.resolve()}')


if __name__ == '__main__':
    main()
