# Frontend test evidence

## Second evaluation pass

New targeted tests cover inline PDF Blob preview and cleanup, server-generated multipart JSON preview without an approval/write, and the demo-only late-message scenario. The scenario requires confirmation, clears the old packet on acceptance and locks other review actions after a failed refresh until readback succeeds. Raw-paste draft tests are separate from these parent-owned tests.

`verify-browser.mjs` now supports `SHIELDPAY_BROWSER_AI=onnx` to require real neural inference in the browser-driven workflow; the default remains an explicit lexical baseline for repeatability. Neither mode is a generative LLM. Both exercise real local HTTP endpoints, PDF generation, payload preview and an actual synthetic approval invalidation. See the current [build verification](../docs/BUILD_VERIFICATION.md) for executed results; support in the script alone is not proof a run passed.

```text
SHIELDPAY_BROWSER_AI=onnx PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

The historical counts below describe earlier implementation passes, not the current suite total.

## Feature-by-feature RED → GREEN

Tests were written and executed before the corresponding interaction implementation. Each feature below had its listed observable failure, followed by a passing targeted or complete Vitest run before the next feature was added. Tests import the real AG Grid component; the grid is not mocked.

| Behavioral slice                                   | Observed RED failure                                          | Subsequent GREEN                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Load queue, derive exposure, inspect selected case | Missing `Dispute queue` heading in empty scaffold             | API queue/grid, selected detail, exposure and provider rendered                           |
| Analyze and inspect citation                       | Analysis summary never appeared after clicking analyze        | POST analyze, detail/queue/health readback, source quotation and SHA visible              |
| PDF → approval → confirmed simulation              | Missing `Approve packet` button                               | Actual packet endpoint, reviewer/checkbox gates, exact hash payload and simulated receipt |
| Missing/contradictory evidence case                | Missing `Submission blocked` heading                          | Gaps, contradictions and next action visible; approval/submission disabled                |
| Credential/provider settings                       | Safe credential readiness text absent                         | GET status, honest credential and non-generative-provider labels                          |
| Reset                                              | Reset dialog absent after reset button                        | Confirmation before POST, fresh queue/detail and reset analysis state                     |
| Global audit                                       | Backend audit event absent                                    | GET audit renders event IDs, details and refresh                                          |
| Authenticated sandbox sync                         | Sync remained disabled after entering test-only session token | Auth header, readback and memory-only token behavior                                      |
| Sandbox case mutation auth                         | Expected test admin header, received `undefined`              | Same-origin POST header without leaking token on GETs                                     |
| Case audit keyboard navigation                     | `Case audit (1)` tab absent                                   | Arrow-key focus/selection and case-scoped events                                          |
| Modal isolation                                    | Background action still exposed to accessibility tree         | Portal, inert/ARIA-hidden background, focus trap, Escape and cleanup                      |
| Approval continuity while inspecting sources       | Simulate button unexpectedly disabled after changing tabs     | Local approval preserved across inspector tabs                                            |
| Accessible AG Grid selection                       | Visually selected row had `aria-selected=false`               | Native grid selection synchronized with inspected case                                    |
| Readback failure honesty                           | Sync success notice shown despite failed GET cases            | Readback error propagated; no success notice                                              |

Typical targeted command:

```text
npm test -- -t "requires a generated"
npm test
```

The initial 1-second Testing Library timeout was inadequate for the **real**, unmocked grid in jsdom. The setup now permits 10-second asynchronous queries and 30-second per-test execution. The analyze test was re-run until its RED failure was the missing analysis behavior, not a premature queue timeout.

## Regression coverage

The complete suite additionally tests PDF failure, stale-hash rejection, uncertain submission, sandbox acceptance versus verification, same-hash re-analysis invalidation, Blob cleanup, gaps/contradictions that override an inconsistent `can_submit=true`, cross-order citations and invented quotations. These are regression tests over the implemented safety gates, not claimed as new feature RED/GREEN cycles.

`npm test` currently contains **53 passing tests across 5 files** (completion-pass execution; the original baseline was 22 across 3):

- `src/test/App.test.jsx`: real grid and full rendered operator interactions.
- `src/test/PacketActions.test.jsx`: safety gates, failures and readback distinctions.
- `src/test/ConfirmDialog.test.jsx`: modal accessibility/focus behavior.
- `src/test/EvidenceImport.test.jsx`: rendered case-review import, exact schema/text examples, client validation, reviewer/provenance gates, confirmation/cancellation, exact POST, state reset, stale analysis/PDF/approval invalidation, rejected writes, failed readback recovery, and non-sandbox absence.
- `src/test/BrowserRuntime.test.js`: executes the verifier's actual startup and launch configuration in isolation to check POSIX/Windows configuration, scratch/Python overrides, default Playwright Chromium and installed-browser overrides. This is configuration coverage, not a claim of a Linux browser run.

Fetch is replaced only at the HTTP boundary in App Vitest tests; focused CaseReview tests pass a stubbed API boundary and refresh callback. Fixtures are confined to tests. Production source never manufactures operative analysis, approvals, receipts, sources or API data; the importer displays explicitly labeled synthetic format examples without auto-filling or submitting them.

## Sandbox importer completion pass — observed results

The implementation proceeded in vertical RED → GREEN slices, running the new behavioral test before implementing each slice:

| Slice                                           | Observed RED                                                  | Subsequent GREEN                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema and parser guidance                      | `Import sandbox evidence` absent                              | Empty opt-in form, three exact-schema examples, provenance/no-personal-data guidance                                                           |
| Source validation and reviewer/provenance gates | No validation alert; valid form never enabled                 | Field-indexed errors, bounded UTF-8 text, exact current-order fields, timezone/nonfuture/calendar checks, explicit reviewer and acknowledgment |
| Confirmed replacement                           | Confirmation dialog absent                                    | Cancel sends nothing; confirmation sends exact sources/reviewed_by/acknowledged_unverified POST and refreshes selected case                    |
| Successful replacement cleanup                  | Success status absent, old packet remained                    | Draft/reviewer/ack reset; stale analysis suppressed; PDF URL revoked and approval discarded                                                    |
| Rejected import                                 | No error UI and an unhandled rejected promise                 | Accessible error, no success claim, draft retained                                                                                             |
| Failed readback                                 | Generic error instead of accepted-but-unrefreshed distinction | No success claim; retry performs GET refresh only, never a duplicate POST                                                                      |
| Readback isolation                              | Review tab was still enabled after readback failure           | Tabs/actions and draft locked until refresh succeeds                                                                                           |
| HTTP validation errors                          | Rendered `[object Object]`                                    | Field path and message rendered, raw rejected input omitted; existing in-memory admin header reused                                            |
| Session-token guidance                          | Settings guidance absent                                      | Explicit token location and memory-only boundary shown                                                                                         |
| Portable verifier startup                       | Required Hermes TMPDIR; hardcoded Chrome channel              | OS scratch fallback, platform-specific venv path and configurable browser                                                                      |

Commands actually executed from `frontend/`:

```text
npm test                                      # initial baseline: 22 passed / 3 files
npm test -- src/test/EvidenceImport.test.jsx    # repeated RED/GREEN, final 27 import tests
npm test -- src/test/App.test.jsx -t "uses session authentication for import"
npm test -- src/test/BrowserRuntime.test.js     # 3 passed
npm exec prettier -- --write src scripts       # ownership-scoped formatting
npm test                                      # final: 53 passed / 5 files, 85.11 s
npm run build                                 # success; 1,762 modules, 17.35 s
npm run format:check                           # all matched files use Prettier style
```

The final production JS was 1,358.24 kB (391.55 kB gzip); Vite's existing nonfatal >500 kB chunk warning remains. No dependency or root-configuration changes, credential reads, shared demo resets, real merchant records or external financial writes occurred. All import mutations in this pass were isolated test-boundary calls, not calls against the shared app.

**Limits:** frontend checks deliberately reject cross-order `order_id` or missing/duplicate/mismatched exact `Order: ...` text even though the generic backend import schema accepts records that analysis would later reject. Timestamp input uses the documented `YYYY-MM-DDTHH:mm:ss[.fraction]` plus `Z`/`±HH:mm` subset. Browser clock checks are convenience checks; backend validation remains authoritative. No authenticity or successful PayPal submission is implied. The earlier browser evidence below predates this completion pass; a new actual-HTTP importer/mobile/axe verification is assigned to the coordinator, not claimed here.

Verifier defaults now work outside Hermes: `.venv/Scripts/python.exe` on Windows, `.venv/bin/python` elsewhere; `SHIELDPAY_TEST_PYTHON` overrides either. `TMPDIR` is honored when provided, otherwise `os.tmpdir()` is used. Default browser is Playwright-managed Chromium (`npx playwright install chromium`); set `PLAYWRIGHT_CHANNEL=chrome` for installed Chrome or `PLAYWRIGHT_EXECUTABLE_PATH` for an explicit installed Chromium binary. An executable override takes precedence over a channel.

## Real-browser / real-backend verification

```text
npm run test:browser
```

`verify-browser.mjs` uses the real backend with an isolated synthetic database, not mocked network responses. It verifies the ready case, scoped citations (unrelated order excluded), real downloaded `%PDF-` bytes, explicit approval, Escape cancellation, confirmed simulation, blocked missing-delivery case, wrong-item refund review, audit readback, settings and a 390-pixel mobile layout. It writes a JSON report and screenshot/PDF artifacts. All temporary processes/listeners are cleaned up.

An initial real-browser run caught a missing favicon, low-contrast secondary labels, accessible-name order mismatch and a missing environment landmark. Those bugs were fixed after the observed failing browser result. The subsequent browser run reported **no runtime console errors, no request failures, no axe violations in either the desktop queue or analyzed mobile view**, and no page-level horizontal overflow at 390 px. Screenshots were inspected at desktop size and at a cropped full-resolution mobile viewport.

## Dependency and build checks

- `npm install`: completed using native Windows npm.
- Initial audit identified Vite/Vitest/esbuild advisories. Updated to Vite 7.3.7, Vitest 4.1.12 and esbuild 0.28.1; subsequent `npm audit` reported zero vulnerabilities.
- `npm run build`: real production assets emitted under `dist/`; nonfatal advisory about the Community grid's large bundled JavaScript chunk remains documented in README.
- No paid AG Grid dependency or AG Studio claim.
- No sandbox credentialed submission or deployment is implied by local/browser test success.
