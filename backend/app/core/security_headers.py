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
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), payment=()"
        return response
