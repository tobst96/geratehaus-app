"""Businesslogik des Formular-Moduls: Formulare/Felder verwalten, Einreichungen
validieren + speichern und den formularspezifischen Empfänger per Mail informieren.
"""

import csv
import io
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import structlog
from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import zeit
from app.core.config import settings
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

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_DATEI_ERLAUBT = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


class EinreichungAbgelehnt(Exception):
    """Einreichung aus organisatorischem Grund abgelehnt (Zeitfenster, Kapazität,
    Einwilligung, Mehrfach-Sperre). Trägt den passenden HTTP-Status."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)

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


def _als_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def ist_abgelaufen(formular: Formular) -> bool:
    if formular.ablauf_am is None:
        return False
    return _als_utc(formular.ablauf_am) <= datetime.now(timezone.utc)


def verfuegbar(formular: Formular) -> bool:
    """Aktiv UND innerhalb des optionalen Start-/Ablauf-Zeitfensters."""
    if not formular.aktiv:
        return False
    jetzt = datetime.now(timezone.utc)
    if formular.start_am is not None and _als_utc(formular.start_am) > jetzt:
        return False
    if formular.ablauf_am is not None and _als_utc(formular.ablauf_am) <= jetzt:
        return False
    return True


async def liste_zugaengliche_formulare(db: AsyncSession) -> list[Formular]:
    """Aktive, im Zeitfenster liegende Formulare für die öffentliche/Mitglieder-Liste."""
    jetzt = datetime.now(timezone.utc)
    stmt = (
        select(Formular)
        .options(selectinload(Formular.felder))
        .where(
            Formular.aktiv.is_(True),
            (Formular.start_am.is_(None)) | (Formular.start_am <= jetzt),
            (Formular.ablauf_am.is_(None)) | (Formular.ablauf_am > jetzt),
        )
        .order_by(Formular.reihenfolge, Formular.id)
    )
    return list((await db.execute(stmt)).scalars().all())


async def _anzahl_einreichungen(db: AsyncSession, formular_id: int) -> int:
    return (
        await db.execute(
            select(func.count()).select_from(FormularEinreichung).where(
                FormularEinreichung.formular_id == formular_id
            )
        )
    ).scalar_one()


async def hat_bereits_eingereicht(db: AsyncSession, formular_id: int, person_id: int) -> bool:
    return (
        await db.execute(
            select(FormularEinreichung.id)
            .where(
                FormularEinreichung.formular_id == formular_id,
                FormularEinreichung.person_id == person_id,
            )
            .limit(1)
        )
    ).scalar_one_or_none() is not None


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

    if feld.typ == "skala":
        try:
            n = int(raw)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            fehler[feld.id] = "Ungültiger Wert."
            return None
        if n < 1 or n > feld.max_sterne:
            fehler[feld.id] = f"Wert muss zwischen 1 und {feld.max_sterne} liegen."
            return None
        return n

    if feld.typ == "zahl":
        try:
            zahl = float(raw)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            fehler[feld.id] = "Bitte eine Zahl eingeben."
            return None
        return int(zahl) if zahl.is_integer() else zahl

    if feld.typ == "datum":
        try:
            datetime.fromisoformat(str(raw))
        except ValueError:
            fehler[feld.id] = "Ungültiges Datum."
            return None
        return str(raw)

    if feld.typ == "email":
        s = str(raw).strip()
        if not _EMAIL_RE.match(s):
            fehler[feld.id] = "Ungültige E-Mail-Adresse."
            return None
        return s

    if feld.typ == "telefon":
        return str(raw).strip()

    if feld.typ == "ja_nein":
        s = str(raw)
        if s not in ("Ja", "Nein"):
            fehler[feld.id] = "Bitte Ja oder Nein wählen."
            return None
        return s

    if feld.typ == "datei":
        ref = str(raw)
        if not ref.startswith("/uploads/formulare/"):
            fehler[feld.id] = "Ungültige Datei."
            return None
        pfad = Path(settings.upload_dir) / ref[len("/uploads/") :]
        if not pfad.is_file():
            fehler[feld.id] = "Datei nicht gefunden."
            return None
        return ref

    return raw


async def einreichung_speichern(
    db: AsyncSession,
    formular: Formular,
    antworten: dict[str, object],
    person: Person | None,
    ip: str | None,
    einwilligung: bool = False,
) -> FormularEinreichung:
    """Prüft Verfügbarkeit/Kapazität/Einwilligung/Mehrfach-Sperre, validiert die
    Antworten, speichert einen Snapshot und benachrichtigt den hinterlegten
    E-Mail-Empfänger. Wirft EinreichungAbgelehnt (organisatorisch) bzw.
    EinreichungFehler (Feld-Validierung)."""
    if not verfuegbar(formular):
        raise EinreichungAbgelehnt(
            status.HTTP_404_NOT_FOUND, "Dieses Formular ist nicht (mehr) verfügbar."
        )
    if formular.max_einreichungen and formular.max_einreichungen > 0:
        if await _anzahl_einreichungen(db, formular.id) >= formular.max_einreichungen:
            raise EinreichungAbgelehnt(
                status.HTTP_409_CONFLICT, "Dieses Formular ist bereits ausgebucht."
            )
    if formular.mehrfach_verhindern and person is not None:
        if await hat_bereits_eingereicht(db, formular.id, person.id):
            raise EinreichungAbgelehnt(
                status.HTTP_409_CONFLICT, "Du hast dieses Formular bereits abgesendet."
            )
    if formular.einwilligung_text and not einwilligung:
        raise EinreichungAbgelehnt(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Bitte bestätige die Einwilligung."
        )

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


def _feld_zusammenfassung(
    feld: FormularFeld, werte: list[object], oeffentlich: bool = False
) -> FeldZusammenfassung:
    basis = {"feld_id": feld.id, "label": feld.label, "typ": feld.typ}

    if feld.typ in ("sterne", "skala"):
        zahlen = [w for w in werte if isinstance(w, int) and not isinstance(w, bool)]
        durchschnitt = round(sum(zahlen) / len(zahlen), 2) if zahlen else None
        verteilung = {str(n): sum(1 for z in zahlen if z == n) for n in range(1, feld.max_sterne + 1)}
        return FeldZusammenfassung(
            **basis, anzahl_beantwortet=len(zahlen), durchschnitt=durchschnitt, verteilung=verteilung
        )

    if feld.typ == "zahl":
        zahlen = [w for w in werte if isinstance(w, (int, float)) and not isinstance(w, bool)]
        durchschnitt = round(sum(zahlen) / len(zahlen), 2) if zahlen else None
        texte = None if oeffentlich else [str(w) for w in werte if not _leer(w)]
        return FeldZusammenfassung(
            **basis, anzahl_beantwortet=len(zahlen), durchschnitt=durchschnitt, texte=texte
        )

    if feld.typ == "checkbox":
        ja = sum(1 for w in werte if w is True)
        return FeldZusammenfassung(
            **basis, anzahl_beantwortet=len(werte), verteilung={"Ja": ja, "Nein": len(werte) - ja}
        )

    if feld.typ == "ja_nein":
        ja = sum(1 for w in werte if w == "Ja")
        nein = sum(1 for w in werte if w == "Nein")
        return FeldZusammenfassung(
            **basis, anzahl_beantwortet=ja + nein, verteilung={"Ja": ja, "Nein": nein}
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

    # text / mehrzeilig / email / telefon / datum / datei
    nicht_leer = [str(w) for w in werte if not _leer(w)]
    texte = None if oeffentlich else nicht_leer
    return FeldZusammenfassung(**basis, anzahl_beantwortet=len(nicht_leer), texte=texte)


async def zusammenfassung(
    db: AsyncSession, formular: Formular, oeffentlich: bool = False
) -> ZusammenfassungOut:
    """Aggregierte Auswertung über alle Einreichungen (Zwischenstand). Bei
    `oeffentlich=True` werden Freitext-Einzelantworten ausgeblendet."""
    einreichungen = await einreichungen_fuer(db, formular.id)
    felder_stats: list[FeldZusammenfassung] = []
    for feld in sorted((f for f in formular.felder if f.aktiv), key=lambda f: f.reihenfolge):
        werte: list[object] = []
        for e in einreichungen:
            for a in e.antworten:
                if a.get("feld_id") == feld.id:
                    werte.append(a.get("wert"))
                    break
        felder_stats.append(_feld_zusammenfassung(feld, werte, oeffentlich))
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


# --- Datei-Upload / Duplizieren / Export / Aufbewahrung ----------------------


def _datei_bereinigen(inhalt: bytes, content_type: str) -> tuple[bytes, str]:
    """Prüft die Bytes nach ihrem TATSÄCHLICHEN Inhalt (nicht nur am spoofbaren
    Content-Type) und gibt bereinigte Bytes + Dateiendung zurück:
    - Bilder (PNG/JPEG/WebP): über Pillow neu kodiert → **EXIF/Metadaten entfernt**
      und zugleich Magic-Bytes-Prüfung.
    - PDF: Magic-Bytes-Prüfung (`%PDF-`), Inhalt unverändert.
    Ungültige/uneindeutige Dateien → 415."""
    if content_type == "application/pdf":
        if not inhalt.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Datei ist kein gültiges PDF.",
            )
        return inhalt, ".pdf"

    try:
        bild = Image.open(io.BytesIO(inhalt))
        bild.load()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Datei ist kein gültiges Bild.",
        )
    ausgabe = io.BytesIO()
    if bild.format == "PNG":
        bild.save(ausgabe, format="PNG")
        return ausgabe.getvalue(), ".png"
    if bild.format == "JPEG":
        bild.convert("RGB").save(ausgabe, format="JPEG", quality=88)
        return ausgabe.getvalue(), ".jpg"
    if bild.format == "WEBP":
        bild.save(ausgabe, format="WEBP")
        return ausgabe.getvalue(), ".webp"
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Bild muss PNG, JPEG oder WebP sein.",
    )


async def datei_speichern(datei: UploadFile) -> str:
    """Speichert eine hochgeladene Formular-Datei (Bild/PDF) unter einem zufälligen
    Namen und gibt die öffentliche Referenz (/uploads/formulare/…) zurück. Bilder
    werden re-kodiert (EXIF entfernt), alle Typen per Magic-Bytes geprüft."""
    if datei.content_type not in _DATEI_ERLAUBT:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Nur Bilder (PNG/JPEG/WebP) oder PDF erlaubt.",
        )
    inhalt = await datei.read()
    if len(inhalt) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Die Datei darf maximal 10 MB groß sein.",
        )
    bytes_bereinigt, endung = _datei_bereinigen(inhalt, datei.content_type)
    verzeichnis = Path(settings.upload_dir) / "formulare"
    verzeichnis.mkdir(parents=True, exist_ok=True)
    dateiname = f"{uuid4().hex}{endung}"
    (verzeichnis / dateiname).write_bytes(bytes_bereinigt)
    return f"/uploads/formulare/{dateiname}"


async def formular_duplizieren(db: AsyncSession, formular: Formular) -> Formular:
    """Kopiert ein Formular inkl. Felder (ohne Einreichungen); Kopie ist inaktiv und
    ohne Start-/Ablaufdatum."""
    neu = Formular(
        name=f"{formular.name} (Kopie)",
        beschreibung=formular.beschreibung,
        aktiv=False,
        login_erforderlich=formular.login_erforderlich,
        email_empfaenger=formular.email_empfaenger,
        moderator_sichtbar=formular.moderator_sichtbar,
        max_einreichungen=formular.max_einreichungen,
        aufbewahrung_tage=formular.aufbewahrung_tage,
        danke_text=formular.danke_text,
        ergebnis_oeffentlich=formular.ergebnis_oeffentlich,
        einwilligung_text=formular.einwilligung_text,
        mehrfach_verhindern=formular.mehrfach_verhindern,
        reihenfolge=formular.reihenfolge,
    )
    db.add(neu)
    await db.flush()
    for f in sorted(formular.felder, key=lambda x: x.reihenfolge):
        db.add(
            FormularFeld(
                formular_id=neu.id,
                label=f.label,
                typ=f.typ,
                pflicht=f.pflicht,
                hinweis=f.hinweis,
                optionen=list(f.optionen),
                max_sterne=f.max_sterne,
                reihenfolge=f.reihenfolge,
                aktiv=f.aktiv,
            )
        )
    await db.commit()
    geladen = await get_formular(db, neu.id)
    assert geladen is not None
    return geladen


def csv_export(formular: Formular, einreichungen: list[FormularEinreichung]) -> str:
    """CSV der Einreichungen (Spalten = aktuelle Felder), Semikolon-getrennt für
    deutsches Excel."""
    felder = sorted((f for f in formular.felder), key=lambda f: f.reihenfolge)
    ausgabe = io.StringIO()
    writer = csv.writer(ausgabe, delimiter=";")
    writer.writerow(["Zeitpunkt", "Person"] + [f.label for f in felder])
    for e in einreichungen:
        antwort_map = {a["feld_id"]: a for a in e.antworten}
        zeile = [e.erstellt_am.isoformat(), e.person_name or ""]
        for f in felder:
            a = antwort_map.get(f.id)
            zeile.append(_wert_text(a["typ"], a["wert"]) if a else "")
        writer.writerow(zeile)
    return ausgabe.getvalue()


async def einreichungen_aufbewahrung_bereinigen(db: AsyncSession) -> int:
    """Löscht Einreichungen, die älter als die je Formular gesetzte
    Aufbewahrungsfrist (`aufbewahrung_tage`) sind. Gibt die Anzahl zurück."""
    jetzt = datetime.now(timezone.utc)
    formulare = list(
        (
            await db.execute(
                select(Formular).where(
                    Formular.aufbewahrung_tage.is_not(None), Formular.aufbewahrung_tage > 0
                )
            )
        ).scalars().all()
    )
    geloescht = 0
    for formular in formulare:
        grenze = jetzt - timedelta(days=formular.aufbewahrung_tage)
        res = await db.execute(
            delete(FormularEinreichung).where(
                FormularEinreichung.formular_id == formular.id,
                FormularEinreichung.erstellt_am < grenze,
            )
        )
        geloescht += res.rowcount or 0
    await db.commit()
    return geloescht
