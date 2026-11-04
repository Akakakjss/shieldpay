# ShieldPay research refresh: retain the idea, narrow the claims

**Research date:** November 4, 2026 (EST). **Decision:** retain evidence-first dispute preparation as the best of the four candidates for this build—not as a validated business or a novel product category.

Read alongside `STRATEGY.md` and `SOURCES.md`. Citation numbers below belong **only to this refresh**; they do not extend or replace the shared numbering in other documents. This pass changed no application code and did not rerun application tests. Implementation descriptions in the existing strategy remain a documentation snapshot, not fresh build verification.

## 1. What became stronger—and what did not

The original merchant anecdote is now accompanied by two additional first-person merchant reports from different accounts: deadline compression and losing despite submitting apparently relevant records.[3][4][11] These are **three distinct reported experiences, all on Shopify Community**, not independently authenticated businesses, a representative sample, or interviews. They support investigating evidence assembly, reconciliation and review; they do not establish willingness to pay, better dispute outcomes, or that a direct-PayPal product solves Shopify-mediated access problems.

Competition is more direct than “automated chargeback recovery”: Synctrack explicitly advertises delivery-proof PDFs and address comparison; CaseSignal explicitly advertises missing-evidence detection and merchant-approved, read-only packages.[15][9] **Do not pitch PDF generation, human approval, missing-evidence warnings, or declining weak cases as unique.** PayPal itself advertises identifying unwinnable disputes and routing cases for manual review.[10]

There are still **no ShieldPay interviews, consented customer tests, pilots, measured preparation-time savings, willingness-to-pay findings, recovered funds, or verified customer outcomes**. Nothing retrieved changes that boundary.

## 2. Original first-person reports

Quotes below are from the original merchant posts, not the forum's AI topic summaries or later vendor replies. “Independent” here means distinct authors/posts, not independently verified identities or facts.

### A. Tracking reconciliation and submission ownership

- **Author/date:** RUEthlessIrons, May 30, 2025. Original thread: https://community.shopify.com/t/charge-back/417029.[3]
- **Verified short quote:** “May 21st: Package was delivered (client confirmed via email but remained hostile and won’t engage in the Shopify dispute).”[3]
- **Reported problem:** the merchant describes incorrect tracking, a subsequent delivery confirmation, and conflicting Shopify/PayPal timelines and advice.[3]
- **Product implication (our inference):** put corrected versus superseded tracking, buyer acknowledgment, case deadlines and the authorized submission channel side by side. A beautifully written response cannot repair submission to the wrong party.
- **Limit:** neither the transaction records nor final resolution were verified. This is a Shopify-mediated example, not proof that ShieldPay can submit this merchant's case directly to PayPal.

### B. A response window that feels much shorter than expected

- **Author/date:** PTMindie, November 28, 2022. Original post: https://community.shopify.com/t/how-to-respond-quickly-to-a-chargeback-notification/171662/1.[4]
- **Verified short quote:** “I received notification that a customer issued a chargeback on November 19th and Shopify only gave me until the 24th to file a response.”[4]
- **Reported problem:** the merchant says a weekend and holiday left three business days to prepare the response.[4]
- **Product implication (our inference):** prioritize the actual case deadline and missing required records rather than a decorative readiness percentage; preserve the provider's timestamp/timezone.
- **Limit:** old anecdote, not a current Shopify SLA or evidence about how frequently this occurs. Later replies' deadline rules were not adopted as authoritative policy.

### C. Evidence submitted is not evidence accepted—or a guaranteed win

- **Author/date:** trucranems, **January 11, 2024, 02:07:43 UTC**, from the original post's JSON `created_at`; the HTML header renders January 10 in its displayed timezone.[11][6]
- **Original post:** https://community.shopify.com/t/how-can-i-win-a-chargeback-dispute-with-clear-evidence/284038/1. **Original-site data used to recover the post body:** https://community.shopify.com/t/how-can-i-win-a-chargeback-dispute-with-clear-evidence/284038.json.[11]
- **Verified short quotes:** “I also show a PDF showing that the license key I emailed is in use and registered to the same customer.” / “I still lost the chargeback”.[11]
- **Reported problem:** one digital-license claim involved emailed delivery and usage records; another involved customer messages/photos and a later damaged-item claim. The merchant reports losing both.[11]
- **Product implication (our inference):** make reason-specific evidence and contradictory claims inspectable, and explicitly separate packet completeness from adjudication. Use this as a counterexample to “more evidence means you win.”
- **Limit:** digital goods and damaged-item cases are outside the proposed first physical-goods INR workflow. This report supports the broader review problem, not proof that the narrow prototype would have changed either outcome. Do not repeat the author's fraud/platform-bias allegations as facts.

