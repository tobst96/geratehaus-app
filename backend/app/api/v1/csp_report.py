import structlog
from fastapi import APIRouter, Depends, Request, status

from app.core.rate_limit import rate_limit

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["csp"])

# In-Memory-Dedup, damit identische Verstöße (jeder Seitenaufruf!) die Logs nicht
# fluten. Bewusst prozesslokal und begrenzt – reicht für die Auswertungsphase.
_gesehen: set[str] = set()
_MAX_GESEHEN = 500


@router.post(
    "/csp-report",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit(60, 60))],
)
async def csp_report(request: Request) -> None:
    """Nimmt CSP-Verstoßmeldungen des Browsers entgegen (Report-Only-Phase) und
    protokolliert **distinkte** Verstöße. So lässt sich vor dem Scharfschalten der
    CSP sehen, was blockiert würde (z. B. ein externes Logo). Bewusst öffentlich
    (der Browser sendet ohne Auth) und ratenbegrenzt."""
    try:
        daten = await request.json()
    except Exception:
        return
    bericht = daten.get("csp-report", daten) if isinstance(daten, dict) else {}
    directive = str(bericht.get("violated-directive") or bericht.get("effective-directive") or "?")
    blocked = str(bericht.get("blocked-uri") or "?")

    schluessel = f"{directive}|{blocked}"
    if schluessel in _gesehen:
        return
    if len(_gesehen) < _MAX_GESEHEN:
        _gesehen.add(schluessel)
    # INFO-Level → landet in den Logs (und als Sentry-Breadcrumb), aber erzeugt
    # kein Sentry-Issue (Rauschvermeidung).
    logger.info("csp_verstoss", directive=directive, blocked_uri=blocked)
