# Decisions from the external ShieldPay evaluation

The supplied evaluation is useful independent criticism, not official judge feedback. Its numerical scores are opinions, not measured scores or a prediction of winning.

## What changed

The public story now starts with the merchant's task and the inspectable response packet. Repeated research caveats and implementation-audit detail remain in the research/verification documents, rather than interrupting the pitch. Material limitations are still disclosed in a short prototype-status section. Account-entry reminders are separate in [ENTRY_FIELDS.md](ENTRY_FIELDS.md).

The README opening and recording script now follow the same product framing. No runtime behavior, AI model, evidence gate or PayPal permission was changed by these documentation edits.

## What the source check supports

- The rules have five equally weighted judging criteria, with Technological Implementation first in the tie-break order. They allow an AI tool or model of the entrant's choice; they do not require a generative LLM. This does not guarantee that semantic retrieval will score strongly.[1]
- A stronger PayPal demonstration needs more than authentication and an empty list. PayPal documents sandbox transaction and dispute creation, so waiting for a dispute to appear is not the only path.[13][14]
- API creation is not necessarily available with ordinary merchant read credentials. PayPal documents buyer consent, a buyer assertion and an additional dispute-creation scope, with account-manager enablement for that scope.[13]
- The AG Grid prize accepts otherwise eligible submissions using any AG Grid tools. Its published sponsor guidance emphasizes polish, custom widgets, theming/layout and Studio Agent Framework; Community usage alone does not establish competitiveness.[1][11]
- The Render awards are credits, not cash. The rules list $1,000, $750 and $500 in Render credits for its three places.[1] The AG Grid table lists $5,000 for one first-place award, $2,000 for one second-place award and $1,000 for each of three third-place awards; the evaluation's $8,000 aggregate leaves out two third-place awards.[1]
- Render's free web services spin down after 15 minutes without inbound traffic. Local filesystem changes, including SQLite data, are lost on restart, redeploy or spin-down; free services cannot attach a persistent disk.[16] The model file's size alone is not a memory-capacity test.

## Claims not adopted

- **"Zero hallucination."** The app bounds retrieval and preserves reviewed text. That is not a guarantee that source records, parsing, recommendations or software are error-free.
- **"Unwinnable dispute."** Missing delivery proof means this packet does not support the implemented defense path. It does not prove the legal or eventual outcome.
- **"Compliance rules verify delivery windows."** Describe the checks actually implemented. They are not a full Seller Protection or legal-compliance assessment.
- **"Guaranteed eligibility" or easy sponsor wins.** The administrator decides eligibility and awards. Hosting is useful for access, not a promise of a prize.
- **Adding a generative model solely for appearance.** A new runtime dependency is worthwhile only if it solves an observable evidence-review task and can be validated. The current embedding model ranks records; development-time GPT use is not a runtime agent.

## Priority 1: close the PayPal loop

Fresh execution of `uv run python scripts/check_sandbox.py` on November 4 returned `verified_reads`, `disputes_seen: 0`, and `remote_writes_sent: 0`. Upload and remote attachment readback remain unverified. See the private local `artifacts/sandbox-verification.json` for the sanitized result.

### Prerequisites needing account access or permission

- A sandbox personal buyer and the sandbox business merchant associated with the app.
- Explicit authorization to create sandbox test transactions/disputes and submit a reviewed sandbox-only test packet. Do not use live endpoints or real customer evidence.
- If using API dispute creation, the buyer consent and additional scopes documented by PayPal. Do not assume the current merchant credentials grant these.[13]
- Passwords and app secrets stay in the vault/private configuration, never chat, published evidence or screen recordings.

### Documented path and completion gates

1. Confirm both accounts are sandbox accounts and that the business merchant matches the app used by ShieldPay. PayPal documents using the personal account for buyer actions and the business account for merchant actions.[13]
2. In the sandbox buyer account, create a test transaction to the sandbox business account and retain the buyer transaction ID. PayPal documents this through Send and Request.[14]
3. Create an item-not-received dispute using the sandbox buyer's Resolution Center, or the documented sandbox-only create-dispute API after its buyer prerequisites are satisfied. The API path uses `buyer_transaction_id`, not an invented dispute ID.[13][14]
4. Read the dispute through the merchant API and verify the exact ID, transaction, reason, state and current action links. An inquiry-stage case does not automatically offer `provide-evidence`; use documented sandbox test transitions only when authorized. Do not hard-code state changes or bypass the existing gate.[14]
5. Sync the exact dispute into the isolated localhost sandbox instance. Import only purpose-built sandbox test records tied to that test transaction/order, with explicit test/unverified provenance. Do not relabel the default demo records as genuine carrier evidence.
6. Analyze, inspect the quotations and PDF, and approve the current packet. Submit only if the actual current dispute offers the supported `provide-evidence` action and the operator approves the write.
7. Read back that exact remote dispute. Preserve a sanitized result showing the response status, returned attachment metadata and what the follow-up GET actually confirms. If the result is uncertain or readback is missing, stop and reconcile rather than automatically resubmitting.
8. Update the video and submission only after this succeeds. Report an accepted/verified sandbox attachment as such, not as a won case, real merchant recovery or authenticated delivery.

No transaction, dispute creation, evidence write, refund, adjudication or settlement was performed in this critique pass.

## Priority 2: make judge access easier

Keep public hosting limited to a credential-free, synthetic demo. The existing Dockerfile and Render blueprint are preparation, not a deployed service. Before using a hosted link, verify cold start, model-backed analysis, PDF generation, restart/reset behavior and mobile workflow on that actual service. Keep the tested local route available as a fallback.

A free deployment must be treated as disposable because of filesystem resets and idle spin-down.[16] Do not put the private sandbox instance or its credentials on a public demonstration service. Review account authorization and any billing exposure before creating a service. Render's sponsor page describes deploying and using Render Workflows; do not claim Workflows without implementing it.[15]

No Render deployment was made in this pass.

## Priority 3: targeted grid polish

The current queue already has a custom case button, currency formatting and evidence-status renderer. Deadline badges could improve prioritization. A numerical readiness percentage needs a defined, honest denominator; it must not imply win probability. These are useful refinements after the integration/access gaps, not a reason to replace the application with an unrelated dashboard or rush a trial dependency.

No new grid behavior or Studio integration was implemented in this pass.

## Copy edit check

Draft opening: "ShieldPay is an evidence-first dispute operations console."

Remaining AI tells: abstract category jargon, stacked architecture terms, and writing about the project instead of the person using it.

Final framing: "Turn scattered PayPal dispute records into a response you can check before you send." The story then follows the actual task and puts the implementation and prototype boundaries in their own sections.

## Sources

[1] https://paypalaihackathon.devpost.com/rules — PayPal AI Hackathon Official Rules
[11] https://paypalaihackathon.devpost.com/details/aggrid
[13] https://developer.paypal.com/platforms/disputes/set-up
[14] https://developer.paypal.com/disputes/test-go-live
[15] https://paypalaihackathon.devpost.com/details/render
[16] https://render.com/docs/free
