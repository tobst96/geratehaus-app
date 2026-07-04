from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import DbSession, require_modul_aktiv
from app.core.rate_limit import rate_limit
from app.models.person import Person
from app.schemas.formular import EinreichungCreate, FormularFeldOut, FormularOeffentlichOut
from app.services import formular_service
from app.services.formular_service import EinreichungFehler

router = APIRouter(
    prefix="/formulare",
    tags=["formular"],
    dependencies=[Depends(require_modul_aktiv("modul_formular_aktiv"))],
)


async def optionale_person(
    db: DbSession, geraetehaus_name: Annotated[str | None, Cookie()] = None
) -> Person | None:
    """Person aus dem Namens-Cookie – ohne Fehler, wenn keine angemeldet ist."""
    if not geraetehaus_name:
        return None
    return (
        await db.execute(select(Person).where(Person.name == geraetehaus_name))
    ).scalar_one_or_none()


def _client_ip(request: Request) -> str | None:
    weitergeleitet = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for")
    if weitergeleitet:
        return weitergeleitet.split(",")[0].strip()
    return request.client.host if request.client else None


def _oeffentlich(formular) -> FormularOeffentlichOut:
    return FormularOeffentlichOut(
        id=formular.id,
        name=formular.name,
        beschreibung=formular.beschreibung,
        login_erforderlich=formular.login_erforderlich,
        felder=[FormularFeldOut.model_validate(f) for f in formular.felder if f.aktiv],
    )


@router.get("", response_model=list[FormularOeffentlichOut])
async def formulare_liste(db: DbSession) -> list[FormularOeffentlichOut]:
    formulare = await formular_service.liste_zugaengliche_formulare(db)
    return [_oeffentlich(f) for f in formulare]


@router.get("/{formular_id}", response_model=FormularOeffentlichOut)
async def formular_detail(db: DbSession, formular_id: int) -> FormularOeffentlichOut:
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None or not formular.aktiv or formular_service.ist_abgelaufen(formular):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dieses Formular ist nicht (mehr) verfügbar."
        )
    return _oeffentlich(formular)


@router.post(
    "/{formular_id}/einreichen",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(20, 60))],
)
async def formular_einreichen(
    db: DbSession,
    request: Request,
    formular_id: int,
    daten: EinreichungCreate,
    person: Annotated[Person | None, Depends(optionale_person)],
) -> dict:
    formular = await formular_service.get_formular(db, formular_id)
    if formular is None or not formular.aktiv or formular_service.ist_abgelaufen(formular):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dieses Formular ist nicht (mehr) verfügbar."
        )

    if formular.login_erforderlich and person is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Für dieses Formular ist eine Anmeldung erforderlich.",
        )

    try:
        einreichung = await formular_service.einreichung_speichern(
            db, formular, daten.antworten, person, _client_ip(request)
        )
    except EinreichungFehler as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"felder": {str(k): v for k, v in exc.fehler.items()}},
        ) from exc

    return {"ok": True, "einreichung_id": einreichung.id}
