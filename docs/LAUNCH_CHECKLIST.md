# ShieldPay launch and submission checklist

**Current disposition: NOT READY TO SUBMIT.** Local gates below are partially complete; see `BUILD_VERIFICATION.md` for current execution evidence. The user separately authorized public GitHub publication. This document does not authorize payment/evidence writes, hosting, YouTube upload or Devpost entry.

**Deadline: November 12, 2026, 12:00 p.m. Pacific / 3:00 p.m. EST / 20:00 UTC.** The rules require central PayPal sandbox integration plus AI, a working application, public open-source repository and publicly visible YouTube demonstration. Local runnable instructions OR a hosted demo are allowed; hosting is not compulsory.[1]

## 1. Entry eligibility and ownership — entrant

- [ ] Join/register for the hackathon and review the current official rules personally; confirm age of majority, residence, employment/conflict restrictions and eligibility of every contributor. Do not infer eligibility from the local machine's location.[1]
- [ ] Confirm original ownership, authorized contributors/representative, new-project or significant-update timing within the submission period, dependency/model licensing and rights to all assets. Verify third-party notices and root MIT license; the rules require an open-source license but do not specifically mandate MIT.[1]
- [ ] Recheck the official page before final submission; amendments and specific sponsor requirements can matter.[1]

## 2. Critical PayPal integration gate — owner + coordinator

**Partially verified:** actual entrant-controlled sandbox OAuth and dispute-list reads succeeded. Zero disputes were returned. Evidence submission and remote attachment/readback remain unverified. Do not conceal that distinction in Devpost copy.

- [x] Configure entrant-controlled sandbox credentials privately; authenticate and list disputes. No credentials were committed, filmed or pasted into chat.
- [x] Use separate sandbox state/admin authentication and verify fixed sandbox origins and synthetic-ID rejection in tests.
- [ ] With separately authorized sandbox operations, verify OAuth and list/detail reads against an actual eligible sandbox case; record sanitized evidence of the exact case, state, API action and observed result. Do not perform any network writes as part of this documentation task.
- [x] Integrate and browser-test the protected structured-evidence importer against an actual isolated HTTP backend. Input remains unverified and synthetic; import is not carrier authentication or approval.
- [ ] If evidence submission is later authorized, use only that sandbox case's appropriate non-production evidence, exact current `provide-evidence` HATEOAS action and approved current packet. PayPal actions depend on state; do not force an unsupported case through the API.[10]
- [ ] Re-read the exact target dispute after any authorized remote write. Distinguish `uncertain`, `accepted` and verified matching marker/document metadata. Readback does not verify remote PDF bytes or dispute outcome. Do not automatically retry an uncertain write.
- [ ] If no credentialed demonstration can be completed, keep the limitation in the submission and ask the organizer about sufficiency before claiming compliance. A local synthetic workflow is not proof of central live-sandbox integration.[1]

## 3. Final local-build proof — coordinator

Coordinated execution passed 101 Python tests including opt-in ONNX inference, 55 React tests, production build, actual-HTTP demo and protected importer browser checks. See `BUILD_VERIFICATION.md`; remaining source changes require rerunning affected checks.

- [x] Run the documented launcher from a fresh public clone: dependency installation,101 backend tests,55 React tests and production build passed.
- [x] Run actual-HTTP browser checks and inspect the demo/importer reports and artifacts.
- [x] Verify real ONNX inference in fresh processes and honest fallback behavior in tests. A cold, empty-cache first download was not separately benchmarked.
- [x] Inspect exact scoped citations, source hashes and exclusion of unrelated-order evidence.
- [x] Download, parse and render the actual synthetic PDF with references and limitations.
- [x] Exercise explicit approval, simulated receipt, audit readback and stale-packet refusal.
- [x] Verify missing-proof and contradictory cases block defense without automatic refunds or fraud accusations.
- [x] Check credential/error paths, keyboard interaction, mobile layout, page errors and accessibility in the recorded test runs.

## 4. Public MIT repository — published and anonymously verified

**Published:** https://github.com/Akakakjss/shieldpay — public source verified anonymously; GitHub detects the MIT license. A fresh public clone passed documented install/tests/build. No private configuration was included.

- [x] Inspect source/history and staged changes. Secret scanning found no staged findings; known private project credentials were absent from the96 tracked history blobs checked. No .env/runtime data was included.
- [x] Publish the authorized repository with source, lockfiles, required assets, README and MIT license; verify GitHub license detection.[1]
- [x] Read public metadata/README anonymously and verify the intended revision and license.
- [x] Clone the public URL into a clean directory and run README installation/tests/build without private keys. Real-model tests reused an available model cache.
- [x] Update submission materials only after publication/readback; keep secrets private.

## 5. Functional access: choose the local route, optionally add hosting

- [x] Use the verified public repo and local run instructions as the functional-access route; no hosted app is claimed.[1]
- [ ] If a hosted demo is later authorized, deploy synthetic mode only, with no PayPal credentials. Verify the actual URL, cold start, ONNX memory/download behavior, PDF and safe reset before adding it to submission fields. A `render.yaml` file is not deployment evidence.
- [ ] Keep code, model/dependency access and any demo or required test access free and unrestricted through **December 15, 2026, 8:00 a.m. Pacific**, the end of judging. Do not rely on a trial that expires beforehand.[1]

## 6. Video and truthful presentation — entrant

**Entrant will use their own video.** The assistant's160-second local draft is optional reference material, not the final submission video. The entrant's recording and public YouTube URL have not been provided or verified.

- [x] Record actual ONNX/citations, downloaded/rendered PDF, explicit approval, simulated receipt, blocked/contradictory cases and sanitized actual read-only sandbox proof.
- [ ] Keep the synthetic label and limitations visible. Do not describe mock-transport tests as real sandbox calls, semantic embeddings as generative reasoning or a simulated receipt as evidence sent to PayPal.
- [ ] Time the actual export below three minutes, including cards. Check readable UI/PDF, audible narration and permissions for all music/logos/material.[1]
- [ ] Upload to YouTube as publicly visible and verify playback logged out; insert the exact URL in Devpost fields and `SUBMISSION.md`. Do not substitute an uncreated URL or a private file.
- [ ] Keep AG Grid Community in the stack; do not claim AG Studio, Studio Agent Framework or PayPal Agent Toolkit. The formal AG Grid prize accepts any AG Grid tools, but its sponsor brief emphasizes more than a plain grid.[1][11]
- [ ] Remove unsupported metrics, customer-validation language and feature claims that did not ship. The importer has actual-HTTP/browser evidence; evidence upload to PayPal still does not.

## 7. Final human submission — entrant only

- [ ] Replace every outstanding required link with a verified real link; keep hosted demo as “none/local instructions” if not deployed.
- [ ] Reconcile text, screenshots and video with the same final revision and current integration status; confirm no claim of actual customer validation.
- [ ] Understand prize limits: at most **one Grand OR one Honorable Mention, plus one Sponsor Prize**; never assume a Grand + Honorable + sponsor stack.[1]
- [ ] Complete the required Devpost fields personally and submit before the deadline with a buffer. Publishing code or saving a draft is not entering the hackathon.[1]
- [ ] Read back the final submission/project page and confirmation; verify required links and access. Preserve confirmation without exposing private account information.

## Sources

[1] https://paypalaihackathon.devpost.com/rules — PayPal AI Hackathon Official Rules
[10] https://developer.paypal.com/docs/disputes/disputes-reference
[11] https://paypalaihackathon.devpost.com/details/aggrid
