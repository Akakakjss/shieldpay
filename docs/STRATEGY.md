# ShieldPay: strategy and idea selection

Research checked against official and first-party pages. This is a product hypothesis, not evidence of customers, revenue, validated demand, or a likely prize. See `RESEARCH_REFRESH.md` for three attributed merchant reports and `BUILD_VERIFICATION.md` for current execution results.

## Decision

**Build an evidence-first PayPal dispute operations console for small direct merchants: inspect the source, prepare a packet, and refuse an unsupported defense.**

The narrow initial scenario is a physical-goods, item-not-received dispute with structured order, carrier and buyer-message records. The differentiating demonstration is not a persuasive AI letter: it is a traceable evidence chain followed by an equally visible refusal when that chain fails.

### What the research actually supports

- PayPal tells sellers that evidence differs by reason code, that records should be organized and directly relevant, and that response deadlines matter. That supports a reason-aware evidence workspace, not an assumption that more prose wins disputes.[2]
- US Seller Protection requires additional conditions beyond delivery, including transaction-address alignment and timely responses. It excludes significantly-not-as-described claims and item-not-received chargebacks filed directly with card issuers. A delivery scan is not a universal defense or a protection guarantee.[3]
- In a first-person Shopify Community post dated May 30, 2025, RUEthlessIrons describes incorrect tracking, later delivery and buyer email confirmation, plus confusing intermediary timelines. This is an unverified individual report of evidence-reconciliation pain, not proof of platform misconduct or a representative sample.[4]
- PayPal documents both a manual Resolution Center and a Disputes API; internal PayPal disputes and external issuer chargebacks have different adjudicators. ShieldPay should serve direct merchant workflows it can actually access, not promise control over every Shopify-managed case.[6]

**Evidence boundary:** desk research only. No merchant interviews, usability sessions with customers, live merchant deployments, willingness-to-pay evidence, measured time savings or recovery results exist for ShieldPay. Do not convert forum anecdotes, view counts, vendor win-rate marketing or arbitrary readiness values into market statistics.

## Why this idea over the alternatives

These are qualitative build decisions, not numerical market scores.

| Candidate | Strength | Why not the primary build |
| --- | --- | --- |
| Generic AI invoicing | Easy-to-understand payment flow and natural-language input | PayPal already documents natural-language invoice creation through its MCP integration. A generic wrapper needs a more specific underserved workflow to stand apart.[9] |
| PayPal webhook doctor | Useful developer-focused debugging; a realistic compact engineering tool | Our retrieved merchant evidence supports document organization and dispute handling, not demonstrated demand for another webhook debugger. AI could become a decorative error explainer unless replay, signature checking and diagnosis are genuinely implemented. Keep as a separate idea, not extra scope. |
| Escrow-like milestone agent | Clear buyer/seller trust narrative | It introduces custody, release-authority, platform-permission and legal questions we have not resolved. Do not describe ordinary PayPal payments, holds or delayed capture as escrow. No supported escrow/release mechanism was verified in this research. Reject for this build rather than imply authority over funds. |
| **ShieldPay** | Visible PayPal-specific workflow, useful semantic retrieval, artifact generation and human action control | Best fit for a focused end-to-end demonstration with safe negative cases. Main risks are crowded competition, narrow structured inputs and unverified credentialed PayPal execution. |

## Competitive reality: crowded, not a new category

| Product / baseline | First-party description | Honest ShieldPay positioning |
| --- | --- | --- |
| PayPal Resolution Center / Disputes API | Existing manual and programmatic dispute management.[6] | Complementary evidence preparation; do not claim PayPal lacks dispute handling. |
| PayPal dispute automation | Current marketing includes AI-driven evidence templates, identification of unwinnable disputes and manual-review routing.[7] | Neither AI-assisted evidence nor choosing not to contest is novel by itself. |
| Chargeflow | Markets PayPal inquiries/chargebacks automation and AI-driven recovery.[5] | Emphasize the inspectable local implementation, exact quotations and approval mechanics, not superiority or recovery-rate comparisons. Vendor percentages are not independent benchmarks. |
| Synctrack | Its Shopify listing advertises tracking sync, unified disputes, auto-filled evidence and one-click submission.[8] | PDF preparation and tracking organization are not unique. ShieldPay currently offers less platform coverage and no proven live merchant onboarding. |
| CaseSignal | Its listing explicitly describes missing-evidence detection and merchant-approved response packages.[12] | Direct overlap with the human-control pitch. Do not claim to be the first merchant-approved dispute assistant. Show concrete implementation instead. |

**Defensible hackathon story:** an open-source, locally runnable evidence console combining order-scoped ONNX retrieval, deterministic consistency gates, source hashes, an actual PDF and exact-revision approval. This combination is our implementation focus, not a proven exclusive capability or a defensible commercial moat. Competitor listings were read, not independently installed or benchmarked.

