# ShieldPay: decisions from the second external evaluation

This is the engineering decision record for a third-party reviewer, not the Devpost pitch. The external evaluation's scores, time estimates and projected judging boosts are opinions. Review the implementation and evidence independently.

## Changes implemented

### Raw-paste evidence drafts

The protected sandbox importer now has a raw-paste builder alongside JSON mode. The operator chooses the record type, title and timestamp, and explicitly enters the target order. They preview the unchanged text and add it to a replacement batch before the existing reviewer/provenance/confirmation gates.

The server retains `original_text` and its UTF-8 `original_sha256`, separately from the provenance-prefixed record and that record's `sha256`. These are hashes of submitted text, not proof that the original email or carrier record is authentic. Clipboard CRLF preservation has rendered-component coverage. Unstructured prose can be retained without inventing an `Order:` line, but current deterministic analysis blocks unsupported text for human interpretation. This is not automatic email extraction or cross-buyer association. File uploads, OCR and `.eml` parsing are not implemented.

### Structured tracking plus the existing PDF multipart upload

The PayPal adapter already sent multipart `input` JSON and a binary PDF; the evaluation's implied JSON/base64 defect was not present. A shared pure payload builder now adds `evidence_info.tracking_info` from integrity-checked, matching in-order order/carrier records. The carrier record needs an exact supported `Carrier:` value such as `UPS`. Missing, foreign, ambiguous or unsupported tracking/carrier data blocks construction rather than producing a guessed carrier.

The actual current PayPal reference describes multipart/form-data and requires the current `provide-evidence` action link.[17] The structured payload is tested with mock HTTP, including parsed MIME parts. It is not proof of a successful remote upload.

The UI can preview the same generated input JSON and PDF part metadata without contacting PayPal. Missing carrier data produces an actionable conflict response, not an unhandled server error. Local PDF approval and current remote permission remain separate gates.

Independent review found that the new transport requirement also needed to be reflected before approval. The shared validator now contributes explicit analysis gaps and is rechecked before approval; a bumped policy version invalidates earlier analysis snapshots. Matching tracking with internal controls or nonstandard line separators is rejected without repairing identifiers. These fixes have targeted regressions and passed the full backend and browser checks afterward.

### Inline PDF review

The generated PDF has an inline browser preview as well as a download link. It uses the actual generated Blob and preserves the existing reviewer checkbox and revision-bound approval controls. Browsers without embedded PDF support can still download it. Native PDF text-to-source hover mapping is not implemented; source inspection still uses the existing exact citation buttons.

### Visible approval invalidation

Demo mode has a confirmed **Simulate late buyer message** action. It inserts a clearly synthetic contradictory message, clears the old analysis, marks approved sign-offs invalidated, removes the old PDF/approval UI and records the event in the audit trail. Re-analysis exposes the contradiction and blocks a defense.

The endpoint rejects sandbox mode, blocks an in-flight or unresolved submission and prevents repeated injection until demo reset. If the change succeeds but refresh fails, the UI stays locked and retries readback only, not a second mutation. This demonstrates one real state transition; it does not claim to demonstrate the entire test suite in one click.

Visual inspection also caught a stale queue badge: the original seed label could remain ready after the evidence changed. Replacement/drift now marks the case as needing review; completed analysis updates the queue risk from the current checks. An analysis that races a source change cannot overwrite the newly invalidated state with its old result. These regressions were reproduced before their fixes.

### Bundled PDF fonts and honest coverage

A redistributable bundled DejaVu Sans Mono TrueType font replaces built-in Type1 fonts. The tested sample preserves smart punctuation, precomposed accented Latin, Greek and Cyrillic in extracted PDF text and visually renders without missing-glyph boxes. Source text and source hashes are not rewritten. The font license is included.

This is broader character coverage, **not full Unicode support**. Uncovered glyphs, emoji, combining marks, direction controls and shaping-dependent scripts still fail explicitly. A single font registration does not guarantee glyph coverage or correct shaping for every language. Unsupported text is retained in the source record; it is not silently removed to make the PDF pass.

