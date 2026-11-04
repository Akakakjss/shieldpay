# Sources and claim boundaries

This is a desk-research evidence ledger, not a customer-validation report. Numbered references are shared across the submission documents. Official rules take precedence over summaries or sponsor marketing; recheck them before entry because the rules permit amendments.[1]

## Source notes

### Official requirements

**Official hackathon rules, sections 1, 3–4, 6, 8 and 11.** Submission closes November 12, 2026 at 12:00 p.m. Pacific: **3:00 p.m. EST / 20:00 UTC**. Time conversion was checked with Python `zoneinfo`. Eligibility depends on age of majority, residence, conflicts and other restrictions; this documentation does not determine entrant eligibility.[1]

Key exact passages:

> “Any AI tool works, as long as PayPal integration is central to the project.”[1]

> “Your project does not need to be publicly hosted or deployed — but judges must be able to actually run or interact with a working build.”[1]

> “The repository must be public and open source by including an open source license file.”[1]

> “must be uploaded to and made publicly visible on YouTube”[1]

> “A project can only win up to one (1) Grand Prize and one (1) Sponsor Prize OR one (1) Honorable Mention Prize and one (1) Sponsor Prize.”[1]

The rules require PayPal developer-platform integration using the free sandbox plus an AI tool/model/platform. Local runnable setup instructions OR a hosted functional demo satisfy the functional-access route. Neither a static mockup nor a video alone satisfies that route. Repository source/assets/instructions must be complete; materials must be English or translated; access must remain free and unrestricted through judging, ending December 15, 2026 at 8:00 a.m. Pacific. The video should be less than three minutes and show functioning software; unpermitted third-party marks/music/material are disallowed.[1]

**AG Grid sponsor brief.** Formal prize wording accepts “any AG Grid tools,” while the sponsor brief asks for polish beyond a grid and encourages Studio Agent Framework. This is a distinction between eligibility wording and competitive fit, not a claim that AG Studio is in ShieldPay.[1][11]

> “Show us polish: custom widgets, theming, and layout tools, not just AG Grid or AG Charts on their own.”[11]

### Merchant need: primary platform guidance and first-person experience

**PayPal evidence guide.** Strong primary support for reason-aware assembly and response deadlines. It is guidance, not quantified merchant demand or evidence that ShieldPay improves outcomes.[2]

> “Different chargeback reason codes require different types of evidence.”[2]

> “Submit all evidence at the same time, you may not have the opportunity to submit additional evidence.”[2]

**US Seller Protection terms, last updated January 26, 2026.** Support the distinction between delivery evidence and complete eligibility. These are US terms, not a universal country-by-country rule set.[3]

> “You must ship the item to the shipping address on the Transaction Details page in your PayPal account for the transaction.”[3]

The terms exclude significantly-not-as-described claims and item-not-received claims filed directly with a card issuer. ShieldPay's current structured consistency policy does not encode every listed condition.[3]

**Shopify Community, “Charge back,” RUEthlessIrons, May 30, 2025, original first post.** First-person evidence of a reported reconciliation problem, not proof the merchant's allegations are correct. Use the original post, not the page's AI-generated topic summary or later commercial replies, as pain evidence.[4]

> “May 21st: Package was delivered (client confirmed via email but remained hostile and won’t engage in the Shopify dispute).”[4]

The merchant also describes incorrect tracking and conflicting timelines. No underlying transaction records or final outcome were independently verified. Do not generalize this Shopify-mediated experience into universal direct-PayPal API access. A later reply promotes CaseSignal and is not independent validation.[4]

**PayPal developer overview and lifecycle reference.** Primary support for Resolution Center versus API, internal versus issuer-managed external disputes, and actions conditional on current state/HATEOAS. Do not treat an internal `CHARGEBACK` lifecycle label as necessarily an issuer chargeback.[6][10]

### Competitors: descriptions, not independent performance evidence

- **Chargeflow PayPal integration page:** markets AI-powered automated inquiry/chargeback handling. Treat advertised recovery percentages and ROI as vendor claims; none is used as a ShieldPay benchmark.[5]
- **PayPal business risk/dispute marketing page:** the retrieved URL now resolves to a broader risk-management page. It describes customizable AI-driven templates and identifying unwinnable disputes/manual routing. Therefore, “knows when not to defend” is not a proven exclusive feature.[7]
- **Synctrack Shopify App Store listing:** describes tracking sync, dispute dashboards, auto-filled evidence and one-click submission. This establishes functional overlap, not a tested quality comparison or support for guaranteed hold release.[8]
- **CaseSignal Shopify App Store listing:** explicitly overlaps with missing-evidence detection, merchant control and approved response packages. Merchant approval alone is not a unique selling point.[12]

> “Prepare a read-only package after explicit merchant approval”[12]

- **PayPal's May 21, 2025 MCP/OpenAI announcement:** already describes natural-language invoice creation. This supports selecting a more specific problem than generic AI invoicing; it does not prove invoicing is a bad business.[9]

## What is grounded locally, not by these external pages

The root `README.md`, `BUILD_CONTRACT.md`, `backend/analysis.py`, `backend/retrieval.py`, `backend/paypal.py` and `frontend/TESTING.md` were read for implementation scope. They support the descriptions of actual ONNX semantic ranking, deterministic policy, source hashing, synthetic workflows, PDF generation architecture, adapter implementation and recorded frontend tests. Tests were not rerun in this research-only pass; final-build verification belongs to the coordinator.

The coordinator's `BUILD_VERIFICATION.md` controls current execution claims. Actual sandbox OAuth and list reads are verified; no disputes were returned, so evidence upload is unverified. Structured evidence import is implemented and browser-tested with a synthetic fixture. Repository publication, hosting, YouTube and Devpost remain separate actions; research alone does not establish them.

## Claims deliberately excluded

- No forum-derived percentages, market-size totals, average recovery rates or “most merchants” claims.
- No claims of customer interviews, pilots, willingness to pay, measured time savings, recovered funds or improved dispute outcomes.
- No assertion that a buyer committed fraud, that a hash authenticates a document, or that delivered tracking settles every dispute.
- No “fully autonomous dispute agent,” generative reasoning, proven legal compliance, complete Seller Protection eligibility engine, escrow or hold-release guarantee.
- No AG Studio/Studio Agent Framework/PayPal Agent Toolkit implementation claim; actual AG Grid Community use only.
- No claim a mock HTTP response is a real sandbox result, or that remote acceptance/readback is adjudication.

## Retrieval limitations

The official rules were successfully retrieved through `web_extract`; a second larger extraction exposed the full prize table and stacking clause that the first extraction abbreviated. Direct Python HTTP access returned 403 and the browser showed a Cloudflare verification interstitial; neither was counted as a successful independent read. Search snippets were used for discovery, with substantive claims checked against extracted primary pages. Competitor offerings were not installed or benchmarked. URLs can change; the risk-management redirect is disclosed above.

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
[10] https://developer.paypal.com/docs/disputes/disputes-reference
[11] https://paypalaihackathon.devpost.com/details/aggrid
[12] https://apps.shopify.com/casesignal
