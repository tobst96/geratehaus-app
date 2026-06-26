import pytest

from app.core.rate_limit import _AUFRUFE, rate_limit


async def test_security_headers_gesetzt(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"


async def test_rate_limit_blockiert_nach_max_aufrufen():
    _AUFRUFE.clear()

    class FakeClient:
        host = "1.2.3.4"

    class FakeUrl:
        path = "/test-pfad"

    class FakeRequest:
        client = FakeClient()
        url = FakeUrl()

    check = rate_limit(3, 60)
    request = FakeRequest()

    for _ in range(3):
        await check(request)  # darf nicht werfen

    with pytest.raises(Exception) as exc_info:
        await check(request)
    assert "429" in str(exc_info.value) or "Zu viele" in str(exc_info.value)


async def test_rate_limit_trennt_nach_ip():
    _AUFRUFE.clear()

    class FakeUrl:
        path = "/test-pfad-2"

    def request_fuer_ip(ip: str):
        class FakeClient:
            host = ip

        class FakeRequest:
            client = FakeClient()
            url = FakeUrl()

        return FakeRequest()

    check = rate_limit(1, 60)
    await check(request_fuer_ip("1.1.1.1"))
    # Andere IP ist von der ersten unabhängig und darf noch einmal anfragen.
    await check(request_fuer_ip("2.2.2.2"))

    with pytest.raises(Exception):
        await check(request_fuer_ip("1.1.1.1"))
