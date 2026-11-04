# ShieldPay: paste-ready Devpost copy

This is prepared submission text, not a saved or submitted Devpost entry. Use your own video. Add its verified public YouTube URL before submitting. Confirm eligibility, team details, rights and hackathon registration yourself.

## Project name

ShieldPay

## Tagline

Review PayPal dispute evidence, build a cited response, and stop when the facts don't support it.

## Inspiration

Merchant forum posts described tracking mistakes, short response windows, and the work of pulling a dispute response together from records spread across different systems. One merchant described a package that arrived after incorrect tracking had already complicated the case.[4]

I wanted to make that review easier to follow. A merchant should be able to see what supports a response, what is missing, and when the record is too weak or contradictory to proceed. I chose that problem over a generic AI invoice assistant because it gave the project a specific audience and a concrete task to demonstrate.

These posts are research leads, not customer validation. I haven't interviewed merchants or measured recovery outcomes.

## What it does

ShieldPay is a browser-based workspace for reviewing PayPal dispute evidence. A merchant selects a case, analyzes the records for that order, inspects the quoted source text, and downloads a PDF response packet.

The supported demo case has matching order and delivery records. Other cases deliberately fail: a shipment that is still in transit blocks a defense, and a conflicting buyer report goes to human refund review. The app does not issue refunds.

The operator must approve the reviewed packet before the submission step. That approval belongs to one revision; replacing the evidence invalidates the old review. The demo receipt explicitly says the submission is simulated. An audit trail records the steps.

A protected import screen accepts structured sandbox records. It labels them as unverified human-provided evidence rather than treating an upload as proof of authenticity.

## How I built it

React and AG Grid Community handle the queue and review interface. FastAPI handles the API, SQLite stores the records and audit events, and ReportLab builds the PDF.

The AI runs locally. FastEmbed uses the BAAI/bge-small-en-v1.5 model through ONNX Runtime to rank relevant records within a single order. The model does not write evidence or decide liability. Code checks the exact quotations, source hashes, tracking consistency, supported case state and response deadline. When the model is unavailable, the app labels its lexical fallback honestly.

PayPal's sandbox Disputes API is the external integration. Actual authentication and dispute-list reads succeeded with sandbox credentials. The account returned no disputes, so evidence upload and its remote readback have not been verified against PayPal. Those paths have mock-transport tests. The recorded submission workflow remains a labeled simulation.

Hermes Agent and GPT models assisted development and review. They are development tools, not the application's runtime AI provider.

## Challenges I ran into

Relevance and evidence are different things. A similar record from another order must not support the current case. A delivery scan must not hide a conflicting buyer message. I put order scoping and exact source quotations around those risks.

Review also exposed bugs that would have made the prototype unsafe to trust: duplicate fields could look like matching tracking, replacing records could race a submission, and an uncertain submission could be retried under a different packet hash. The fixes have regression tests. Authentication covers sensitive reads as well as actions, including deployment prefixes and delayed responses after the session is locked.

The PDF has a limited character repertoire. Unsupported characters produce an explicit error instead of disappearing from the reviewed document. Multi-transaction disputes are also rejected rather than partially analyzed.

## Accomplishments I'm proud of

The project produces something an operator can inspect: cited source text, an actual PDF, a reviewed revision, and an audit trail. It demonstrates the blocked cases as well as the successful review path.

The local suite passed 101 Python tests, including real ONNX inference, and 55 React tests. Browser checks exercised the main workflow and protected import against real local HTTP servers. A fresh clone of the public repository also installed, tested and built using the README instructions.

## What I learned

A useful assistant needs a clear stopping point. Better-sounding prose cannot fix a missing delivery record or a contradiction.

Existing products already automate disputes and prepare merchant-approved packages.[5][8][12] My claim is the implementation shown here: an inspectable local workflow with explicit source and action boundaries, not the invention of the category or a proven improvement in win rates.

## What's next

The next integration step is an authorized evidence upload using an appropriate sandbox-only dispute. After that, I want to observe how merchants assemble real responses using consented, redacted records. That would give me a basis for measuring preparation effort and deciding which connectors to build.

The current prototype does not determine full Seller Protection eligibility, authenticate carrier records, predict wins, or promise that funds will be released. It has no production deployment or measured customer outcomes.

## Links and access fields

- Source: https://github.com/Akakakjss/shieldpay
- License: MIT for original code; dependency/model licenses remain separate.
- Video: **ADD YOUR PUBLIC YOUTUBE URL. The assistant's local draft is not your submitted video.**
- Hosted app: none. Use the repository's complete local setup instructions; the rules permit this functional-access route.[1]
- Local workspace: your cloned `shieldpay` directory.
- Entrant/team names: enter your actual contributor information. Do not copy invented names from synthetic test records.

## Built with

PayPal Disputes REST API (sandbox), Python, FastAPI, React, Vite, AG Grid Community, SQLite, FastEmbed, ONNX Runtime, BAAI/bge-small-en-v1.5, ReportLab, GitHub, Hermes Agent, GPT-6.1 Sol, GPT-6.1 Terra.

Runtime AI: local ONNX embeddings. GPT/Hermes: development and review assistance. No AG Studio, Studio Agent Framework, PayPal Agent Toolkit or paid sponsor integration is claimed.

## Judge walkthrough

Prerequisites: Git, uv and Node.js LTS. Internet is needed for dependency installation and the first model download.

```text
git clone https://github.com/Akakakjss/shieldpay.git
cd shieldpay
python scripts/run.py
```

Open http://127.0.0.1:8787. The default synthetic workflow needs no PayPal credentials or paid AI key. Analyze 1042, inspect a citation, generate/download the PDF, explicitly approve it and simulate submission. Then analyze 1043 and 1044 to see the missing-proof and contradiction blocks.

For optional private sandbox checks, follow the separate README setup. Never publish test-account passwords, app secrets or the admin token.

## Optional YouTube upload text

Use this only if your recording shows the current workflow described above.

Title: **ShieldPay | PayPal + AI dispute evidence review demo**

Description:

```text
ShieldPay is a hackathon prototype that helps small PayPal merchants inspect dispute evidence, prepare a cited PDF and review a specific packet before responding.

Source and local run instructions:
https://github.com/Akakakjss/shieldpay

The demonstration uses synthetic records and simulated submission. Separate PayPal sandbox authentication and dispute-list reads have been verified; evidence upload remains unverified. The AI runs locally through ONNX Runtime. This project does not promise dispute wins, recovered money or Seller Protection eligibility.

Built for the PayPal AI Hackathon. Independent prototype, not endorsed by PayPal.
```

Upload your own video as public, verify it is under three minutes and check logged-out playback. Use `assets/cover.png` as an optional original thumbnail. Review your video's rights and claims before posting.

## Sources

[1] https://paypalaihackathon.devpost.com/rules — PayPal AI Hackathon Official Rules
[4] https://community.shopify.com/t/charge-back/417029
[5] https://www.chargeflow.io/integrations/paypal
[8] https://apps.shopify.com/synctrack
[12] https://apps.shopify.com/casesignal
