"""Businesslogik des Formular-Moduls: Formulare/Felder verwalten, Einreichungen
validieren + speichern und den formularspezifischen Empfänger per Mail informieren.
"""

from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import zeit
from app.models.formular import Formular, FormularEinreichung, FormularFeld
from app.models.person import Person
from app.schemas.formular import (
    FeldZusammenfassung,
    FormularCreate,
    FormularFeldCreate,
    FormularFeldUpdate,
    FormularUpdate,
    ZusammenfassungOut,
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


def ist_abgelaufen(formular: Formular) -> bool:
    if formular.ablauf_am is None:
        return False
    ablauf = formular.ablauf_am
    if ablauf.tzinfo is None:
        ablauf = ablauf.replace(tzinfo=timezone.utc)
    return ablauf <= datetime.now(timezone.utc)


async def liste_zugaengliche_formulare(db: AsyncSession) -> list[Formular]:
    """Aktive, noch nicht abgelaufene Formulare für die öffentliche/Mitglieder-Liste."""
    jetzt = datetime.now(timezone.utc)
    stmt = (
        select(Formular)
        .options(selectinload(Formular.felder))
        .where(
            Formular.aktiv.is_(True),
            (Formular.ablauf_am.is_(None)) | (Formular.ablauf_am > jetzt),
        )
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


# --- Zusammenfassung / Auswertung --------------------------------------------


def _leer(wert: object) -> bool:
    return wert is None or wert == "" or (isinstance(wert, list) and len(wert) == 0)


def _feld_zusammenfassung(feld: FormularFeld, werte: list[object]) -> FeldZusammenfassung:
    basis = {"feld_id": feld.id, "label": feld.label, "typ": feld.typ}

    if feld.typ == "sterne":
        zahlen = [w for w in werte if isinstance(w, int) and not isinstance(w, bool)]
        durchschnitt = round(sum(zahlen) / len(zahlen), 2) if zahlen else None
        verteilung = {str(n): sum(1 for z in zahlen if z == n) for n in range(1, feld.max_sterne + 1)}
        return FeldZusammenfassung(
            **basis, anzahl_beantwortet=len(zahlen), durchschnitt=durchschnitt, verteilung=verteilung
        )

    if feld.typ == "checkbox":
        ja = sum(1 for w in werte if w is True)
        return FeldZusammenfassung(
            **basis, anzahl_beantwortet=len(werte), verteilung={"Ja": ja, "Nein": len(werte) - ja}
        )

    if feld.typ in ("dropdown", "dropdown_mehrfach"):
        verteilung: dict[str, int] = {opt: 0 for opt in feld.optionen}
        beantwortet = 0
        for w in werte:
            if feld.typ == "dropdown":
                if _leer(w):
                    continue
                beantwortet += 1
                verteilung[str(w)] = verteilung.get(str(w), 0) + 1
            elif isinstance(w, list) and w:
                beantwortet += 1
                for x in w:
                    verteilung[str(x)] = verteilung.get(str(x), 0) + 1
        return FeldZusammenfassung(**basis, anzahl_beantwortet=beantwortet, verteilung=verteilung)

    # text / mehrzeilig
    texte = [str(w) for w in werte if not _leer(w)]
    return FeldZusammenfassung(**basis, anzahl_beantwortet=len(texte), texte=texte)


async def zusammenfassung(db: AsyncSession, formular: Formular) -> ZusammenfassungOut:
    """Aggregierte Auswertung über alle Einreichungen (Zwischenstand)."""
    einreichungen = await einreichungen_fuer(db, formular.id)
    felder_stats: list[FeldZusammenfassung] = []
    for feld in sorted((f for f in formular.felder if f.aktiv), key=lambda f: f.reihenfolge):
        werte: list[object] = []
        for e in einreichungen:
            for a in e.antworten:
                if a.get("feld_id") == feld.id:
                    werte.append(a.get("wert"))
                    break
        felder_stats.append(_feld_zusammenfassung(feld, werte))
    return ZusammenfassungOut(
        formular_id=formular.id,
        name=formular.name,
        anzahl_einreichungen=len(einreichungen),
        ablauf_am=formular.ablauf_am,
        felder=felder_stats,
    )


def _zusammenfassung_text(zus: ZusammenfassungOut) -> str:
    zeilen = [
        f"Auswertung des Formulars: {zus.name}",
        f"Anzahl Einreichungen: {zus.anzahl_einreichungen}",
        "",
    ]
    for f in zus.felder:
        zeilen.append(f"{f.label}:")
        if f.durchschnitt is not None:
            zeilen.append(f"  Durchschnitt: {f.durchschnitt}")
        if f.verteilung:
            for k, v in f.verteilung.items():
                zeilen.append(f"  {k}: {v}")
        if f.texte:
            for t in f.texte:
                zeilen.append(f"  - {t}")
        if f.durchschnitt is None and not f.verteilung and not f.texte:
            zeilen.append(f"  ({f.anzahl_beantwortet} Antworten)")
        zeilen.append("")
    return "\n".join(zeilen)


async def ablauf_zusammenfassungen_versenden(db: AsyncSession) -> int:
    """Hintergrund-Job: schickt für gerade abgelaufene Formulare einmalig eine
    Auswertung per Mail an den hinterlegten Empfänger. Gibt die Anzahl der
    versendeten Mails zurück."""
    jetzt = datetime.now(timezone.utc)
    stmt = (
        select(Formular)
        .options(selectinload(Formular.felder))
        .where(
            Formular.ablauf_am.is_not(None),
            Formular.ablauf_am <= jetzt,
            Formular.zusammenfassung_gesendet_am.is_(None),
        )
    )
    formulare = list((await db.execute(stmt)).scalars().all())
    email_aktiv = await config_service.get(db, "notifier_email_aktiv", False)
    gesendet = 0
    for formular in formulare:
        # Zuerst markieren, damit ein einmal abgelaufenes Formular nicht wiederholt
        # verarbeitet wird (auch bei fehlendem Empfänger / Mailfehler).
        formular.zusammenfassung_gesendet_am = jetzt
        if not (formular.email_empfaenger and email_aktiv):
            continue
        try:
            zus = await zusammenfassung(db, formular)
            await EmailNotifier().send_an(
                db,
                formular.email_empfaenger,
                f"Formular abgelaufen – Auswertung: {formular.name}",
                _zusammenfassung_text(zus),
            )
            gesendet += 1
        except Exception:  # noqa: BLE001
            logger.warning("formular_ablauf_mail_fehlgeschlagen", formular_id=formular.id, exc_info=True)
    await db.commit()
    return gesendet
