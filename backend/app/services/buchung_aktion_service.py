import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.buchung import FahrzeugBuchung
from app.models.buchung_aktion_token import BuchungAktionToken

GUELTIGKEIT_TAGE = 14


async def token_erstellen(db: AsyncSession, buchung_id: int) -> BuchungAktionToken:
    jetzt = datetime.now(timezone.utc)
    token = BuchungAktionToken(
        buchung_id=buchung_id,
        token=secrets.token_urlsafe(24),
        erstellt_am=jetzt,
        ablauf_am=jetzt + timedelta(days=GUELTIGKEIT_TAGE),
        eingeloest=False,
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return token


async def get_by_token(db: AsyncSession, token: str) -> BuchungAktionToken | None:
    result = await db.execute(select(BuchungAktionToken).where(BuchungAktionToken.token == token))
    return result.scalar_one_or_none()


def ist_abgelaufen(token: BuchungAktionToken) -> bool:
    ablauf = token.ablauf_am
    if ablauf.tzinfo is None:
        ablauf = ablauf.replace(tzinfo=timezone.utc)
    return ablauf < datetime.now(timezone.utc)


async def einloesen(
    db: AsyncSession, token: BuchungAktionToken, aktion: str
) -> tuple[FahrzeugBuchung, str]:
    """Wendet die Aktion an, sofern die Buchung noch "ausstehend" ist – sonst
    (z. B. schon per Login entschieden, oder zweiter Klick auf den anderen
    Button) wird der aktuelle Status unverändert zurückgegeben, ohne Fehler.
    Gibt (buchung, hinweis) zurück, hinweis erklärt dem Moderator ggf., warum
    sich nichts (mehr) geändert hat."""
    from app.services import buchung_service  # lokal, um Zirkelimport zu vermeiden

    buchung = await buchung_service.get_buchung(db, token.buchung_id)
    if buchung is None:
        raise ValueError("Buchung nicht gefunden.")

    if buchung.status != "ausstehend":
        return buchung, (
            f"Diese Buchung wurde bereits entschieden (Status: {buchung.status}). "
            "Es wurde nichts geändert."
        )

    if aktion == "genehmigen":
        buchung = await buchung_service.genehmigen(db, buchung)
        hinweis = "Die Buchung wurde angenommen."
    else:
        buchung = await buchung_service.ablehnen(db, buchung, "Per Mail-Link abgelehnt")
        hinweis = "Die Buchung wurde abgelehnt."

    token.eingeloest = True
    await db.commit()
    return buchung, hinweis