**Excluded from the independent complaint count:** vendor advice and promotional replies. For example, the recovered thread includes disclosures from merchant-tool builders and a CaseSignal promotion; these establish commercial overlap, not additional independent merchant validation.[11] No independent merchant-authored blog case study was verified in this pass; the blogs used below are first-party product announcements.

## 3. Primary guidance: what the workflow must respect

| Source and source date | Verified short quote | Consequence for ShieldPay |
| --- | --- | --- |
| PayPal seller evidence guide; no publication/update date visible in retrieved text | “Different chargeback reason codes require different types of evidence.”[14] | Scope to the supported reason. Surface relevant records and gaps, not a universal defense letter. The same guide advises organized records, simultaneous submission and timely responses.[14] |
| PayPal Disputes overview; updated June 11, 2026 | “This guide applies to direct merchants and connected integrations where merchants handle disputes and chargebacks and assume financial liability.”[13] | Explicitly identify submission ownership and account access. Resolution Center and the Disputes API already exist; external issuer cases are adjudicated by the issuer, unlike PayPal-adjudicated internal claims.[13] |
| US Seller Protection; updated January 26, 2026 | “You must ship the item to the shipping address on the Transaction Details page in your PayPal account for the transaction.”[16] | Delivery status alone is insufficient. Address alignment, timely response and other conditions matter; the US terms exclude issuer-filed INR and significantly-not-as-described claims.[16] |

**Critical distinction:** contesting a chargeback and qualifying for Seller Protection are separate; PayPal's own evidence guide says its Seller Protection obligations are separate from its efforts to contest chargebacks.[14] An issuer-filed INR case may still have an evidence-response workflow even though US Seller Protection excludes it.[13][16] Do not turn that exclusion into “never respond,” or turn a complete packet into “protected.”

## 4. First-party competition: substantial functional overlap

These are retrieved vendor descriptions, not installed products, independent benchmarks, or confirmed availability for every merchant/account.

| Product/source | Verified quote and date | Honest competitive reading |
| --- | --- | --- |
| PayPal risk management: https://www.paypal.com/us/business/risk-management | “Use customizable AI-driven templates to submit evidence”; “Leverage AI-powered tools to identify unwinnable disputes early, and route high-value disputes for manual review”. No source date visible.[10] | Evidence automation and selective/manual contesting are already marketed by PayPal. Eligibility, commercial access and product coverage were not tested. |
| Chargeflow PayPal integration: https://www.chargeflow.io/integrations/paypal | “Instantly recover PayPal inquiries and chargebacks, powered by AI and fully automated with Autopilot.” No source date visible.[8] | Strong overlap in PayPal-specific AI evidence/recovery. The page also describes configurable merchant control and custom evidence via API.[8] Ignore vendor recovery percentages as independent performance evidence. |
| Synctrack product blog: https://synctrack.io/blog/prove-delivery-on-paypal-disputes-with-synctrack/ | “now automatically creates a Delivery Confirmation PDF and attaches it directly to your PayPal, Shopify Payments, and Stripe dispute evidence.” October 15, 2026; Joseph Nguyen.[15] | Particularly close to the physical-goods INR/PDF scenario. It advertises shipping-address/carrier-location comparison and explains that carrier location often lacks the street address; signature/photo proof still requires manual upload.[15] Neither PDF output nor address comparison is a unique wedge. |
| CaseSignal developer-authored listing: https://apps.shopify.com/casesignal | “Identify missing critical evidence before approving a response”; “Prepare a read-only package after explicit merchant approval”. No publication/update date visible.[9] | Direct overlap with the safety/control narrative, not just generic recovery automation. Its listing also describes reason-aware editable drafts and exports.[9] Do not claim first merchant-approved or first missing-evidence assistant. |

**Remaining pitchable distinction:** a deliberately small, inspectable implementation whose actual demonstration exposes source quotations, evidence integrity checks, explicit uncertainties and exact-revision approval. This is an implementation/presentation choice—not a verified exclusive feature, commercial moat, or demonstrated superiority. Hash consistency must not be described as authenticating a carrier record or buyer message.

## 5. Confirmed official hackathon constraints

