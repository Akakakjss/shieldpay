# ShieldPay — Devpost submission draft

Use [DEVPOST_COPY.md](DEVPOST_COPY.md) for the current humanized, paste-ready story and [COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md) for the consolidated handoff. The entrant will upload their own video; the assistant's local draft is not the final submission video. No entry has been saved or submitted in a Devpost account.

**Status: submission draft, not entered on Devpost.** The MIT repository is public and verified through an anonymous read and a fresh public-clone install/test/build. A narrated160-second video draft exists locally, but no YouTube upload or hosted application is claimed.

## Submission fields and remaining links

| Field | Draft / status |
| --- | --- |
| Project name | ShieldPay |
| Tagline | The dispute assistant that shows its evidence—and knows when not to defend. |
| Public source repository | https://github.com/Akakakjss/shieldpay — public; GitHub detects MIT; anonymous access verified. |
| YouTube demo | **REQUIRED — NOT UPLOADED**. Local narrated draft: `artifacts/shieldpay-demo-draft.mp4`,160 seconds. Insert a public YouTube URL only after upload and playback verification. |
| Functional demo | The public repository's complete local instructions were exercised from a fresh public clone. Hosted URL: **none**; hosting optional.[1] |
| Platform | Desktop web browser; local FastAPI server, Python environment via uv, and Node.js build toolchain. |
| Built with | Python, FastAPI, SQLite, httpx, ReportLab, FastEmbed, ONNX Runtime, BAAI/bge-small-en-v1.5, React, Vite, AG Grid Community, PayPal Disputes REST API sandbox adapter. |
| License | MIT for original project code; dependencies and model weights retain their own licenses. Verify GitHub detects the root license after publication. |
| Sandbox verification | **READS VERIFIED:** actual OAuth and dispute-list reads succeeded. Zero disputes returned; evidence upload and remote readback remain unverified. |

## Inspiration

Dispute preparation is an evidence problem before it is a writing problem. PayPal's seller guidance emphasizes organized records, reason-specific evidence and timely responses.[2] A first-person merchant forum account describes the difficulty of reconciling incorrect tracking, later delivery and buyer confirmation across a dispute workflow; it is an anecdote, not a prevalence statistic.[4]

We chose to build a small, inspectable evidence workflow rather than an AI that writes a more confident accusation. The design question is: can an operator see exactly why a packet is eligible for review—and when the app should stop?

## What it does

ShieldPay is a local dispute operations console with explicitly synthetic demo records. An operator selects a case in the AG Grid Community queue, runs analysis, inspects exact quotations and source hashes, and downloads an actual PDF evidence packet. The delivered-order scenario can pass the prototype's limited consistency checks. The operator must review and approve that packet revision before simulating submission.

The negative paths are part of the product: an in-transit record without delivery proof blocks a defense; contradictory buyer evidence or an item-quality case routes to human refund review. No refund happens automatically. Demo receipts are explicitly simulated and do not claim PayPal accepted anything.

## How we built it

React and AG Grid Community provide the operator workspace. FastAPI owns case state, SQLite persistence, policy checks, approvals and audit events. ReportLab generates the downloadable evidence packet.

The AI component is **actual local semantic retrieval**, not generative reasoning: FastEmbed runs the BAAI/bge-small-en-v1.5 embedding model through ONNX Runtime on CPU and ranks order-scoped evidence. Deterministic code checks exact quoted text, stored source hashes, tracking consistency, structured delivery facts, supported buyer statements, case state and deadline. The recommendations and explanations are rule-based. If model inference is unavailable, the application labels lexical fallback honestly; that fallback is not described as AI inference.

The PayPal adapter is implemented for the sandbox only: OAuth, list/detail reads, current HATEOAS action checks, multipart evidence upload and exact-dispute readback. PayPal documents that available actions depend on dispute state and HATEOAS links.[10] **Actual credentialed sandbox authentication and dispute-list reads succeeded.** The account returned no disputes, so evidence upload/readback are still mock-transport tested only. The demonstrated submission is explicitly simulated, not evidence sent to PayPal.

