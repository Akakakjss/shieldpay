# Security and prototype boundaries

ShieldPay is a hackathon prototype, not production financial software or legal advice.

- Default mode uses **synthetic records**, makes no PayPal network mutations, and labels simulated receipts.
- Only the PayPal **sandbox** origin is supported. Never add production credentials.
- No real customer data belongs in the public demo. Demo reset and local approvals are intentionally available for synthetic data.
- Sensitive sandbox reads and mutations require a server-configured admin token. Keep it private; the browser must not store it in localStorage. Use a separate localhost-only sandbox instance, not the public judge demo.
- Evidence text is untrusted data, not executable instructions. Exact quotes, order scoping, source hashes and human approval protect the packet boundary; embeddings rank relevance, not truth.
- A source hash detects changes to recorded text. It does **not** establish external authenticity, prove delivery, or predict a dispute decision.
- SQLite is a single-instance prototype store. Production needs tenant isolation, full identity/RBAC, retention/consent controls, encryption, background jobs and concurrency/load review.
- Do not expose sandbox mode publicly. Structured human-provided test evidence import is implemented and remains unverified provenance. Production webhooks, authenticated carrier/email connectors and automatic refunds are not implemented.
- Duplicate fields and multi-transaction disputes fail closed. Unresolved submissions block source replacement and new attempts. The PDF explicitly rejects unsupported character repertoires, including CJK/emoji, rather than silently changing the evidence.
- Never commit `.env`, access tokens, database files, private evidence, model cache or test accounts to this repository.

Report a vulnerability privately to the repository owner rather than posting credentials or personal data in a public issue.