## What the prototype does—and does not do

Local code reviewed: `README.md`, `BUILD_CONTRACT.md`, `backend/analysis.py`, `backend/retrieval.py`, `backend/paypal.py`, and `frontend/TESTING.md`.

- FastEmbed runs `BAAI/bge-small-en-v1.5` through CPU ONNX for semantic ranking within one order. The model does not generate the response, reason about liability or detect fraud. Exact source quotations and fixed policy checks supply the claims and recommendation.
- The policy checks source-text integrity, exact structured order fields, matching tracking, delivery timestamp, supported buyer acknowledgment, case reason/state and deadline. It blocks incomplete, conflicting and unsupported inputs. Hashes prove consistency with stored text, not authenticity of a carrier record or buyer message.
- `readiness` is a deterministic internal UI indicator, not a win probability, confidence estimate or PayPal eligibility score. A `defend` result means this prototype's limited checks passed; it is not a complete Seller Protection determination. In particular, the current policy is not a full address/eligibility or jurisdictional rules engine.
- The positive workflow produces an actual ReportLab PDF and requires approval of its packet hash. Demo submission is simulated, with `verified=false`; it sends no evidence to PayPal.
- The PayPal sandbox adapter implements OAuth, dispute listing/details, exact allowed-action validation, multipart evidence and readback. Actual credentialed OAuth and list reads succeeded; zero disputes were returned. Evidence submission/readback remain mock-transport tested only. Readback of a marker/document name is not proof of remote PDF bytes or a favorable decision.
- AG Grid Community is integrated into the real React queue. **AG Studio and Studio Agent Framework are not implemented.** The structured sandbox evidence importer is implemented and tested against an actual isolated HTTP backend, not validated with customers.
- Coordinated build results are documented in `BUILD_VERIFICATION.md`: 101 Python tests including real ONNX inference, 55 React tests and real-browser demo/importer checks. Unsupported PDF characters and multi-transaction disputes fail closed.

## Judging and scope priorities

The rules use a baseline viability/API fit gate and five equally weighted criteria: technological implementation, design, potential impact, innovation/idea and presentation.[1]

1. **Eligibility and implementation first:** obtain an entrant-controlled sandbox app and demonstrate the real integration safely. Mock transport coverage is valuable engineering evidence, not proof the free-sandbox integration requirement has been satisfied. Do not say submission-ready while that remains unverified.[1]
2. **Product coherence:** queue → evidence → PDF → explicit approval → simulated receipt → blocked case. Do not bury the core in a generic chatbot or add unrelated integrations.
3. **Impact without fiction:** target evidence-assembly and review effort; state that this is a hypothesis. Later measure preparation time, citation accuracy and unsafe-action prevention on consented, redacted examples—not invented recovered money.
4. **Innovation honestly:** explain the bounded evidence/safety architecture and acknowledge overlap. Do not imply generative reasoning where there is semantic ranking.
5. **Presentation:** record the working desktop UI, real PDF and blocked outcome with visible demo/provider labels. Use the [demo script](DEMO_SCRIPT.md).

### Prize posture

Aim for a strong overall entry and a credible PayPal + AI/demo presentation, not predicted winnings. The rules allow **at most one Grand Prize OR one Honorable Mention, plus one Sponsor Prize**, not all three.[1]

AG Grid tools qualify under the broad wording of the formal AG Grid prize eligibility, but the sponsor brief asks for polished widgets/layout and encourages Studio Agent Framework beyond a plain grid. Community use is real; Studio use is not. Do not claim a strong Studio submission, add paid trial scope solely for prize stacking, or imply sponsor eligibility guarantees selection.[1][11]

## Next validation, explicitly not completed

Recruit a few direct merchants for consented, redacted workflow observation. Ask where evidence lives, who has submission authority, what a missing document costs operationally, and whether an explicit block is useful. Compare packet preparation against their existing process. Measure source fidelity and review effort before making time-saving, pricing or recovery claims. Confirm whether the separate importer handles their real export shape before describing merchant onboarding as working.

## Sources

[1] https://paypalaihackathon.devpost.com/rules — PayPal AI Hackathon Official Rules
[2] https://www.paypal.com/us/cshelp/article/evidence-to-provide-for-chargebacks-a-guide-for-sellers-help1103
[3] https://www.paypal.com/us/legalhub/paypal/seller-protection
[4] https://community.shopify.com/t/charge-back/417029
[5] https://www.chargeflow.io/integrations/paypal
[6] https://developer.paypal.com/docs/disputes
[7] https://www.paypal.com/business/operations/dispute-management
[8] https://apps.shopify.com/synctrack
[9] https://developer.paypal.com/community/blog/openai-paypal-mcp
[11] https://paypalaihackathon.devpost.com/details/aggrid
[12] https://apps.shopify.com/casesignal
