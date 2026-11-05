# ShieldPay

Draft submission copy. Account-entry instructions are in [ENTRY_FIELDS.md](ENTRY_FIELDS.md).

## Project name

ShieldPay

## Tagline

Turn scattered PayPal dispute records into a response you can check before you send.

## Inspiration

A PayPal dispute has a deadline. The order record, tracking update and customer conversation might all be in different places. Before a small merchant can respond, they have to work out what happened and which records support their answer.

One Shopify Community merchant described incorrect tracking that complicated a dispute even though the package later arrived.[4] That report gave me a specific problem to build around: help someone assemble a response they can check, and flag the gaps before they submit it.

## What it does

ShieldPay puts item-not-received evidence review in one browser workspace. Select a dispute, analyze the records for that order, and inspect the original text behind each finding. Download the response as a PDF with its supporting quotations and source references.

The same review also catches reasons to pause. In the demo, an in-transit shipment lacks delivery proof, so ShieldPay blocks the defense. A conflicting buyer report sends the case to a person for refund review. The app explains the problem instead of writing a confident response around it.

Before submission, a person reviews and approves a specific packet. Replace the evidence and that approval expires: a new version needs a new review. The audit trail connects those steps to the packet that was approved.

The interactive demo includes a supported case and both blocked cases. It can also inject a late synthetic buyer message after approval so you can watch the old approval disappear and inspect the new contradiction. Its records are synthetic and submission is explicitly simulated.

## How I built it

React and AG Grid Community provide the queue and review interface. FastAPI handles the API, SQLite stores records and audit events, and ReportLab creates the PDF.

I split retrieval from permission to act. A local neural embedding model, BAAI/bge-small-en-v1.5 through FastEmbed and ONNX Runtime, ranks relevant records within the selected order. Deterministic checks then test exact source quotations, tracking consistency, supported case state and the response deadline. A relevant record alone cannot authorize a submission.

The PDF carries source hashes so a reviewer can check which stored text belongs to the reviewed version. Approval is tied to that version. This makes the evidence trail inspectable without asking a language model to invent tracking details or decide liability.

PayPal's sandbox Disputes API supplies the dispute-integration layer. A local payload preview shows structured tracking JSON alongside the PDF attachment metadata before dispatch. The PDF itself can be reviewed inside the workspace or downloaded.

The protected sandbox importer also accepts raw pasted text through a draft builder, so the operator can preview and assign records without writing JSON. It preserves the submitted text and its hash. Unstructured text still needs human interpretation; the app does not invent missing delivery facts.

## Challenges I ran into

The difficult part was keeping a plausible answer from outrunning its evidence. Similar text from another order must stay out of the case. A delivery scan cannot erase a conflicting buyer message. I used order scoping, exact quotations and explicit blocks to handle those cases.

Approval also needed to survive real editing behavior. Replacing evidence while a submission is in progress, or retrying after an uncertain result, can detach an action from what a person actually reviewed. I added revision checks, case-level submission guards and regression tests around those transitions.

## Accomplishments I'm proud of

The useful output is a response packet someone can inspect, with the original quotations beside the findings. I also built the cases where the right next step is to stop and review the record.

The updated local build passed 147 Python tests and 73 React tests. Browser checks exercised actual local-model inference against a running HTTP server, generated PDFs and the new approval-invalidation scenario. GitHub Actions provides the build/test/browser workflow. The earlier public release also passed a clean-clone installation test using the README instructions; detailed verification distinguishes revisions.

## What I learned

Evidence review needs a clear stopping point. Better prose cannot replace a missing delivery record. The most useful AI contribution here is helping a person find the relevant text, while the application keeps a consistent link between that text, their approval and the response packet.

## What's next

Complete a sandbox evidence upload and verify the remote attachment on the same dispute. Then test the review workflow with merchants using consented, redacted records, measure preparation effort and choose the first order or carrier connector from what they actually need.

## Prototype status

PayPal sandbox authentication and dispute-list reads have succeeded. The test account returned zero disputes, so evidence upload and remote attachment readback remain unverified; those paths currently have mock-transport tests. The demonstrated submission is a simulation.

Source hashes detect changes to stored text, not whether a carrier record is authentic. ShieldPay does not decide Seller Protection eligibility, issue refunds or predict dispute outcomes. Preparation-time savings and customer outcomes have not yet been measured. Detailed technical boundaries are in [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md).

## Links and access fields

- Source: https://github.com/Akakakjss/shieldpay
- License: MIT for original code; dependency/model licenses remain separate.
- Video: add your public YouTube demonstration URL.
- Hosted app: none. Use the repository's complete local setup instructions; the rules permit this functional-access route.[1]


## Built with

PayPal Disputes REST API (sandbox), Python, FastAPI, React, Vite, AG Grid Community, SQLite, FastEmbed, ONNX Runtime, BAAI/bge-small-en-v1.5, ReportLab, GitHub, Hermes Agent, GPT-6.1 Sol, GPT-6.1 Terra.

The runtime AI is local ONNX embeddings. Hermes Agent and GPT models assisted development and review.

## Judge walkthrough

Follow the repository's complete [local setup instructions](../README.md#run-locally). The default synthetic workflow needs no PayPal credentials or paid AI key. Analyze 1042, inspect a citation, download the PDF, approve it and simulate submission. Then analyze 1043 and 1044 to see the missing-proof and contradiction blocks. Optional private sandbox setup is documented separately in the README.

## Optional YouTube upload text

Use this only if your recording shows the current workflow described above.

Title: **ShieldPay | PayPal + AI dispute evidence review demo**

Description:

```text
ShieldPay is a hackathon prototype that helps small PayPal merchants inspect dispute evidence, prepare a cited PDF and review a specific packet before responding.

Source and local run instructions:
https://github.com/Akakakjss/shieldpay

Watch a supported response become a cited PDF, then see the review pause on missing delivery proof and conflicting evidence. The AI runs locally through ONNX Runtime, and approval belongs to a specific packet version.

This demonstration uses synthetic records and simulated submission. Separate PayPal sandbox authentication and dispute-list reads have been verified; evidence upload remains unverified.

Built for the PayPal AI Hackathon. Independent prototype, not endorsed by PayPal.
```

Upload your own video as public, verify it is under three minutes and check logged-out playback. Use `assets/cover.png` as an optional original thumbnail. Review your video's rights and claims before posting.

## Sources

[1] https://paypalaihackathon.devpost.com/rules — PayPal AI Hackathon Official Rules
[4] https://community.shopify.com/t/charge-back/417029
