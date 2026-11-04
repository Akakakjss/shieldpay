# ShieldPay build verification

Verified locally on November 4, 2026. This is execution evidence, not a claim of deployment, merchant validation, or a submitted competition entry.

## Exercised behavior

| Check | Actual result |
|---|---|
| Python tests, including opt-in real ONNX tests | `SHIELDPAY_TEST_ONNX=1 uv run pytest -q`: **101 passed**. One Starlette/httpx test-client deprecation warning. |
| React rendered-interaction tests | `npm test -- --run`: **55 passed**, five files. |
| Production React bundle | `npm run build`: passed; nonfatal large-chunk warning remains. |
| Browser, real isolated HTTP backend | `npm run test:browser`: positive workflow, actual PDF download, explicit approval, simulated receipt, blocked/contradictory cases, audit, settings and 390px layout passed. No page errors, failed requests or axe violations in the recorded report. Browser uses lexical mode for repeatability; real AI is tested separately. |
| Protected import browser workflow | `node scripts/verify_import_browser.mjs`: authentication, actual replacement, provenance, clearing form state, invalidation of analysis/PDF/approval, blocked missing-proof case and clearing sensitive records on lock passed. No page errors or axe violations. Synthetic sandbox-shaped fixture, **not a PayPal case**. |
| Actual PayPal sandbox connection | Entrant-controlled credentials completed OAuth and dispute-list reads. Timestamp milliseconds fixed after reproducing HTTP400 `INVALID_START_TIME_FORMAT`. Corrected request returned HTTP200. **Zero sandbox disputes returned.** |
| Actual sandbox-mode local HTTP instance | Unauthenticated case reads returned401. Authenticated case reads and read-only sync returned200. Status recorded OAuth/read verification. No remote evidence or money writes. |
| Python dependency audit | `pip-audit --path .venv/Lib/site-packages`: no known vulnerabilities after compatible FastAPI/Starlette/AnyIO upgrades. This is not a security guarantee. |
| Staged-source secret scan | `detect-secrets scan --no-verify`: no findings. Private `.env`, runtime databases, caches and artifacts excluded from public source. |

## Safety regressions covered

- Malformed Host headers and ASGI deployment prefixes cannot bypass authentication; authorization uses the same trusted route-path normalization as the router.
- Token clearing invalidates pending protected responses so a delayed load cannot restore sensitive records.
- Sandbox case records, source evidence, audit events and PDFs require a memory-only admin token.
- Duplicate structured fields are parsing errors, never a matching sentinel value.
- Multi-transaction disputes are explicitly unsupported and rejected, including remote preflight.
- In-flight, uncertain or accepted-but-unverified submissions block evidence replacement and new-packet dispatch at case level.
- Both submit-before-import and import-before-submit orderings are tested with threaded synchronization.
- Unsupported PDF characters fail with422 instead of silent missing glyphs. Approval also checks the packet's supported repertoire.
- Exact citations, order isolation, source changes, expired deadlines, stale approvals and duplicate submission gates have tests.

## Known limitations

The PDF supports a deliberately limited Latin repertoire, not arbitrary Unicode; CJK/emoji evidence is retained but cannot be rendered/approved through this packet format. Original evidence must not be rewritten to fit the parser. The application is a single-user, single-instance prototype, not production financial infrastructure. Address alignment and complete Seller Protection eligibility are not determined. AI ranks relevance; policy and explanations are deterministic.

No real sandbox evidence upload, remote attachment acceptance/readback, dispute adjudication, production payment, customer pilot, time-saving measurement or recovery result is claimed. Public hosting and Devpost/YouTube submission are separate release steps.

## Reproduce

```bash
python scripts/run.py --check
# Optional real-model tests (POSIX shell; set the same environment variable in your shell on Windows):
SHIELDPAY_TEST_ONNX=1 uv run pytest -q
cd frontend
npx playwright install chromium
npm run test:browser
cd ..
node scripts/verify_import_browser.mjs
```

For installed Chrome, set `PLAYWRIGHT_CHANNEL=chrome` for both browser scripts. The tests create isolated synthetic databases and never require PayPal credentials. The private read-only connection check is `uv run python scripts/check_sandbox.py` after local sandbox setup.
