# ShieldPay build verification

Latest local verification: November 5, 2026, after the second-evaluation implementation. This is execution evidence, not a claim of deployment, merchant validation, or a submitted competition entry. The earlier 101-backend/55-frontend counts are superseded by the local results below.

## Exercised behavior

| Check | Actual result |
|---|---|
| Python tests, including opt-in real ONNX tests | `SHIELDPAY_TEST_ONNX=1 uv run pytest -q --basetemp=<scratch>`: **147 passed**. One existing Starlette/httpx test-client deprecation warning. |
| React rendered-interaction tests | `npm test -- --run`: **73 passed**, eight files. |
| Production React bundle | `npm run build`: passed; nonfatal large-chunk warning remains. |
| Browser, real isolated HTTP backend | `SHIELDPAY_BROWSER_AI=onnx PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: actual local ONNX inference, scoped citation, generated PDF inline preview/download, generated multipart JSON preview, approval/simulated receipt, blocked cases, actual late-message approval invalidation, audit/settings and 390px layout passed. No runtime console errors, failed requests or axe violations in the recorded desktop/mobile report. Default lexical mode remains available for repeatability. |
| Protected import browser workflow | `PLAYWRIGHT_CHANNEL=chrome node scripts/verify_import_browser.mjs`: authentication, confirmed replacement, provenance, form reset, stale-review invalidation, no-JSON raw-paste import, exact original-text and UTF-8 hash readback, blocked unsupported prose, mobile layout and token clearing passed. No page errors or axe violations. Synthetic sandbox-shaped fixture, **not a PayPal case**. |
| Actual PayPal sandbox connection | Entrant-controlled credentials completed OAuth and dispute-list reads. Timestamp milliseconds fixed after reproducing HTTP400 `INVALID_START_TIME_FORMAT`. Corrected request returned HTTP200. **Zero sandbox disputes returned.** |
| Actual sandbox-mode local HTTP instance | Unauthenticated case reads returned401. Authenticated case reads and read-only sync returned200. Status recorded OAuth/read verification. No remote evidence or money writes. |
| GitHub CI | Historical application run: https://github.com/Akakakjss/shieldpay/actions/runs/41873732878 passed the earlier 101/55 suite and both browser workflows. This does not establish CI success for the second-evaluation revision; check the new published revision's run separately. |
| Python dependency audit | `uvx pip-audit --path .venv/Lib/site-packages`: no known vulnerabilities found. Cache-deserialization warnings were emitted; the audit completed successfully. This is not a security guarantee. |
| JavaScript dependency audit | `npm audit --json`: zero reported vulnerabilities. |
| Unicode PDF | Extracted real PDF retained smart punctuation, accented Latin, Greek and Cyrillic plus the source hash. A rendered representative page was inspected without missing-glyph boxes or clipping. |
| PayPal wire format | Mock-HTTP tests parse actual multipart MIME parts and verify structured tracking JSON plus a binary PDF. This is not a remote upload. |
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
- Raw pasted text and its original UTF-8 hash are retained separately from the provenance-prefixed record and its hash. Unstructured prose is retained without fabricated facts but can remain blocked by the deterministic policy.
- Demo-only late-message injection invalidates the actual approved revision, rejects sandbox mode, repeated injection and unresolved submissions, and retries readback only after refresh failure.
- Queue risk is refreshed when sources change and when analysis completes. A source change during model inference prevents stale analysis from overwriting the invalidated state; the race and stale-ready badge were reproduced in regression tests before being fixed.
- Independent review found readiness/approval did not yet enforce the new carrier payload requirement and that tracking could contain controls. A separate fix pass aligned the shared validator with analysis/approval, bumped the policy version and rejected control/nonstandard-separator identifiers. The parent independently reran all 147 backend tests and both real-HTTP browser workflows after the fixes.
- Browser verification caught a select-label mismatch that jsdom did not expose. An explicit label/id association fixed it. Integration also caught an old missing-carrier fixture and an unhandled payload-preview validation error; both were fixed before the passing runs.

## Known limitations

The PDF uses a licensed bundled DejaVu Sans Mono font with glyph and supported-script checks. Tested coverage includes smart punctuation, precomposed accented Latin, Greek and Cyrillic, not arbitrary Unicode. Emoji, uncovered glyphs, combining marks, direction controls and shaping-dependent scripts remain explicitly unsupported. Original evidence must not be rewritten to fit the renderer. The application is a single-user, single-instance prototype, not production financial infrastructure. Authoritative transaction-address alignment and complete Seller Protection eligibility are not determined. AI ranks relevance; policy and explanations are deterministic. The raw-paste builder does not perform automatic fact extraction or cross-buyer association. There is no general uncertain-submission reconciliation UI.

No real sandbox evidence upload, remote attachment acceptance/readback, dispute adjudication, production payment, customer pilot, time-saving measurement or recovery result is claimed. Public hosting and Devpost/YouTube submission are separate release steps.

## Reproduce

Public release: https://github.com/Akakakjss/shieldpay. Verified anonymous metadata/README access and MIT detection, then cloned the public URL and successfully ran `python scripts/run.py --check` with opt-in ONNX tests. Local private configuration was absent from the clone. GitHub CI installation is verified separately from these local results.

```bash
python scripts/run.py --check
# Optional real-model tests (POSIX shell; set the same environment variable in your shell on Windows):
SHIELDPAY_TEST_ONNX=1 uv run pytest -q
cd frontend
npx playwright install chromium
npm run test:browser
# Actual model in the browser-driven workflow:
SHIELDPAY_BROWSER_AI=onnx PLAYWRIGHT_CHANNEL=chrome npm run test:browser
cd ..
node scripts/verify_import_browser.mjs
```

For installed Chrome, set `PLAYWRIGHT_CHANNEL=chrome` for both browser scripts. The tests create isolated synthetic databases and never require PayPal credentials. The private read-only connection check is `uv run python scripts/check_sandbox.py` after local sandbox setup.
