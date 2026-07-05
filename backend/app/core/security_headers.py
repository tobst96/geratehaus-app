from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Setzt Standard-Sicherheitsheader auf jede Antwort. Bewusst ohne
    Strict-Transport-Security: TLS terminiert außerhalb dieses Containers
    (Reverse-Proxy vor fw.tobiobst.de), die App selbst kennt das Schema des
    ursprünglichen Requests nicht zuverlässig (uvicorn läuft ohne
    --proxy-headers) und darf daher keine HSTS-Entscheidung treffen."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Nicht genutzte, sensible Browser-Features abschalten. `camera` bleibt bewusst
        # ERLAUBT (Default self), weil der Barcode-Scanner die Kamera nutzt; Geolocation
        # wird im Frontend nicht verwendet und bleibt aus. `browsing-topics` opt-out.
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), payment=(), usb=(), serial=(), "
            "bluetooth=(), hid=(), magnetometer=(), accelerometer=(), gyroscope=(), "
            "browsing-topics=()"
        )
        # Fenster-Isolation gegen Cross-Origin-Zugriffe (die App öffnet keine
        # Cross-Origin-Popups und ist auf window.opener nicht angewiesen).
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        # Legacy-Cross-Domain-Policies (Flash/PDF) generell verbieten.
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        return response
