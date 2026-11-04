# ShieldPay: complete project and submission summary

## The project

ShieldPay helps small PayPal merchants review the records behind a dispute before they respond. The starting problem came from merchant forum reports about incorrect tracking, scattered evidence and short response windows. The research contains three attributed first-person reports, not merchant interviews or proof of demand. See [the research and competitor review](RESEARCH_REFRESH.md).

The project focuses on a narrow physical-goods, item-not-received workflow. It is not a general legal, fraud or Seller Protection decision system.

## What works

The React workspace uses AG Grid Community to show the dispute queue. An operator selects a case and runs a local AI model to rank relevant records within that order. Findings link to exact source text. Deterministic checks handle record consistency, supported case state and deadlines.

The app generates an actual PDF with quotations, identifiers, source hashes and limitations. A reviewer approves a specific packet revision before the submission step. Replacing the evidence invalidates the previous review. The default demo labels all records as synthetic and its receipt as simulated.

The negative cases are part of the product: missing delivery proof blocks a defense, and conflicting buyer evidence routes to human refund review. The app does not issue refunds. A protected importer accepts structured sandbox records with explicit acknowledgment that the records are unverified.

## How it was built

- Interface: React, Vite and AG Grid Community.
- Backend: Python, FastAPI and SQLite.
- Runtime AI: FastEmbed with BAAI/bge-small-en-v1.5 through ONNX Runtime on CPU.
- Documents: ReportLab PDF generation.
- External integration: PayPal sandbox Disputes REST API.
- Development assistance: Hermes Agent, GPT-6.1 Sol and GPT-6.1 Terra. These are not the runtime AI provider.
- Tooling: locked dependencies, Postman collection, Docker/Render configuration and a GitHub Actions workflow. Deployment files do not establish a hosted app.

## Verified results

- 101 backend tests passed, including opt-in real ONNX inference.
- 55 React tests passed.
- Browser checks exercised the main review flow and protected import against actual local HTTP servers, including blocked cases and mobile/accessibility checks.
- The public repository was read anonymously, GitHub detected the MIT license, and a fresh public clone installed, tested and built from the README instructions.
- Actual PayPal sandbox authentication and dispute-list reads succeeded. That check returned zero disputes.
- Dependency and staged-source secret scans completed without findings at the recorded revision. Private .env files, databases and caches were excluded.

GitHub CI passed the full build/test/browser workflow on Ubuntu 24.04: https://github.com/Akakakjss/shieldpay/actions/runs/41873732878. Earlier attempts exposed an invalid job-level context and a rolling Ubuntu/Playwright incompatibility; both were fixed before the successful run.

## Important limits

Evidence upload and remote attachment readback have not been verified against PayPal because no suitable sandbox dispute was returned. Those paths have mock-transport tests; the demonstrated submission is a simulation. No real money or evidence write was performed.

Hashes detect changes to stored content; they do not authenticate carrier records. The PDF supports a limited Latin character repertoire and rejects unsupported characters rather than losing them. Multi-transaction disputes are unsupported. Unresolved submissions block new attempts; there is no reconciliation UI.

There is no production deployment, merchant pilot, measured time saving, recovered-money result or proven improvement in dispute outcomes. Existing products offer related dispute automation; the claim is this implementation, not an invented product category.

## Public links and files

- Source and run instructions: https://github.com/Akakakjss/shieldpay
- Automated checks: https://github.com/Akakakjss/shieldpay/actions
- Paste-ready description: [DEVPOST_COPY.md](DEVPOST_COPY.md)
- Natural recording script and click cues: [RECORDING_SCRIPT.md](RECORDING_SCRIPT.md)
- Build evidence: [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md)
- Original-source research: [RESEARCH_REFRESH.md](RESEARCH_REFRESH.md)
- Screenshot assets: [assets/](assets/)
- Local project: your cloned `shieldpay` directory.

The assistant's 160-second video draft is not the submission video. You chose to record/upload your own video. No YouTube upload or saved Devpost account draft is claimed.

## What to enter on Devpost

Project name: **ShieldPay**.

Tagline: **Turn scattered PayPal dispute records into a response you can check before you send.**

Use `DEVPOST_COPY.md` for the product story and `ENTRY_FIELDS.md` for account-entry instructions. The detailed verification notes here are an engineering handoff, not the Devpost pitch. Use the public repository as the functional-access route; do not put a localhost address into a field meant for a publicly hosted demo. The official rules allow complete local setup instructions instead of hosting.[1]

Use the included original screenshots, with their synthetic labels intact. AG Grid Community is implemented; AG Studio, Studio Agent Framework and PayPal Agent Toolkit are not.

## What remains yours

1. Upload your own working demonstration to YouTube as **public**, below three minutes, and insert its real URL. Your recording has not been provided or reviewed, so its runtime, content and public playback remain unverified.
2. Confirm actual entrant/team information, eligibility, contributor ownership, rights and registration. Review the remaining limitations in the copy.
3. Paste/save the draft in your Devpost account, review the required fields, submit personally and verify confirmation. Prepared files or published code do not enter the hackathon for you.

Submission deadline: **November 12, 2026, noon Pacific / 3 p.m. EST / 20:00 UTC**. Keep the required judging access available through December 15, 2026, 8 a.m. Pacific.[1]

An authorized test against an appropriate sandbox dispute would strengthen the PayPal demonstration. Until then, retain the evidence-upload limitation in both the video and submission. See [CRITIQUE_RESPONSE.md](CRITIQUE_RESPONSE.md) for the checked sandbox setup path and the decisions made from the external evaluation.

## Sources

[1] https://paypalaihackathon.devpost.com/rules — PayPal AI Hackathon Official Rules
