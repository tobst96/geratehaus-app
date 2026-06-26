"""Einfacher In-Memory-Ratenbegrenzer pro Client-IP.

Reicht für eine Single-Process-Instanz (kein Redis/Multi-Worker-Setup hier).
Schützt vor allem die öffentlich erreichbaren Token-/PIN-Endpunkte (Barcode-
Auflösung, Reservierungs-Vorschau/-Einlösung) vor Brute-Force, seit die App
nicht mehr nur im geschlossenen Gerätehaus-Netz, sondern auch öffentlich über
den Mitglieder-Login erreichbar ist."""

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

_AUFRUFE: dict[str, list[float]] = defaultdict(list)


def rate_limit(max_aufrufe: int, fenster_sekunden: int):
    """Dependency-Factory: erlaubt maximal `max_aufrufe` Aufrufe pro Client-IP
    innerhalb von `fenster_sekunden`, gruppiert nach Endpunkt-Namen (über den
    Funktionsnamen des Aufrufers im Schlüssel, damit verschiedene Endpunkte
    sich nicht gegenseitig blockieren)."""

    async def _check(request: Request) -> None:
        client_ip = request.client.host if request.client else "unbekannt"
        schluessel = f"{request.url.path}:{client_ip}"
        jetzt = time.monotonic()
        verlauf = _AUFRUFE[schluessel]
        verlauf[:] = [t for t in verlauf if jetzt - t < fenster_sekunden]
        if len(verlauf) >= max_aufrufe:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Zu viele Versuche. Bitte kurz warten und erneut versuchen.",
            )
        verlauf.append(jetzt)

    return _check
