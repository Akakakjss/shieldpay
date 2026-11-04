# ShieldPay operator console

React + Vite with **real AG Grid Community 35.3**. No Enterprise modules, paid features, license key, or AG Studio integration. Custom cell renderers, a themed Community grid, scoped evidence inspection, and the approval workflow are implemented in this frontend.

## Commands

Run from `frontend/` after the coordinator has installed the Python backend:

```text
npm install
npm test
npm run build
npm run test:browser
npm run format:check
```

`npm run test:browser` builds production assets, temporarily starts the **real Python backend** on an available loopback port with an isolated scratch SQLite database and explicit demo/lexical mode, serves the built UI, exercises it in headless Chrome, downloads the actual PDF, captures screenshots, and runs axe. It closes both temporary listeners and the backend process afterward. It requires `TMPDIR`, the repo's `.venv/Scripts/python.exe` (override with `SHIELDPAY_TEST_PYTHON`), and an installed Chrome browser. It does not contact PayPal or alter the normal workspace database.

For normal runtime, the coordinator starts the backend on `127.0.0.1:8787`. `npm run dev` uses port `5173` and proxies `/api` to that backend. `npm run preview` is an asset-only preview on `4173`; use the backend's built-asset serving or Vite dev proxy for API requests. No normal runtime is left running by verification.

On this Windows/MSYS host, use the native npm executable through Python when the Bash shim reports `stdin is not a tty`:

```python
subprocess.run(
    ['C:/Program Files/nodejs/npm.cmd', 'test'],
    cwd='C:/Users/tesse/Projects/shieldpay/frontend',
    shell=True, capture_output=True, text=True,
)
```

## Behavior and safety

- `/api/health`, `/api/cases`, and case detail responses are the source of displayed state. Exposure is summed per API currency; it is not recovered funds. No hard-coded results or frontend demo fallback exist.
- Analysis is a real POST followed by detail, queue and health readback. Findings show exact quotations with source IDs; the evidence tab shows original scoped text, order IDs and SHA-256 values. Cross-order records are excluded.
- Missing evidence, contradictions, a non-defense recommendation, unverifiable quotations, or `can_submit=false` block approval/submission. The backend remains authoritative and rechecks policy independently.
- The PDF is fetched from the backend as a Blob and offered as an actual downloadable PDF. Approval additionally requires a nonempty reviewer and an explicit review checkbox bound to the exact packet hash.
- Local approval is visibly distinct from PayPal submission. Submission requires another confirmation. Demo records a simulated receipt only. Accepted/unverified sandbox responses are never presented as verified success.
- Re-analysis or refresh invalidates local downloaded-packet/approval state. Switching inspector tabs preserves the current local approval. Blob URLs are revoked when no longer used. Session approval recovery after a page reload is intentionally not implemented; the operator must review again.
- Sandbox admin tokens exist only in React memory and are sent to same-origin POST endpoints via `X-Admin-Token`. PayPal credentials stay server-side. Demo reset is confirmed and disabled in sandbox. Sync is disabled until the safe status endpoint reports configured credentials/admin auth and a session token is present.
- Mutations do not show success before required backend readback. Failed readback, stale hashes, PDF errors and uncertain submission outcomes have explicit non-success states.
- Provider labels distinguish `local-onnx` retrieval from `lexical-baseline`. Neither is presented as a generative LLM. No fake streaming or confidence/win-rate claims.

## Interaction and visual checks

The primary surface is **Operate**: a narrow ink navigation rail, an ivory queue, teal action controls and an adjacent inspector. DM Sans and IBM Plex Mono are bundled locally; Google Fonts is not contacted. Grid keyboard behavior, button activation, arrow/Home/End tab navigation, a skip link, focus outlines, modal focus trapping/background isolation and Escape cancellation are supported. The layout stacks at narrow widths; the grid retains its own horizontal scrolling instead of overflowing the page.

See `TESTING.md` for RED/GREEN evidence and coverage. Browser output is under ignored `test-artifacts/`:

- `browser-report.json`
- `operator-desktop.png`, `operator-mobile.png`
- `operator-simulated.png`, `operator-blocked.png`
- `operator-audit.png`, `operator-settings.png`
- `synthetic-evidence.pdf`

## Limits

No external deployment, live PayPal support, or credentialed PayPal sandbox write has been verified. Browser integration deliberately uses lexical mode for reproducibility; ONNX inference is owned and verified by the backend. Current full Community module registration produces a Vite advisory about a JavaScript chunk above 500 kB (roughly 388 kB gzip); the production build succeeds. Automated axe checks supplement, not replace, human accessibility testing. This is a synthetic hackathon prototype, not legal advice or a guarantee of dispute outcomes.
