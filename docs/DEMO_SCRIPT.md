# ShieldPay demo script

**Local draft recorded: 2:40 (160 seconds, verified by ffprobe).** File: `artifacts/shieldpay-demo-draft.mp4`. The official rules require a public YouTube demonstration under three minutes.[1] The local file is not an uploaded submission. The outline below is a presentation guide; the recorded narration reflects current read-only sandbox verification.

## Before recording

- Run `python scripts/run.py` and open `http://127.0.0.1:8787` in a desktop browser. Use synthetic **demo** mode only. Keep the demo/provider labels visible.
- Warm the actual model before the take with `uv run python -m backend.cli warmup`; analyze once and confirm `local-onnx` after real inference. Reset the synthetic workspace before recording. Confirm the fresh analysis still uses ONNX.
- If the model fails and the app reports `lexical-baseline`, fix model availability and re-record the AI segment. Do not relabel fallback, edit in fake scores or present a prior screenshot as current inference.
- Test the PDF download and its opening application ahead of time. Record a real download and actual PDF pages, not a title card of a PDF.
- Clear unrelated tabs, notifications, credentials and personal data. Use original narration, no copyrighted music, no unlicensed third-party logos/footage. Review trademark permissions under the rules.[1]
- Rehearse the click path against the final UI. The importer is integrated and verified with a synthetic sandbox-shaped fixture; do not describe that fixture as a real PayPal case.

## Shot list and narration

Only the quoted paragraphs are spoken. Time slots include click/opening pauses. Record the real interactions; trim waits transparently if necessary, not the safety steps.

### 0:00–0:18 — audience, purpose, honest environment

**Screen:** live desktop queue, synthetic label and provider/environment indicators visible.

> “ShieldPay helps a small PayPal merchant prepare a dispute response they can inspect. This is a working local prototype using synthetic records. The submission you will see is simulated. The goal is not to win every dispute; it is to show the evidence and stop an unsupported defense.”

### 0:18–0:48 — delivered case → actual AI retrieval → citations

**Screen:** select the delivered-order case; click analyze; show the `local-onnx` provider and evidence inspector. Open a carrier quotation and its source hash. Point to the matching order/tracking; show order scoping without inventing a retrieval comparison.

> “Here is an item-not-received case. The order and carrier records match. Analyze runs a local ONNX embedding model to rank evidence for this order only. This is semantic retrieval, not generative reasoning. The cited text is copied from the source; deterministic checks validate consistency. A hash tracks the stored text—it does not prove the carrier record is authentic.”

### 0:48–1:12 — actual PDF artifact

**Screen:** download the current packet, open the actual PDF, show synthetic notice, citations, source hashes and limitations; return to app.

> “The output is an actual downloadable PDF, not a generated success message. It includes the source quotations, identifiers and limitations. Passing our narrow checks does not mean PayPal Seller Protection applies, or that a dispute will be won.”

### 1:12–1:40 — human approval → simulated submission → audit

**Screen:** enter reviewer name, explicitly confirm review, approve the current packet; confirm simulation in its dialog; show simulated receipt and audit. Do not skip or splice over the approval boundary.

> “I review and approve this packet revision explicitly. Approval is tied to its hash, so a changed packet requires another review. Now I confirm simulated submission. The receipt says simulated: no PayPal evidence was sent. The audit trail records the local steps instead of pretending that approval is remote acceptance.”

### 1:40–2:10 — blocked and contradictory cases

**Screen:** select in-transit case and analyze; show missing proof and disabled actions. Then select the wrong-item/contradictory case, analyze and show refund review with blocked defense.

> “Now the carrier says in transit. Delivery proof is missing, so defense is blocked. In this other case, the buyer's report conflicts with a delivery-only defense. ShieldPay routes it to human refund review. It does not accuse the buyer of fraud, invent missing evidence or issue a refund.”

### 2:10–2:35 — PayPal and sponsor truth boundaries

**Screen:** sanitized output of the actual separate read-only sandbox connection check, then return to the live synthetic queue. Never film the private `.env`.

> “The sandbox integration separately completed actual PayPal authentication and dispute-list reads. Our sandbox currently has no disputes, so evidence upload remains unverified. AG Grid Community powers the queue. A protected importer replaces local test records with explicit provenance acknowledgment; no carrier authenticity or remote acceptance is implied.”

### 2:35–2:45 — close

**Screen:** live workspace and original end card. Insert the public repo URL only after it really exists; no fake deployment link.

> “ShieldPay: evidence first, human approval, and a clear stop when the record does not support a defense. Customer validation and sandbox evidence-upload verification are still next steps.”

## Recording acceptance

- The segment order is delivered case → real ONNX and citations → actual PDF → approval and simulated receipt → blocked/contradictory cases.
- Keep model rankings distinct from deterministic policy; never call readiness a win probability.
- If credentialed sandbox verification or importer work lands before recording, update narration only after coordinator verification. This script intentionally reflects the current limitations.
- Time the actual exported file; a timed outline does not prove runtime. Leave a buffer below three minutes, including title/end cards.
- Review the uploaded YouTube video while logged out, confirm public visibility, readable UI/PDF and intelligible audio, then fill the real URL in `SUBMISSION.md`. There is no YouTube URL yet.
