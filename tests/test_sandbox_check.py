"""Read-only sandbox connection proof; mock transport tests are NOT real proof."""
import importlib.util
from pathlib import Path
from backend.config import Settings


def load_checker():
    path = Path(__file__).resolve().parents[1] / "scripts" / "check_sandbox.py"
    assert path.is_file(), "Read-only sandbox checker not implemented"
    spec = importlib.util.spec_from_file_location("sandbox_checker", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_missing_credentials_are_a_blocker_not_a_success():
    checker = load_checker()
    result = checker.check_connection(Settings(mode="sandbox", ai="lexical"))
    assert result["status"] == "blocked"
    assert result["network_tested"] is False
    assert result["oauth_and_disputes_verified"] is False
    assert result["remote_writes_sent"] == 0


def test_configured_check_uses_oauth_and_read_only_disputes_without_leaking_data():
    import httpx
    from backend.paypal import PayPal
    checker = load_checker()
    settings = Settings(mode="sandbox", ai="lexical", paypal_client_id="client-test", paypal_client_secret="secret-test")
    calls = []

    def respond(request):
        calls.append((request.method, request.url.path))
        assert request.url.host == "api-m.sandbox.paypal.com"
        if request.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "private-token-test", "expires_in": 300})
        assert request.method == "GET"
        return httpx.Response(200, json={"items": [], "links": []})

    with httpx.Client(transport=httpx.MockTransport(respond)) as transport:
        result = checker.check_connection(settings, PayPal(settings, transport))
    assert result["status"] == "verified_reads"
    assert result["oauth_and_disputes_verified"] is True
    assert result["disputes_seen"] == 0
    assert result["remote_writes_sent"] == 0
    assert calls == [("POST", "/v1/oauth2/token"), ("GET", "/v1/customer/disputes")]
    assert all(value not in str(result) for value in ["client-test", "secret-test", "private-token-test"])


def test_failed_network_is_reported_without_fake_success_or_secrets():
    import httpx
    from backend.paypal import PayPal
    checker = load_checker()
    settings = Settings(mode="sandbox", paypal_client_id="client-test", paypal_client_secret="secret-test")
    with httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(401, text="secret-test"))) as transport:
        result = checker.check_connection(settings, PayPal(settings, transport))
    assert result["status"] == "failed"
    assert result["network_tested"] is True
    assert result["oauth_and_disputes_verified"] is False
    assert result["remote_writes_sent"] == 0
    assert "secret-test" not in str(result)


def test_demo_mode_never_contacts_paypal_even_with_credentials():
    checker = load_checker()
    settings = Settings(mode="demo", paypal_client_id="client-test", paypal_client_secret="secret-test")
    result = checker.check_connection(settings)
    assert result["status"] == "blocked"
    assert result["network_tested"] is False
