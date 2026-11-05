"""Sandbox-only HTTP adapter. Never infer permission from a local approval.

Reference: developer.paypal.com/api/customer-disputes/v1/disputes-provide-evidence
and developer.paypal.com/disputes/reasons-evidence . No live base URL option.
"""
import json
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, parse_qs
import httpx

BASE = "https://api-m.sandbox.paypal.com"
DOCUMENT_NAME = "shieldpay-evidence.pdf"


class PayPalError(Exception):
    def __init__(self, detail, status_code=502):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class PayPal:
    def __init__(self, settings, client=None):
        self.settings = settings
        self.client = client or httpx.Client(timeout=20, follow_redirects=False, trust_env=False)
        self._owns_client = client is None
        self._token = None
        self._expires = 0
        self._lock = threading.Lock()

    def close(self):
        if self._owns_client:
            self.client.close()

    def _check(self):
        if self.settings.mode != "sandbox":
            raise PayPalError("PayPal network access is disabled in demo mode", 409)
        if not self.settings.paypal_configured:
            raise PayPalError("Sandbox credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET; enable Disputes in App features.", 503)

    def _id(self, dispute_id):
        # Never repair malformed IDs or send synthetic IDs to PayPal.
        if not isinstance(dispute_id, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,255}", dispute_id) or not dispute_id.startswith("PP-"):
            raise PayPalError("Expected an exact PP- sandbox dispute ID; synthetic or malformed IDs are forbidden", 409)
        return dispute_id

    def _request(self, method, url, **kwargs):
        self._check()
        if not str(url).startswith(BASE + "/"):
            raise PayPalError("Non-sandbox request blocked", 409)
        try:
            response = self.client.request(method, url, follow_redirects=False, timeout=20, **kwargs)
        except httpx.HTTPError as exc:
            raise PayPalError("Sandbox network operation failed; credentials and remote error bodies are not logged", 502) from exc
        if not 200 <= response.status_code < 300:
            raise PayPalError(f"PayPal sandbox returned HTTP {response.status_code}. Check app Disputes permissions and dispute eligibility.", 502)
        return response

    def _headers(self):
        self._check()
        with self._lock:
            if not self._token or time.monotonic() >= self._expires:
                response = self._request("POST", BASE + "/v1/oauth2/token",
                                         auth=(self.settings.paypal_client_id, self.settings.paypal_client_secret),
                                         data={"grant_type": "client_credentials"}, headers={"Accept": "application/json"})
                token = self._json(response)
                if not isinstance(token.get("access_token"), str) or not token["access_token"]:
                    raise PayPalError("Sandbox OAuth response did not contain an access token")
                self._token = token["access_token"]
                try:
                    ttl = float(token.get("expires_in", 300))
                except (ValueError, TypeError):
                    ttl = 300
                self._expires = time.monotonic() + max(1, min(ttl, 28800) - 30)
        return {"Authorization": "Bearer " + self._token, "Accept": "application/json"}

    def _json(self, response):
        try:
            value = response.json()
        except (ValueError, TypeError) as exc:
            raise PayPalError("Sandbox returned an invalid JSON response") from exc
        if not isinstance(value, dict):
            raise PayPalError("Sandbox returned an unexpected JSON response")
        return value

    def get_dispute(self, dispute_id):
        self._id(dispute_id)
        detail = self._json(self._request("GET", BASE + "/v1/customer/disputes/" + dispute_id, headers=self._headers()))
        if detail.get("dispute_id") != dispute_id:
            raise PayPalError("Exact dispute ID did not match the sandbox readback", 409)
        return detail

    def list_disputes(self):
        since = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        url = str(httpx.URL(BASE + "/v1/customer/disputes", params={"page_size": "50", "start_time": since}))
        seen_urls, ids = set(), set()
        details = []
        for _ in range(100):
            parts = urlsplit(url)
            if (parts.scheme != "https" or parts.netloc != "api-m.sandbox.paypal.com" or
                    parts.path != "/v1/customer/disputes" or parts.fragment or
                    set(parse_qs(parts.query)) - {"page_size", "start_time", "next_page_token"}):
                raise PayPalError("Unsafe sandbox pagination link blocked", 409)
            if url in seen_urls:
                raise PayPalError("Sandbox pagination loop detected; incomplete import was not saved")
            seen_urls.add(url)
            page = self._json(self._request("GET", url, headers=self._headers()))
            if not isinstance(page.get("items", []), list):
                raise PayPalError("Sandbox list response contained invalid items")
            for item in page.get("items", []):
                dispute_id = self._id(item.get("dispute_id") if isinstance(item, dict) else None)
                if dispute_id not in ids:
                    ids.add(dispute_id)
                    details.append(self.get_dispute(dispute_id))
            next_links = [link for link in page.get("links", []) if isinstance(link, dict) and link.get("rel") == "next"]
            if not next_links:
                return details, since
            if len(next_links) != 1 or next_links[0].get("method", "GET").upper() != "GET" or not isinstance(next_links[0].get("href"), str):
                raise PayPalError("Invalid sandbox pagination action")
            url = next_links[0]["href"]
        raise PayPalError("Sandbox pagination exceeded safety limit; incomplete import was not saved")

    def allowed_evidence_url(self, dispute):
        dispute_id = self._id(dispute.get("dispute_id"))
        expected = BASE + "/v1/customer/disputes/" + dispute_id + "/provide-evidence"
        if dispute.get("status") != "WAITING_FOR_SELLER_RESPONSE":
            raise PayPalError("Sandbox dispute is not WAITING_FOR_SELLER_RESPONSE; no evidence write was sent", 409)
        links = [link for link in dispute.get("links", []) if isinstance(link, dict) and link.get("rel") == "provide-evidence"]
        if len(links) != 1 or links[0].get("href") != expected or links[0].get("method", "").upper() != "POST":
            raise PayPalError("A safe, exact sandbox provide-evidence POST HATEOAS link is required; no evidence write was sent", 409)
        requested = [e.get("evidence_type") for e in dispute.get("evidences", []) if isinstance(e, dict) and e.get("source") == "REQUESTED_FROM_SELLER"]
        if any(t not in {"PROOF_OF_FULFILLMENT"} for t in requested):
            raise PayPalError("This prototype cannot satisfy every evidence type requested by PayPal; review in Resolution Center", 409)
        return expected

    def provide_evidence(self, dispute_id, pdf, notes, request_id, expected_case=None):
        self._id(dispute_id)
        if not isinstance(notes, str) or not 1 <= len(notes) <= 2000:
            raise PayPalError("Evidence notes must contain 1 to 2000 characters", 422)
        if not pdf.startswith(b"%PDF-") or len(pdf) >= 10_000_000:
            raise PayPalError("Evidence must be a PDF smaller than 10 MB", 422)
        if not re.fullmatch(r"[A-Za-z0-9-]{1,108}", request_id):
            raise PayPalError("Invalid request ID", 422)
        before = self.get_dispute(dispute_id)
        url = self.allowed_evidence_url(before)
        if expected_case is not None:
            from backend.sync import map_dispute
            current = map_dispute(before)
            for key in ["reason", "status", "amount", "currency", "response_due", "order_id"]:
                if current.get(key) != expected_case.get(key):
                    raise PayPalError("Sandbox dispute changed since packet approval; sync and review a new packet. No evidence write was sent.", 409)
        if expected_case is not None:
            from backend.evidence_payload import build_evidence_payload
            try:
                payload = build_evidence_payload(expected_case, notes)
            except ValueError as exc:
                raise PayPalError("Evidence payload invalid: " + str(exc) + "; no evidence write was sent", 409) from exc
        else:
            payload = {"evidences": [{"evidence_type": "PROOF_OF_FULFILLMENT", "notes": notes,
                                      "documents": [{"name": DOCUMENT_NAME}]}]}
        files = [("input", (None, json.dumps(payload), "application/json")),
                 ("evidence-file", (DOCUMENT_NAME, pdf, "application/pdf"))]
        headers = {**self._headers(), "PayPal-Request-Id": request_id}
        try:
            response = self._request("POST", url, headers=headers, files=files)
        except PayPalError as exc:
            # A transport failure/5xx after dispatch may have applied the write. Never retry automatically.
            return dict(status="uncertain", receipt="SANDBOX-" + request_id, verified=False,
                        detail=exc.detail + " Submission outcome is uncertain; reconcile this exact dispute before retrying.")
        receipt = response.headers.get("paypal-debug-id") or "SANDBOX-" + request_id
        try:
            after = self.get_dispute(dispute_id)
        except PayPalError:
            return dict(status="accepted", receipt=receipt, verified=False,
                        detail="PayPal accepted the evidence request, but exact-dispute readback failed. No outcome is verified; reconcile in Resolution Center.")
        old = before.get("evidences", [])
        matched = any(isinstance(e, dict) and e not in old and e.get("source") == "SUBMITTED_BY_SELLER" and
                      e.get("evidence_type") == "PROOF_OF_FULFILLMENT" and e.get("notes") == notes and
                      any(d.get("name") == DOCUMENT_NAME for d in e.get("documents", []) if isinstance(d, dict))
                      for e in after.get("evidences", []))
        return dict(status="verified" if matched else "accepted", receipt=receipt, verified=matched,
                    detail="Exact dispute readback contains the newly submitted packet marker and document name; this does not verify remote PDF bytes or adjudication." if matched else
                    "PayPal accepted the request but readback does not yet show a new matching packet marker and document. Submission is not verified; no win or hold-release claim.")
