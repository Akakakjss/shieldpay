"""Explicit synthetic scenario changes; never a sandbox or network adapter."""
import hashlib
import json
from fastapi import HTTPException
from backend.actions import locked_case, unresolved_submission
from backend.store import now


def inject_late_message(store, case_id):
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        current = locked_case(store, db, case_id, 'demo')
        if not case_id.startswith('DEMO-'):
            raise HTTPException(409, 'Drift scenarios require a synthetic DEMO- case')
        if unresolved_submission(db, case_id):
            raise HTTPException(409, 'Submission is in progress or unresolved; scenario was not applied')
        if any(s.get('demo_event') == 'late_buyer_message' for s in current['sources']):
            raise HTTPException(409, 'This late-message scenario is already applied. Reset the synthetic demo to repeat it.')
        previous = current['analysis']['packet_hash'] if current['analysis'] else None
        text = ('Order: ' + current['order_id'] + '\nIssue: NOT_RECEIVED\n'
                'Buyer statement: My earlier receipt message was mistaken. I did not receive the parcel.')
        source = dict(id='DRIFT-' + case_id, type='buyer_message', title='Synthetic late buyer message',
                      text=text, occurred_at=now(), order_id=current['order_id'],
                      sha256=hashlib.sha256(text.encode('utf-8')).hexdigest(),
                      demo_event='late_buyer_message')
        db.execute('INSERT INTO sources VALUES(?,?,?)', (source['id'], case_id, json.dumps(source)))
        count = db.execute("UPDATE approvals SET status='invalidated' WHERE case_id=? AND status='approved'", (case_id,)).rowcount
        data = json.loads(db.execute('SELECT data FROM cases WHERE id=?', (case_id,)).fetchone()[0])
        data['risk'] = 'review'
        db.execute('UPDATE cases SET analysis=NULL,data=? WHERE id=?', (json.dumps(data), case_id))
        store.record(case_id, 'demo_late_message',
                     f'SYNTHETIC late message added; analysis and {count} approval(s) invalidated. '
                     f'Previous packet={previous or "none"}. No PayPal request sent.', db)
    return dict(case_id=case_id, simulated=True, network_writes_sent=0,
                invalidated_approvals=count, previous_packet_hash=previous, source_id=source['id'],
                source_sha256=source['sha256'],
                detail='Synthetic buyer message added. Previous analysis, PDF and approval are invalid. Analyze again to inspect the contradiction. No PayPal request was sent.')