**Controlling source:** https://paypalaihackathon.devpost.com/rules, sections 1, 4, 6, 8 and 11; retrieved November 4, 2026. No amendment/publication timestamp was visible. The rules reserve the ability to change and take precedence over other hackathon materials.[1]

- **Submission deadline:** “Thursday Nov 12, 2026 (12:00 pm Pacific Time)”—**3:00 p.m. EST / 20:00 UTC**, checked with Python `zoneinfo`.[1]
- **Judging period:** December 1, 2026, 2:00 p.m. Pacific through December 15, 2026, 8:00 a.m. Pacific; free, unrestricted judging access must remain available through its end.[1]
- **Core requirement:** a working integration with the PayPal developer platform **using the free sandbox**, plus an AI tool/model/platform; “Any AI tool works, as long as PayPal integration is central to the project.” Sponsor AI tools are optional.[1]
- **Stage one:** pass/fail baseline viability, theme fit and reasonable application of the required APIs/SDKs. **Stage two:** equally weighted technological implementation, design, potential impact, innovation/idea and presentation.[1]
- **Submission:** public open-source repository with license, complete runnable source/assets/instructions, a functional build accessible through complete local setup instructions **or** a hosted demo, English materials or translations, and a publicly visible YouTube demonstration video that should be less than three minutes. Static mockups do not satisfy functional access.[1]
- **Sponsor prizes:** section 8 lists tool-use eligibility for **AG Grid, APIMatic, Bryntum, Channel3 and Render**, respectively. Merely using a listed optional sponsor elsewhere does not establish a prize category. Formal AG Grid eligibility says “any AG Grid tools”; this is not a promise of selection.[1]
- **AG Grid competitive brief:** “Show us polish: custom widgets, theming, and layout tools, not just AG Grid or AG Charts on their own.” It encourages Studio Agent Framework. A Community grid is not evidence of implementing AG Studio or that framework.[2]
- **Prize stacking:** at most one Grand Prize **or** one Honorable Mention, plus one Sponsor Prize—not all three.[1]

**Decision gate:** do not call ShieldPay submission-ready on mock transport tests alone. Confirm an entrant-controlled sandbox integration and the final runnable build separately. This research did not obtain credentials, contact anyone, publish a repository/video, or submit an entry. Entrant eligibility and third-party rights remain separate checks.

## 6. Choice against the alternatives

This is a qualitative decision for the existing build and remaining scope, not market scoring.

| Candidate | Decision and evidence |
| --- | --- |
| **Evidence-first disputes** | **Keep, conditionally.** Most concrete pain evidence in this review; a bounded end-to-end task can demonstrate both assistance and refusal. Competition sharply weakens novelty, but does not erase the coherent workflow. Sandbox access and truthful AI attribution remain gates. |
| Generic AI invoicing | Do not pivot to a generic natural-language wrapper. PayPal's May 21, 2025 first-party MCP announcement already says users can give natural-language instructions to create invoices.[17] Quote: “users can simply give natural language instructions to the MCP client”.[17] That establishes prior overlap, not current availability of every MCP route or that no invoicing niche exists. |
| Escrow-like milestones | Reject for this scope. This pass did not verify a custody/release-authority mechanism or legal/platform basis for an escrow promise. A milestone tracker without custody could be legitimate, but would be a different, less researched product. Do not relabel ordinary payments as escrow. |
| Developer/webhook tooling | Credible fallback if direct dispute access cannot be demonstrated, but not better supported by the merchant evidence collected here. No comparative developer demand study or specific unmet debugging workflow was established. Prefer one coherent product over adding a webhook debugger to ShieldPay. |

**Suggested pitch:** “ShieldPay is a PayPal dispute evidence-review prototype for small direct merchants. It helps assemble a reason-specific packet and makes missing or contradictory support visible before a human approves it. Our demo shows a supported case and a blocked case—not promised recovered money.” Only add implementation details that the final build actually demonstrates.

## 7. Three feasible improvements now

These are recommendations, **not claims of changes shipped in this research pass**.

