import hashlib
from backend.importing import ImportInput, import_sources
from backend.store import Store


def test_import_preserves_original_raw_text_and_its_utf8_hash(tmp_path):
    store = Store(tmp_path / 'raw.db')
    store.put_case({'id': 'PP-D-RAW', 'order_id': 'TXN-RAW', 'risk': 'ready'}, mode='sandbox')
    raw = 'Order: TXN-RAW\r\nBuyer statement: It’s a café delivery.\t Original spacing. '
    data = ImportInput(sources=[dict(type='buyer_message', title='Raw pasted text', text=raw,
        occurred_at='2025-01-01T00:00:00Z', order_id='TXN-RAW')],
        reviewed_by='Test reviewer', acknowledged_unverified=True)
    import_sources(store, 'PP-D-RAW', data)
    current = store.get_case('PP-D-RAW', 'sandbox')
    assert current is not None
    source = current['sources'][0]
    assert source['original_text'] == raw
    assert source['original_sha256'] == hashlib.sha256(raw.encode('utf-8')).hexdigest()
    assert source['text'].endswith(raw)
    assert source['sha256'] == hashlib.sha256(source['text'].encode('utf-8')).hexdigest()
    assert source['original_sha256'] != source['sha256']
    assert current['risk'] == 'review'
