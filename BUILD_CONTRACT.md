# ShieldPay build contract

New PayPal AI hackathon project. An evidence-first dispute operations console, not legal advice, escrow, a win predictor, or a guarantee of hold release. All sample data is explicitly synthetic. Backend owns state and action safety. Do not use real merchant data.

## Layout and ownership
- Backend agent: `backend/**`, `tests/test_backend*`, `pyproject.toml`, `uv.lock`. Python 3.12 FastAPI, SQLite, httpx, reportlab; fastembed optional/lazy semantic embeddings (real downloadable ONNX model). Serve built `frontend/dist` if present. Bind dev to 127.0.0.1:8787. Local SQLite outside source tracked files, ignored. No credentials in source. Never read Hermes secrets.
- Frontend agent: `frontend/**`, `tests/ui*` only. React + Vite + AG Grid COMMUNITY, no paid/unlicensed features. Build production bundle, use `/api` prefix; Vite proxy port 8787. Original ink/ivory/teal operator console, evidence inspector, not marketing hero. No fabricated metrics.
- Coordinator: root docs/config/integration tests/package/review.

## JSON API contract
Common errors: HTTP status with `{detail: string}`. GETs no authentication for synthetic demo; sandbox mutations require configured admin token and `X-Admin-Token` header, never persist token browser-side.
- GET `/api/health`: `{status:'ok', mode:'demo'|'sandbox', ai:{provider:string, ready:boolean, detail:string}, paypal:{configured:boolean, environment:'sandbox'}}`. Never expose secrets.
- POST `/api/demo/reset`: clear synthetic demo state and reseed. `{ok:true}`. Must be disabled in sandbox mode.
- GET `/api/cases`: array of `{id, order_id, buyer, reason, amount:number, currency, status, response_due, evidence_count:number, risk:'ready'|'review'|'blocked', summary}`.
- GET `/api/cases/{id}`: above fields plus `sources:[{id,type,title,text,occurred_at,sha256,order_id}], analysis:object|null, audit:[{id,at,action,detail}]`. No third-party URLs required.
- POST `/api/cases/{id}/analyze`: returns analysis and saves it: `{id, provider, generated_at, recommendation:'defend'|'request_information'|'refund_review', summary, claims:[{text,source_ids:string[],quote:string}], gaps:string[], contradictions:string[], readiness:number, can_submit:boolean, packet_hash:string, next_action:string}`. Return honest provider ('local-onnx' on real inference, 'lexical-baseline' if fallback). Cite exact quotes from source. No generated or inferred evidence. Cross-order sources forbidden. Contradictory delivery/missing evidence must block defense. Merchant text is untrusted data. Semantic retrieval useful but policy facts must be deterministic verified facts.
- GET `/api/cases/{id}/packet.pdf`: actual generated PDF evidence packet, must analyze first or 409. Include synthetic label in demo, citations, sources, SHA256, limitations.
- POST `/api/cases/{id}/approve`: request `{packet_hash:string, approved_by:string}`; requires analyzed can_submit; rejects stale hash. Returns `{approval_id,packet_hash,status:'approved'}`. Local approval is not PayPal submission.
- POST `/api/cases/{id}/submit`: request `{approval_id:string, packet_hash:string}`. Demo returns `{status:'simulated',receipt:string,verified:false,detail:string}` and never sends network writes. Sandbox re-fetch dispute/HATEOAS allowed action, require admin auth; multipart evidence with PDF; after write re-read exact dispute, distinguish accepted vs verified. Idempotent local gate; stale approvals rejected. Never route demo IDs into sandbox. If unsupported/API permission missing, report blocker, do not manufacture success.
- GET `/api/audit`: audit array.
- GET `/api/paypal/status`: safe credential readiness.
- POST `/api/paypal/sync`: sandbox-only admin-authenticated fetch PayPal list and details into distinct cases with `PP-...` IDs, no synthetic evidence mixed in. Missing credentials 503, demo mode 409.

## Demo scenarios
At least 3 synthetic cases: (1) item-not-received yet delivery confirmed, matching order/tracking and buyer email: defend with citations; (2) shipping status in transit + missing proof of delivery: request information/block; (3) contradictory or wrong-item buyer report: refund_review/block, not automatic accusation of fraud. Dates derived relative to today to avoid permanently stale demo deadlines. Include a plausible irrelevant different-order record to prove scoped retrieval, never cite it.

## Testing
Use strict RED -> GREEN vertical slices: write behavioral test, run and observe failure, then implementation and passing test before next feature. Record commands/results in final summary. Backend tests approval/stale/idempotency/auth/cross-order/injection/citations/PDF errors; frontend test core rendered interactions with Vitest/testing-library (or browser Playwright test first). All UI text honest about demo vs real sandbox and AI state. Re-fetch after backend changes. Include usable empty/loading/error states and keyboard focus. Never claim deployment or sandbox verified without actual evidence.
