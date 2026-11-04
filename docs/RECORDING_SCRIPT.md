# ShieldPay recording script

Use this for your own screen recording. The spoken section is written in a conversational first-person voice. It does not claim merchant interviews, recovered money, a dispute win, or an evidence upload that has not happened.

## Final spoken script

I built ShieldPay for small PayPal merchants who need to pull a dispute response together from order records, tracking updates, and customer messages.

Merchant forum posts kept pointing to the same headache: the evidence is scattered, and the response deadline doesn't wait for you to sort it out.

This demo uses synthetic records. Any submission you see here is a simulation.

Here's an item-not-received case. I click Analyze, and a local AI model ranks the records for this order. Each finding shows the original text and a link back to its source. I can check the tracking number myself instead of taking the recommendation on trust.

The order and delivery records agree, so I can generate a response packet. This is a real PDF with the supporting quotations, source identifiers, and a hash for the reviewed content. That hash helps detect changes; it doesn't prove a document is authentic.

Before anything can move forward, I review the PDF and approve that specific version. If the evidence changes, the old approval can't authorize the new packet.

I'll confirm the simulated submission. The receipt clearly says nothing was sent to PayPal, and the audit trail records what happened.

Now I'll open a case where the shipment is still in transit. ShieldPay blocks the defense because delivery proof is missing. In this other case, the buyer's report conflicts with a delivery-only response, so it goes to human refund review. The app doesn't issue a refund itself.

PayPal sandbox authentication and dispute-list reads have been tested with real sandbox credentials. That check returned no disputes, so evidence upload is still unverified.

There's also a protected import screen for structured sandbox records. Imported evidence stays labeled as unverified, and replacing it clears the previous review state.

The code is public on GitHub. ShieldPay helps a merchant review a response they can explain, while leaving the final decision with a person. It doesn't promise that every dispute can or should be fought.

## Recording cues

These are editing targets, not a measured runtime for your recording. Rehearse with your own pace and keep the final export below three minutes.

| Approximate point | Screen |
|---|---|
| Opening | Queue at http://127.0.0.1:8790 with synthetic-demo label visible. |
| First case | Select Synthetic Buyer 1042. Click Analyze. Keep the real local-ONNX indicator in view. |
| Source check | Open the carrier citation and show the original tracking/delivery record. |
| PDF | Return to Review, generate/download the PDF and open the actual file. |
| Approval | Enter your reviewer name, confirm PDF review, approve, then confirm the simulation. Show the labeled receipt. |
| Negative cases | Analyze1043 for missing delivery proof, then1044 for conflicting evidence/refund review. |
| PayPal status | Show the sanitized actual read-only check, not your private .env. Explain that upload is unverified. |
| Close | Briefly show the public repository URL. |

If you show the importer, use the synthetic browser fixture or an appropriate sandbox-only case. Do not imply that a synthetic fixture is a dispute returned by PayPal. Do not put the private .env, client secret or admin token in the recording.

## Read-only PayPal proof

Run this privately if you want a fresh check before recording:

```text
uv run python scripts/check_sandbox.py
```

Only show its sanitized result. A successful empty list proves authentication/read access, not evidence-upload permissions.

## Humanizer edit notes

Draft opening: "ShieldPay is an evidence-first dispute operations console that combines semantic retrieval, deterministic safety checks and human-controlled response approval."

The draft sounded like a product specification: stacked jargon, evenly paced lists, and no clear person doing the work. The final script starts with who needs it, follows the actual clicks, and keeps the limitations near the steps they affect. It avoids invented personal experience and claims about customer outcomes.
