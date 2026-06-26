from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse

from app.api.deps import DbSession
from app.core.rate_limit import rate_limit
from app.services import buchung_aktion_service, email_template_service

router = APIRouter(prefix="/buchungen-aktion", tags=["buchungen-aktion"])


async def _ergebnis_seite(db: DbSession, betreff: str, text: str, status_code: int = 200) -> HTMLResponse:
    html = await email_template_service.render_html(db, betreff, text)
    return HTMLResponse(content=html, status_code=status_code)


@router.get("/{token}/genehmigen", dependencies=[Depends(rate_limit(20, 60))])
async def per_mail_genehmigen(db: DbSession, token: str) -> HTMLResponse:
    return await _aktion_ausfuehren(db, token, "genehmigen")


@router.get("/{token}/ablehnen", dependencies=[Depends(rate_limit(20, 60))])
async def per_mail_ablehnen(db: DbSession, token: str) -> HTMLResponse:
    return await _aktion_ausfuehren(db, token, "ablehnen")


async def _aktion_ausfuehren(db: DbSession, token: str, aktion: str) -> HTMLResponse:
    aktion_token = await buchung_aktion_service.get_by_token(db, token)
    if aktion_token is None:
        return await _ergebnis_seite(
            db, "Link ungültig", "Dieser Link ist nicht (mehr) gültig.", status_code=404
        )
    if buchung_aktion_service.ist_abgelaufen(aktion_token):
        return await _ergebnis_seite(
            db,
            "Link abgelaufen",
            "Dieser Link ist abgelaufen. Bitte die Buchung im Moderator-Bereich entscheiden.",
            status_code=410,
        )

    try:
        _buchung, hinweis = await buchung_aktion_service.einloesen(db, aktion_token, aktion)
    except ValueError as exc:
        return await _ergebnis_seite(db, "Fehler", str(exc), status_code=404)

    betreff = "Buchung angenommen" if aktion == "genehmigen" else "Buchung abgelehnt"
    return await _ergebnis_seite(db, betreff, hinweis)
