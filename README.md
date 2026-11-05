# ShieldPay

**Turn scattered PayPal dispute records into a response you can check before you send.**

ShieldPay helps small merchants assemble an item-not-received dispute response from order records, tracking updates and customer messages. Inspect the source text, download a cited PDF, and approve the exact version you reviewed. Missing or conflicting evidence pauses the defense for human review.

> **Hackathon prototype.** Default mode is a working interactive demonstration with explicitly synthetic records. Its submission receipts are simulated. PayPal sandbox integration is a separate, credential-gated mode. No production PayPal endpoints, automatic refunds, dispute-win predictions, or hold-release guarantees.

**Verified local build:** 147 Python tests (including actual ONNX inference), 73 React tests, real-HTTP browser workflows with model-backed analysis, inline PDF/payload preview, approval invalidation and protected raw-paste import. PayPal sandbox authentication and reads are verified; evidence upload remains unverified. See [execution evidence and limitations](docs/BUILD_VERIFICATION.md).

## Run locally

Prerequisites: [uv](https://docs.astral.sh/uv/getting-started/installation/), [Node.js LTS](https://nodejs.org/) (22 or newer recommended), and Git. uv installs the compatible Python version declared in `pyproject.toml`.

```bash
git clone https://github.com/Akakakjss/shieldpay.git
cd shieldpay
python scripts/run.py
```

If `python` is not on your PATH, use `uv run --no-project --python 3.12 python scripts/run.py`.

Open **http://127.0.0.1:8787**. The launcher installs locked Python and JavaScript dependencies, builds the real React app, and serves it through FastAPI. No PayPal account or paid AI key is needed for the synthetic workflow. The first ONNX analysis may download the embedding model; internet access and adequate memory are required. If unavailable, the UI must identify lexical fallback rather than present it as AI inference.

After a first build, start faster with:

```bash
python scripts/run.py --no-build
```

Run tests and rebuild without starting a server:

```bash
python scripts/run.py --check
```

## Judge walkthrough

1. Read the demo/provider indicators. All sample people, orders and records are synthetic.
2. Select the delivered-order case. Run analysis and inspect the cited quotes and source hashes.
3. Download the actual PDF packet. Review the recommendation and limitations.
4. Explicitly approve the packet, then simulate submission. A local approval is not a PayPal submission; the receipt is labeled simulated.
5. Select the in-transit and contradictory-order cases. Missing delivery or conflicting evidence should block a defense.
6. Inspect the audit trail and reset the synthetic demo for another run.

For the visible revision-change scenario, approve the supported packet without submitting it, then select **Simulate late buyer message** and confirm. The old approval/PDF is invalidated. Analyze again to inspect the contradiction. **Preview PayPal JSON + PDF parts** shows the locally constructed multipart input without contacting PayPal.

If upgrading an older local demo, reset its synthetic data in Settings and analyze again. The newer payload checks require an exact carrier field and invalidate earlier analysis snapshots; do not reuse an old approval.

## How the AI is used

The local ONNX embedding model provides semantic retrieval over records scoped to one order. The model ranks relevant evidence; it does not establish truth or make financial decisions. Deterministic checks validate source identity, exact quotations, evidence gaps, contradictions, packet hashes and action eligibility. A human approves the exact packet revision. An honest offline lexical baseline is separate from model-backed inference.

No customer records are sent to a paid language-model API. First-time model downloads contact the model host. The project does not claim to use PayPal's Agent Toolkit or AG Studio unless separately implemented and tested. It uses AG Grid Community for the operational queue and PayPal REST APIs for sandbox disputes.

## Architecture

```text
React + AG Grid Community
          | same-origin JSON + PDF download
          v
FastAPI -- SQLite records / analyses / approvals / audit
   |          |
   |          +-- order-scoped semantic retrieval (FastEmbed / ONNX)
   |          +-- exact quotes + deterministic safety checks
   |          +-- ReportLab evidence packet
   |
   +-- Demo adapter: synthetic records, simulated receipt
   +-- Sandbox adapter: PayPal OAuth -> dispute details -> allowed
                         evidence action -> read-back verification
```

## PayPal sandbox setup

**Use a separate localhost instance. Never put sandbox credentials into a public demo or commit them.**

1. Create a PayPal Developer sandbox app and enable **Disputes** in its feature options. API permissions and available actions depend on the app and case state.
2. Copy `.env.example` to a private `.env` at the project root. Set `SHIELDPAY_MODE=sandbox`, your sandbox `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`, and a long random `SHIELDPAY_ADMIN_TOKEN`. Enter secrets locally in your editor or terminal, not in chat or the public repository.
3. Run a separate database path using `SHIELDPAY_DB`. Start the app and inspect connection readiness.
4. Sensitive sandbox reads **and** mutations require `X-Admin-Token`. In Settings, enter the generated admin token and select **Unlock sandbox records**; the token stays in memory and clearing it removes loaded records. Never publish it.
5. Sync real sandbox disputes. Do not turn synthetic IDs or synthetic records into evidence for a real sandbox case.
6. Evidence submission requires the current PayPal dispute state and its `provide-evidence` HATEOAS action, an approved current packet, and server authentication. Unsupported actions or missing permissions must surface as errors, not fake success.

For guided local setup, run `python scripts/setup_sandbox.py`. It creates a private `.env` and random admin token only if no `.env` exists. Fill sandbox Client ID/Secret in your local editor, then run `uv run python scripts/check_sandbox.py` for a read-only connection check. Start a separate sandbox instance with `python scripts/run.py --no-build --port 8788`.

In a synced case, **Evidence → Import sandbox evidence** accepts a documented JSON array or a **Raw paste builder**. The builder requires explicit type/title/timestamp/target-order metadata, previews the unchanged text and adds it to the confirmed replacement batch. The server retains the original text and its UTF-8 hash separately from the provenance-prefixed record. Arbitrary prose is retained but can remain blocked for human interpretation; no facts or buyer identity are inferred.

Import replaces local sources, requires explicit unverified-provenance acknowledgment and invalidates prior review state. It does not authenticate a carrier record or send evidence to PayPal. Do not paste real customer data. The structured PayPal payload requires matching tracking and an exact supported carrier field such as `Carrier: UPS`; preview it before sending. The PDF uses a licensed bundled font for a tested subset of Latin, Greek, Cyrillic and punctuation. Emoji, uncovered glyphs, combining marks and shaping-dependent scripts remain explicitly unsupported rather than silently disappearing. Multi-transaction disputes are not supported. Unresolved submissions block replacement and new attempts until reconciled outside this prototype.

[PayPal integration guide](https://developer.paypal.com/docs/integration/direct/customer-disputes/integration-guide/) · [Evidence API](https://developer.paypal.com/api/customer-disputes/v1/disputes-provide-evidence)

## Optional deployment

`Dockerfile` and `render.yaml` describe an optional **synthetic demo** deployment, not an already deployed service. Review the provider's plan and limits before deploying. Free instances may sleep, have ephemeral storage and insufficient memory for model loading. Test actual cold starts and inference before using a deployment for judging. Never add PayPal credentials to the public demo. Runnable local instructions satisfy the official functional-demo requirement; hosting is optional.

## Submission materials

- [Complete project and submission summary](docs/COMPLETE_SUMMARY.md)
- [Paste-ready Devpost copy](docs/DEVPOST_COPY.md)
- [Account-entry checklist](docs/ENTRY_FIELDS.md)
- [External critique decisions and sandbox completion steps](docs/CRITIQUE_RESPONSE.md)
- [Second evaluation: implemented changes and declined recommendations](docs/SECOND_REVIEW_DECISIONS.md)
- [Natural recording script for your own video](docs/RECORDING_SCRIPT.md)
- [Original cover and actual application screenshots](docs/assets/)
- [Strategy and idea selection](docs/STRATEGY.md)
- [Refreshed original merchant reports and competition](docs/RESEARCH_REFRESH.md)
- [Executed verification and known limitations](docs/BUILD_VERIFICATION.md)
- [Draft Devpost description](docs/SUBMISSION.md)
- [Under-three-minute demo script](docs/DEMO_SCRIPT.md)
- [Sources and unverified-claim boundaries](docs/SOURCES.md)
- [Launch checklist](docs/LAUNCH_CHECKLIST.md)
- [Security and prototype limitations](SECURITY.md)

The official deadline is **November 12, 2026, 12:00 p.m. Pacific / 3:00 p.m. Eastern / 20:00 UTC**. A public repository with an open-source license, working build and publicly visible YouTube demo are required. The entrant must confirm eligibility, register and submit personally. The application is not a submitted hackathon entry merely because its code is published.

## License and notices

Original project code is MIT licensed. Dependencies and downloaded model weights keep their own licenses; see `THIRD_PARTY_NOTICES.md`. ShieldPay is an independent prototype, not affiliated with or endorsed by PayPal. Product names identify their respective integrations; no third-party logos or music are bundled.
