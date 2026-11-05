# ShieldPay: independent AI auditor handoff

## Review target

Public source: https://github.com/Akakakjss/shieldpay

Record the exact commit SHA you inspect. Use the updated second-evaluation revision supplied with this handoff, not the older 101-backend/55-frontend release. These Markdown files describe the implementation and recorded checks; they are supplied evidence, not an independent audit conclusion.

## Read in this order

1. [COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md): architecture, workflow and current boundaries.
2. [DEVPOST_COPY.md](DEVPOST_COPY.md): the public-facing pitch to assess.
3. [SECOND_REVIEW_DECISIONS.md](SECOND_REVIEW_DECISIONS.md): implemented and declined recommendations, including policy sources.
4. [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md): actual commands/results and their scope.
5. Root [README.md](../README.md), application source and tests. Run the app or tests if your tools allow it; say explicitly if you reviewed documents only.

## Current implementation to examine

- Local neural relevance ranking within an order; deterministic checks and explanations.
- Exact quotations/source hashes and revision-bound human approval.
- Structured PayPal tracking JSON alongside the binary PDF multipart attachment; local no-network payload preview.
- Inline PDF preview and bundled font support for a tested character subset.
- Protected no-JSON raw-paste drafts with explicit metadata, verbatim text and server-computed original-text hash.
- Demo-only late buyer message that invalidates the approved packet, refreshes queue risk and blocks the contradictory response.
- Source-change detection before saving analysis, plus existing auth and uncertain-submission controls.

## Important unresolved boundaries

The public default uses synthetic records and simulated submission. Actual PayPal sandbox authentication and dispute-list reads were verified, but returned no disputes. No evidence upload or remote attachment readback has been verified. There is no hosted service, general reconciliation UI, authoritative transaction-address check, merchant pilot or measured customer outcome. Runtime GPT/LLM reasoning, automatic email extraction and semantic identity association are not implemented.

PDF coverage is not full Unicode; unsupported glyphs, emoji, combining marks and shaping-dependent scripts remain blocked. Raw text is retained even when deterministic interpretation or PDF rendering is unsupported. A hash establishes stored-text consistency, not external document authenticity.

## Questions for an independent review

1. What does the runtime AI usefully contribute beyond lexical search in the current small corpus? Distinguish an implemented benefit from a proposed extension.
2. Are the PayPal payload, current-state checks and remote readback semantics correct? Identify what mock tests cannot prove.
3. Can stale analysis, changing evidence or uncertain remote outcomes bypass the intended approval/submission boundaries?
4. Does raw-paste ingestion reduce effort without silently inventing facts or associating evidence with the wrong buyer?
5. Does the PDF actually preserve and display supported source text? Identify character/layout limits rather than assuming TrueType means universal Unicode.
6. Are the new scenario, queue statuses and previews understandable in the working UI? Separate visual polish from correctness defects.
7. Does the Devpost pitch accurately describe the current build and make a convincing case for the intended merchant task?
8. What remaining changes offer the strongest benefit for the deadline, with realistic effort, risk and verification requirements?

Check current official policy before recommending deterministic eligibility gates. The decision record cites a date-specific U.S. signature-policy change; do not assume a universal current $750 rule. Treat previous evaluators' numerical scores and predicted point gains as opinions.

## Requested review format

- State the exact revision, files and execution you reviewed.
- Separate confirmed defects, unsupported claims, evidence gaps and optional improvements.
- For defects, give severity, exact file/location, reproduction and a minimal correction.
- Rank recommendations by practical value, effort and regression risk.
- Mark facts you could not verify. Do not fabricate test results, customer evidence, hosted URLs, sandbox success or certainty about winning.

This is a review request, not permission to make financial/API writes, deploy a paid service, publish a video or submit an entry.