## Challenges we ran into

The important boundary was keeping relevance separate from truth. A semantically related record from a different order must not become evidence. A delivery scan must not erase a buyer's conflicting statement. A previous approval must not silently authorize a different revision. We implemented order scoping, exact quotations, consistency checks and packet-hash approval around those risks rather than asking a language model to decide them.

We also distinguish local approval, simulated submission, remote acceptance and readback verification. None is a dispute win. The remaining integration challenge is exercising the adapter against an entrant-controlled PayPal sandbox with appropriate permissions and case state.

## Accomplishments we're proud of

The prototype has a concrete end-to-end artifact path: queue, cited evidence, actual PDF, explicit approval, labeled simulated receipt and audit trail. It includes safe blocked cases, rather than showing only a favorable example. The real AG Grid component is integrated, not a screenshot or a mocked UI.

`BUILD_VERIFICATION.md` records 101 Python tests including real ONNX inference, 55 React tests and actual-HTTP browser workflows for both synthetic review and protected import. The import replaces local records, discloses unverified provenance and invalidates old analysis/PDF/approval. Multi-transaction disputes, ambiguous fields, unresolved submissions and unsupported PDF characters fail closed. Public clean-clone verification remains a release gate.

## What we learned

Semantic retrieval is useful for finding relevant records, but it cannot authenticate documents, infer legal eligibility or establish who is right. A usable assistant needs visible uncertainty and a refusal path as much as a positive path. Existing products already offer dispute automation and merchant-approved packages, so our claim is a specific inspectable implementation—not the invention of this category.[5][8][12]

## What's next

Verify evidence upload against an appropriate sandbox-only case with explicit authorization, then conduct merchant workflow interviews on consented, redacted examples. Publication and clean-clone testing are complete. The entrant's own public YouTube video and final Devpost submission remain outstanding.

There has been **no customer validation, production use, measured recovery improvement or measured time saving**. AG Studio, Studio Agent Framework and PayPal Agent Toolkit are not part of the implemented stack. No public deployment is claimed. The current policy is deliberately narrow and does not implement every Seller Protection condition or verify document authenticity; PayPal's published eligibility rules are broader.[3]

## Judge run instructions

Follow the verified public repository's root README:

```bash
git clone https://github.com/Akakakjss/shieldpay.git
cd shieldpay
python scripts/run.py
```

If `python` is unavailable, the documented uv invocation is:

```bash
uv run --no-project --python 3.12 python scripts/run.py
```

Open `http://127.0.0.1:8787`. uv, Node.js LTS and Git are prerequisites. Dependency installation and the first model download require internet access. No PayPal credentials or paid AI API key are needed for the synthetic demo. Select the delivered case, analyze, inspect citations, download the PDF, approve and simulate; then inspect the in-transit and contradictory cases. Do not use synthetic records as evidence for a real case.

## Entrant-only pre-submit checks

Before pasting this draft, replace remaining link statuses with verified real links, reconcile every feature against the final revision and retain any limitations that remain. Confirm project creation/significant-update timing and contributor ownership rather than inventing a build history. The rules require central PayPal sandbox integration plus AI, a functional build, public open-source code and a publicly visible YouTube demo; unresolved credentialed integration is a compliance risk, not something to hide.[1]

## Sources

[1] https://paypalaihackathon.devpost.com/rules — PayPal AI Hackathon Official Rules
[2] https://www.paypal.com/us/cshelp/article/evidence-to-provide-for-chargebacks-a-guide-for-sellers-help1103
[3] https://www.paypal.com/us/legalhub/paypal/seller-protection
[4] https://community.shopify.com/t/charge-back/417029
[5] https://www.chargeflow.io/integrations/paypal
[8] https://apps.shopify.com/synctrack
[10] https://developer.paypal.com/docs/disputes/disputes-reference
[12] https://apps.shopify.com/casesignal