1. **Make address uncertainty and submission ownership first-class.** Add a compact review panel: case channel/adjudicator, who can submit, actual provider deadline, transaction shipping address, carrier location granularity and missing proof. Label incomplete comparisons `unknown` rather than a successful address match; keep packet completeness separate from Seller Protection eligibility. Demonstrate a correct tracking number with insufficient destination detail as a negative case. This responds to the tracking/intermediary anecdote without pretending to solve every platform-mediated dispute.[3][13][16]
2. **Expose an evidence-to-claim review table, not just a PDF button.** Show each proposed claim beside its exact supporting quotation, source identifier/hash and status: supported, contradicted or missing. Put superseded tracking next to corrected tracking; make edits invalidate the prior approval. Keep the PDF's source index consistent with the reviewed revision. Position the inspectable behavior as the demo's strength, not “unique AI evidence generation”—Synctrack and CaseSignal already cover key adjacent features.[15][9]
3. **Replace outcome claims with a reproducible demonstration.** Use clearly labeled synthetic cases for a supported INR packet, missing destination proof, conflicting tracking and an unsupported reason. Show actual pass/block results and PDF artifacts from the final build; record real test output rather than inventing a win rate or time saved. In the video, identify semantic ranking as AI if that is what runs, distinguish deterministic gates from model reasoning, and visibly label simulated versus real sandbox actions. This serves the rules' implementation, impact and end-to-end presentation criteria without customer-validation fiction.[1]

## 8. Retrieval and evidence limits

- All sources above were retrieved on **November 4, 2026**. Publication dates are reported only where visible; undated live marketing/listings should not be treated as historical release evidence.
- The rules had a partial extraction in one retrieval path; a separate full `web_extract` successfully exposed submission requirements, judging and the sponsor table. Quotes for those sections were retained as explicit excerpts from that full retrieval, not inferred from search snippets.
- The trucranems HTML extraction displayed the AI summary and author headers but omitted the original body. The same site's `.json` representation supplied the original `cooked` post and exact UTC creation timestamp; HTML-decoded text was retained for quote verification.[11] Two other attempted forum `.json` fetches failed content-type handling; their readable original HTML posts were used instead.
- The indexed MCP quickstart URL https://docs.paypal.ai/developer/tools/ai/mcp-quickstart returned “The page you're looking for doesn't exist or has been moved.”[12] A guessed replacement path failed extraction. The dated, successfully retrieved first-party MCP announcement—not the stale snippet—supports the invoicing comparison.[17]
- The previously attempted `/community/blog/paypal-mcp-server/` route resolved to a general blog index, not a usable article. It was not used as evidence. No vendor product was installed, no recovery claim independently tested, and no customer contacted.
- Task-specific quote ledger and retrieval artifacts are isolated under the active profile's `cache/scratch/shieldpay-research-refresh/`; other documents and shared numbered ledgers were not rewritten.

## Sources

[1] https://paypalaihackathon.devpost.com/rules — PayPal AI Hackathon: Build what’s next with PayPal and AI - Devpost
[2] https://paypalaihackathon.devpost.com/details/aggrid — PayPal AI Hackathon: Build what’s next with PayPal and AI - Devpost
[3] https://community.shopify.com/t/charge-back/417029 — Charge back
[4] https://community.shopify.com/t/how-to-respond-quickly-to-a-chargeback-notification/171662/1 — How to respond quickly to a chargeback notification?
[6] https://community.shopify.com/t/how-can-i-win-a-chargeback-dispute-with-clear-evidence/284038 — How can I win a chargeback dispute with clear evidence? - Shopify Community
[8] https://www.chargeflow.io/integrations/paypal — PayPal Dispute Management, Recovery and Automation | Chargeflow
[9] https://apps.shopify.com/casesignal — CaseSignal Chargeback Evidence - Organize chargeback evidence and prepare responses you control | Shopify App Store
[10] https://www.paypal.com/us/business/risk-management — Business Risk Management & Fraud Detection
[11] https://community.shopify.com/t/how-can-i-win-a-chargeback-dispute-with-clear-evidence/284038.json — https://community.shopify.com/t/how-can-i-win-a-chargeback-dispute-with-clear-evidence/284038.json
[12] https://docs.paypal.ai/developer/tools/ai/mcp-quickstart — PayPal Developer
[13] https://developer.paypal.com/docs/disputes — Overview | PayPal Developer
[14] https://www.paypal.com/us/cshelp/article/evidence-to-provide-for-chargebacks-a-guide-for-sellers-help1103 — Evidence to Provide for Chargebacks: A Guide for Sellers | PayPal US
[15] https://synctrack.io/blog/prove-delivery-on-paypal-disputes-with-synctrack — Attach Delivery Proof to PayPal & Stripe Disputes | Synctrack
[16] https://www.paypal.com/us/legalhub/paypal/seller-protection — PayPal's Seller Protection Program
[17] https://developer.paypal.com/community/blog/openai-paypal-mcp — PayPal Community Blog | PayPal Remote MCP Server Now Supports OpenAI