## Recommendations not adopted

### Blanket $750 signature rule and the proposed $820 blocking case

The current U.S. help page explicitly distinguishes transaction dates: signature confirmation is required for the described transactions processed before January 26, 2026, while for transactions after that date it is recommended but not mandatory.[18] The current U.S. Seller Protection terms were updated January 26, 2026 and leave eligibility to PayPal under broader conditions.[3]

A PayPal editorial article dated April 1, 2023 still says that sales of $750 or more require a signature.[19] The date-specific current help and current legal terms are more relevant than that older blanket statement. No universal current `$750 -> block` rule or misleading new high-value demo case was added. Other countries, historical transactions and case-specific evidence requests need separate policy treatment.

### Five-point Seller Protection eligibility score

Address alignment matters under the U.S. policy, but matching a pasted ZIP against another pasted ZIP does not establish the PayPal transaction's shipping address or full Seller Protection eligibility.[3] The current sync does not retrieve an authoritative transaction shipping-address source. No address-match result or eligibility score is fabricated. Full address integration remains an acknowledged product gap.

### Dual-polar liability bars and automatic cross-order association

Semantic similarity is not entailment or liability probability. In a real local ONNX probe using synthetic text, the delivery-support anchor scored the positive statement **0.944376** and its negation **0.865941**; the unrelated catalog text scored **0.512426**. This is one illustrative probe, not an accuracy benchmark. It demonstrates why a high score cannot safely be labeled "defense support" or "liability exposure" without a validated task model and evaluation set.

The existing neural model remains an order-scoped relevance ranker. Cross-order inbox suggestions could be a future workflow with explicit identity checks and human assignment; automatic semantic linkage was not added. The current small-corpus usefulness question remains fair and should be evaluated rather than answered by inventing probabilities.

### Timeout simulation with a one-click unlock

A simulated timeout is easy to add; proving that an uncertain remote write did not happen is not. The current application has no general reconciliation UI. A generic GET or disappearance of an action link is not sufficient reason to clear the case-level uncertain lock. No unsafe unlock or fake remote-success button was added.

### Additional scope

No Studio Agent Framework, generative runtime model, native PDF citation-hover engine, carrier authentication connector, hosted service or paid tool was added solely for sponsor positioning. No claimed judging-point increase or guaranteed prize outcome is attached to these choices.

## Execution evidence and remaining gaps

See [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md) for the current recorded commands and results. Tests are local or mock-transport unless explicitly identified as actual PayPal reads. New browser checks exercise real local HTTP, actual ONNX inference, the generated PDF and payload preview, approval invalidation, and raw-paste import with exact-text/hash readback.

The PayPal sandbox evidence upload/readback is still unverified. No transaction, dispute creation, evidence write, refund, settlement or adjudication was performed during this pass. There is no hosted application, completed YouTube upload or final Devpost entry. The source is suitable for independent review with these limitations disclosed; that is not a statement that the entry is submission-complete.

## Suggested independent review

Read [COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md), [DEVPOST_COPY.md](DEVPOST_COPY.md), this decision record and [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md). Inspect the public source and CI rather than taking the implementation claims on trust. Assess remaining PayPal integration depth, runtime AI usefulness, ingestion usability, state transitions, source/PDF fidelity and the claims made in the pitch. Identify reproducible defects separately from optional scope, and check current authoritative policy before recommending new eligibility gates.

## Sources

[3] https://www.paypal.com/us/legalhub/paypal/seller-protection
[17] https://developer.paypal.com/api/customer-disputes/v1/disputes-provide-evidence
[18] https://www.paypal.com/us/cshelp/article/how-do-i-prove-that-ive-sent-an-item-or-digital-goods-to-the-buyer-help177
[19] https://www.paypal.com/us/brc/article/tracking-and-shipping-best-practices
