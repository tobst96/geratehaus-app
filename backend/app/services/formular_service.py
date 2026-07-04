"""Businesslogik des Formular-Moduls: Formulare/Felder verwalten, Einreichungen
validieren + speichern und den formularspezifischen Empfänger per Mail informieren.
"""

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import zeit
from app.models.formular import Formular, FormularEinreichung, FormularFeld
from app.models.person import Person
from app.schemas.formular import (
    FormularCreate,
    FormularFeldCreate,
    FormularFeldUpdate,
    FormularUpdate,
)
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

logger = structlog.get_logger(__name__)


class EinreichungFehler(Exception):
    """Validierungsfehler einer Einreichung: {feld_id: Meldung}."""

    def __init__(self, fehler: dict[int, str]):
        self.fehler = fehler
        super().__init__("Einreichung ungültig")


# --- Formulare ---------------------------------------------------------------


async def liste_formulare(db: AsyncSession) -> list[Formular]:
    stmt = (
        select(Formular)
        .options(selectinload(Formular.felder))
        .order_by(Formular.reihenfolge, Formular.id)
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_formular(db: AsyncSession, formular_id: int) -> Formular | None:
    stmt = (
        select(Formular).options(selectinload(Formular.felder)).where(Formular.id == formular_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def formular_anlegen(db: AsyncSession, daten: FormularCreate) -> Formular:
    formular = Formular(**daten.model_dump())
    db.add(formular)
    await db.commit()
    geladen = await get_formular(db, formular.id)
    assert geladen is not None
    return geladen


async def formular_aktualisieren(
    db: AsyncSession, formular: Formular, daten: FormularUpdate
) -> Formular:
    for name, wert in daten.model_dump(exclude_unset=True).items():
        setattr(formular, name, wert)
    await db.commit()
    geladen = await get_formular(db, formular.id)
    assert geladen is not None
    return geladen


async def formular_loeschen(db: AsyncSession, formular: Formular) -> None:
    await db.delete(formular)
    await db.commit()


# --- Felder ------------------------------------------------------------------


async def get_feld(db: AsyncSession, feld_id: int) -> FormularFeld | None:
    return (
        await db.execute(select(FormularFeld).where(FormularFeld.id == feld_id))
    ).scalar_one_or_none()


async def feld_anlegen(
    db: AsyncSession, formular_id: int, daten: FormularFeldCreate
) -> FormularFeld:
    feld = FormularFeld(formular_id=formular_id, **daten.model_dump())
    db.add(feld)
    await db.commit()
    await db.refresh(feld)
    return feld


async def feld_aktualisieren(
    db: AsyncSession, feld: FormularFeld, daten: FormularFeldUpdate
) -> FormularFeld:
    for name, wert in daten.model_dump(exclude_unset=True).items():
        setattr(feld, name, wert)
    await db.commit()
    await db.refresh(feld)
    return feld


async def feld_loeschen(db: AsyncSession, feld: FormularFeld) -> None:
    await db.delete(feld)
    await db.commit()


# --- Öffentlicher Zugriff ----------------------------------------------------


async def liste_zugaengliche_formulare(db: AsyncSession) -> list[Formular]:
    """Aktive Formulare für die öffentliche/Mitglieder-Liste."""
    stmt = (
        select(Formular)
        .options(selectinload(Formular.felder))
        .where(Formular.aktiv.is_(True))
        .order_by(Formular.reihenfolge, Formular.id)
    )
    return list((await db.execute(stmt)).scalars().all())


# --- Einreichungen -----------------------------------------------------------


def _ist_leer(raw: object) -> bool:
    return (
        raw is None
        or (isinstance(raw, str) and raw.strip() == "")
        or (isinstance(raw, list) and len(raw) == 0)
    )


def _validiere_feld(feld: FormularFeld, raw: object, fehler: dict[int, str]) -> object:
    """Validiert einen Feldwert und gibt den normalisierten Wert zurück. Fehler
    werden in `fehler` gesammelt (keine Exception hier)."""
    if feld.typ == "checkbox":
        wert = bool(raw)
        if feld.pflicht and not wert:
            fehler[feld.id] = "Dieses Feld muss angehakt sein."
        return wert

    if _ist_leer(raw):
        if feld.pflicht:
            fehler[feld.id] = "Dieses Pflichtfeld muss ausgefüllt werden."
        return None

    if feld.typ in ("text", "mehrzeilig"):
        return str(raw)

    if feld.typ == "sterne":
        try:
            n = int(raw)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            fehler[feld.id] = "Ungültige Bewertung."
            return None
        if n < 1 or n > feld.max_sterne:
            fehler[feld.id] = f"Bewertung muss zwischen 1 und {feld.max_sterne} liegen."
            return None
        return n

    if feld.typ == "dropdown":
        s = str(raw)
        if s not in feld.optionen:
            fehler[feld.id] = "Ungültige Auswahl."
            return None
        return s

    if feld.typ == "dropdown_mehrfach":
        if not isinstance(raw, list):
            fehler[feld.id] = "Ungültige Auswahl."
            return None
        werte = [str(x) for x in raw]
        if any(x not in feld.optionen for x in werte):
            fehler[feld.id] = "Ungültige Auswahl."
            return None
        return werte

    return raw


async def einreichung_speichern(
    db: AsyncSession,
    formular: Formular,
    antworten: dict[str, object],
    person: Person | None,
    ip: str | None,
) -> FormularEinreichung:
    """Validiert die Antworten, speichert einen Snapshot und benachrichtigt den
    hinterlegten E-Mail-Empfänger. Wirft EinreichungFehler bei Validierungsfehlern."""
    fehler: dict[int, str] = {}
    snapshot: list[dict] = []
    for feld in sorted((f for f in formular.felder if f.aktiv), key=lambda f: f.reihenfolge):
        raw = antworten.get(str(feld.id))
        wert = _validiere_feld(feld, raw, fehler)
        snapshot.append({"feld_id": feld.id, "label": feld.label, "typ": feld.typ, "wert": wert})

    if fehler:
        raise EinreichungFehler(fehler)

    einreichung = FormularEinreichung(
        formular_id=formular.id,
        person_id=person.id if person else None,
        antworten=snapshot,
        ip=ip,
    )
    db.add(einreichung)
    await db.commit()
    await db.refresh(einreichung)

    await _benachrichtige_empfaenger(db, formular, einreichung)
    return einreichung


def _wert_text(typ: str, wert: object) -> str:
    if typ == "checkbox":
        return "Ja" if wert else "Nein"
    if typ == "dropdown_mehrfach" and isinstance(wert, list):
        return ", ".join(str(x) for x in wert)
    if wert is None or wert == "":
        return "–"
    return str(wert)


async def _benachrichtige_empfaenger(
    db: AsyncSession, formular: Formular, einreichung: FormularEinreichung
) -> None:
    """Informiert den formularspezifischen Empfänger per Mail (best effort)."""
    if not formular.email_empfaenger:
        return
    if not await config_service.get(db, "notifier_email_aktiv", False):
        return
    try:
        lokal = einreichung.erstellt_am.astimezone(await zeit.zeitzone(db))
        basis = str(await config_service.get(db, "oeffentliche_basis_url", "")).rstrip("/")
        zeilen = [
            f"{a['label']}: {_wert_text(a['typ'], a['wert'])}" for a in einreichung.antworten
        ]
        nachricht = (
            f"Es ist eine neue Einreichung für das Formular {formular.name} eingegangen.\n"
            f"Zeitpunkt: {lokal:%d.%m.%Y %H:%M} Uhr\n\n"
            + "\n".join(zeilen)
            + (f"\n\nIm System ansehen: {basis}/moderator/module/formular" if basis else "")
        )
        await EmailNotifier().send_an(
            db, formular.email_empfaenger, f"Neue Formular-Einreichung: {formular.name}", nachricht
        )
    except Exception:  # noqa: BLE001
        logger.warning("formular_benachrichtigung_fehlgeschlagen", formular_id=formular.id, exc_info=True)


async def einreichungen_fuer(db: AsyncSession, formular_id: int) -> list[FormularEinreichung]:
    stmt = (
        select(FormularEinreichung)
        .options(selectinload(FormularEinreichung.person))
        .where(FormularEinreichung.formular_id == formular_id)
        .order_by(FormularEinreichung.erstellt_am.desc())
    )
    return list((await db.execute(stmt)).scalars().all())
