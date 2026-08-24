from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import structlog
from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import datei_token
from app.core.config import settings
from app.core.security import hash_secret, verify_secret
from app.models.einsatz_feld import EinsatzFeldDefinition
from app.models.fahrzeug import Fahrzeug
from app.models.funktion import FunktionDienststunden, FunktionEinsatz
from app.models.gruppe import Gruppe
from app.models.person import Person
from app.models.person_ereignis import PersonEreignis
from app.schemas.einsatz_feld import (
    EinsatzFeldDefinitionCreate,
    EinsatzFeldDefinitionUpdate,
    schluessel_aus_label,
)
from app.schemas.person import PersonCreate, PersonOut, PersonUpdate
from app.services.config_service import config_service
from app.schemas.stammdaten import (
    FahrzeugCreate,
    FahrzeugUpdate,
    FunktionDienststundenCreate,
    FunktionDienststundenUpdate,
    FunktionEinsatzCreate,
    FunktionEinsatzUpdate,
    GruppeCreate,
    GruppeUpdate,
)
from app.services import notifier_service
from app.services.config_service import config_service


def _voller_name(vorname: str, zwischenname: str | None, nachname: str) -> str:
    teile = [vorname, zwischenname, nachname]
    return " ".join(teil for teil in teile if teil)


async def liste_fahrzeuge(db: AsyncSession, nur_aktive: bool = True) -> list[Fahrzeug]:
    stmt = select(Fahrzeug)
    if nur_aktive:
        stmt = stmt.where(Fahrzeug.aktiv.is_(True))
    result = await db.execute(stmt.order_by(Fahrzeug.name))
    return list(result.scalars().all())


async def fahrzeug_anlegen(db: AsyncSession, daten: FahrzeugCreate) -> Fahrzeug:
    fahrzeug = Fahrzeug(**daten.model_dump())
    db.add(fahrzeug)
    await db.commit()
    await db.refresh(fahrzeug)
    return fahrzeug


async def fahrzeug_aktualisieren(
    db: AsyncSession, fahrzeug: Fahrzeug, daten: FahrzeugUpdate
) -> Fahrzeug:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(fahrzeug, feld, wert)
    await db.commit()
    await db.refresh(fahrzeug)
    return fahrzeug


async def fahrzeug_loeschen(db: AsyncSession, fahrzeug: Fahrzeug) -> None:
    await db.delete(fahrzeug)
    await db.commit()


async def get_fahrzeug(db: AsyncSession, fahrzeug_id: int) -> Fahrzeug | None:
    result = await db.execute(select(Fahrzeug).where(Fahrzeug.id == fahrzeug_id))
    return result.scalar_one_or_none()


async def liste_funktionen_einsatz(db: AsyncSession, nur_aktive: bool = True) -> list[FunktionEinsatz]:
    stmt = select(FunktionEinsatz)
    if nur_aktive:
        stmt = stmt.where(FunktionEinsatz.aktiv.is_(True))
    result = await db.execute(stmt.order_by(FunktionEinsatz.name))
    return list(result.scalars().all())


async def funktion_einsatz_anlegen(db: AsyncSession, daten: FunktionEinsatzCreate) -> FunktionEinsatz:
    funktion = FunktionEinsatz(**daten.model_dump())
    db.add(funktion)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def funktion_einsatz_aktualisieren(
    db: AsyncSession, funktion: FunktionEinsatz, daten: FunktionEinsatzUpdate
) -> FunktionEinsatz:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(funktion, feld, wert)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def funktion_einsatz_loeschen(db: AsyncSession, funktion: FunktionEinsatz) -> None:
    await db.delete(funktion)
    await db.commit()


async def get_funktion_einsatz(db: AsyncSession, funktion_id: int) -> FunktionEinsatz | None:
    result = await db.execute(select(FunktionEinsatz).where(FunktionEinsatz.id == funktion_id))
    return result.scalar_one_or_none()


async def liste_funktionen_dienststunden(
    db: AsyncSession, nur_aktive: bool = True
) -> list[FunktionDienststunden]:
    stmt = select(FunktionDienststunden)
    if nur_aktive:
        stmt = stmt.where(FunktionDienststunden.aktiv.is_(True))
    result = await db.execute(stmt.order_by(FunktionDienststunden.name))
    return list(result.scalars().all())


async def funktion_dienststunden_anlegen(
    db: AsyncSession, daten: FunktionDienststundenCreate
) -> FunktionDienststunden:
    funktion = FunktionDienststunden(**daten.model_dump())
    db.add(funktion)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def funktion_dienststunden_aktualisieren(
    db: AsyncSession, funktion: FunktionDienststunden, daten: FunktionDienststundenUpdate
) -> FunktionDienststunden:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(funktion, feld, wert)
    await db.commit()
    await db.refresh(funktion)
    return funktion


async def funktion_dienststunden_loeschen(db: AsyncSession, funktion: FunktionDienststunden) -> None:
    await db.delete(funktion)
    await db.commit()


async def get_funktion_dienststunden(
    db: AsyncSession, funktion_id: int
) -> FunktionDienststunden | None:
    result = await db.execute(
        select(FunktionDienststunden).where(FunktionDienststunden.id == funktion_id)
    )
    return result.scalar_one_or_none()


# --- Gruppen --------------------------------------------------------------------


async def liste_gruppen(db: AsyncSession, nur_aktive: bool = True) -> list[Gruppe]:
    stmt = select(Gruppe)
    if nur_aktive:
        stmt = stmt.where(Gruppe.aktiv.is_(True))
    result = await db.execute(stmt.order_by(Gruppe.name))
    return list(result.scalars().all())


async def gruppe_anlegen(db: AsyncSession, daten: GruppeCreate) -> Gruppe:
    gruppe = Gruppe(**daten.model_dump())
    db.add(gruppe)
    await db.commit()
    await db.refresh(gruppe)
    return gruppe


async def gruppe_aktualisieren(db: AsyncSession, gruppe: Gruppe, daten: GruppeUpdate) -> Gruppe:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(gruppe, feld, wert)
    await db.commit()
    await db.refresh(gruppe)
    return gruppe


async def gruppe_loeschen(db: AsyncSession, gruppe: Gruppe) -> None:
    await db.delete(gruppe)
    await db.commit()


async def get_gruppe(db: AsyncSession, gruppe_id: int) -> Gruppe | None:
    result = await db.execute(select(Gruppe).where(Gruppe.id == gruppe_id))
    return result.scalar_one_or_none()


# --- Einsatz-Felder (frei konfigurierbare Zusatzfelder) ------------------------


async def liste_einsatz_felder(db: AsyncSession, nur_aktive: bool = True) -> list[EinsatzFeldDefinition]:
    stmt = select(EinsatzFeldDefinition).order_by(EinsatzFeldDefinition.reihenfolge)
    if nur_aktive:
        stmt = stmt.where(EinsatzFeldDefinition.aktiv.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def einsatz_feld_anlegen(
    db: AsyncSession, daten: EinsatzFeldDefinitionCreate
) -> EinsatzFeldDefinition:
    basis_schluessel = schluessel_aus_label(daten.label)
    schluessel = basis_schluessel
    zaehler = 1
    while (
        await db.execute(
            select(EinsatzFeldDefinition).where(EinsatzFeldDefinition.schluessel == schluessel)
        )
    ).scalar_one_or_none() is not None:
        zaehler += 1
        schluessel = f"{basis_schluessel}_{zaehler}"

    feld = EinsatzFeldDefinition(
        schluessel=schluessel,
        label=daten.label,
        typ=daten.typ,
        reihenfolge=daten.reihenfolge,
        aktiv=daten.aktiv,
    )
    db.add(feld)
    await db.commit()
    await db.refresh(feld)
    return feld


async def einsatz_feld_aktualisieren(
    db: AsyncSession, feld: EinsatzFeldDefinition, daten: EinsatzFeldDefinitionUpdate
) -> EinsatzFeldDefinition:
    for name, wert in daten.model_dump(exclude_unset=True).items():
        setattr(feld, name, wert)
    await db.commit()
    await db.refresh(feld)
    return feld


async def einsatz_feld_loeschen(db: AsyncSession, feld: EinsatzFeldDefinition) -> None:
    await db.delete(feld)
    await db.commit()


async def get_einsatz_feld(db: AsyncSession, feld_id: int) -> EinsatzFeldDefinition | None:
    result = await db.execute(select(EinsatzFeldDefinition).where(EinsatzFeldDefinition.id == feld_id))
    return result.scalar_one_or_none()


# --- Personen -------------------------------------------------------------

FELD_LABELS = {
    "vorname": "Vorname",
    "zwischenname": "Zwischenname",
    "nachname": "Nachname",
    "email": "E-Mail",
    "gruppe_id": "Gruppe",
    "funktion_id": "Funktion",
    "benachrichtigungen_aktiv": "Benachrichtigungen aktiv",
    "inaktiv": "Inaktiv",
}


async def liste_personen(db: AsyncSession) -> list[Person]:
    sortierung = await config_service.get(db, "personen_sortierung", "nachname")
    stmt = select(Person)
    if sortierung == "gruppe_nachname":
        stmt = stmt.outerjoin(Gruppe, Person.gruppe_id == Gruppe.id).order_by(
            Gruppe.name, Person.nachname, Person.vorname, Person.name
        )
    else:
        stmt = stmt.order_by(Person.nachname, Person.vorname, Person.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_person(db: AsyncSession, person_id: int) -> Person | None:
    result = await db.execute(select(Person).where(Person.id == person_id))
    return result.scalar_one_or_none()


async def person_anlegen(db: AsyncSession, daten: PersonCreate) -> Person:
    person = Person(
        vorname=daten.vorname,
        zwischenname=daten.zwischenname,
        nachname=daten.nachname,
        name=_voller_name(daten.vorname, daten.zwischenname, daten.nachname),
        email=daten.email,
        gruppe_id=daten.gruppe_id,
        funktion_id=daten.funktion_id,
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


# Spalten der Import-/Vorlage-CSV. Reihenfolge = Spaltenreihenfolge der Vorlage.
CSV_IMPORT_SPALTEN = ["vorname", "zwischenname", "nachname", "email", "gruppe", "funktion"]

# Beispiel-CSV zum Download neben dem Upload-Button. Bewusst neutrale Platzhalter
# (keine org-spezifischen Werte); Gruppe/Funktion nur als Namensbeispiel.
CSV_IMPORT_VORLAGE = (
    "vorname;zwischenname;nachname;email;gruppe;funktion\n"
    "Max;;Mustermann;max@example.org;;\n"
    "Erika;von;Musterfrau;;;\n"
)


async def personen_csv_importieren(
    db: AsyncSession, inhalt: bytes
) -> tuple[int, list[dict[str, object]]]:
    """Legt Personen zeilenweise aus einer CSV an (über `person_anlegen`, inkl.
    Timeline). Gruppe/Funktion werden per Name (case-insensitive) aufgelöst.
    Fehlerhafte Zeilen werden übersprungen und mit Zeilennummer gesammelt
    zurückgegeben, statt den gesamten Import abzubrechen.

    Rückgabe: (Anzahl angelegter Personen, Liste von {"zeile", "fehler"})."""
    import csv
    from io import StringIO

    from pydantic import ValidationError

    try:
        text = inhalt.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = inhalt.decode("latin-1")

    kopfzeile = text.split("\n", 1)[0]
    trennzeichen = ";" if kopfzeile.count(";") >= kopfzeile.count(",") else ","
    leser = csv.DictReader(StringIO(text), delimiter=trennzeichen)

    # Namens-Lookups einmalig aufbauen (case-insensitive, getrimmt).
    gruppen = await liste_gruppen(db, nur_aktive=False)
    funktionen = await liste_funktionen_dienststunden(db, nur_aktive=False)
    gruppe_nach_name = {g.name.strip().lower(): g.id for g in gruppen}
    funktion_nach_name = {f.name.strip().lower(): f.id for f in funktionen}

    angelegt = 0
    fehler: list[dict[str, object]] = []

    # Zeile 1 = Kopfzeile, Datenzeilen ab 2.
    for index, roh in enumerate(leser, start=2):
        werte = {(k or "").strip().lower(): (v or "").strip() for k, v in roh.items()}
        if not any(werte.get(sp) for sp in CSV_IMPORT_SPALTEN):
            continue  # komplett leere Zeile überspringen

        gruppe_name = werte.get("gruppe", "")
        funktion_name = werte.get("funktion", "")
        gruppe_id: int | None = None
        funktion_id: int | None = None
        if gruppe_name:
            gruppe_id = gruppe_nach_name.get(gruppe_name.lower())
            if gruppe_id is None:
                fehler.append({"zeile": index, "fehler": f"Gruppe „{gruppe_name}“ nicht gefunden."})
                continue
        if funktion_name:
            funktion_id = funktion_nach_name.get(funktion_name.lower())
            if funktion_id is None:
                fehler.append({"zeile": index, "fehler": f"Funktion „{funktion_name}“ nicht gefunden."})
                continue

        try:
            daten = PersonCreate(
                vorname=werte.get("vorname", ""),
                zwischenname=werte.get("zwischenname") or None,
                nachname=werte.get("nachname", ""),
                email=werte.get("email") or None,
                gruppe_id=gruppe_id,
                funktion_id=funktion_id,
            )
        except ValidationError as exc:
            erstes = exc.errors()[0] if exc.errors() else {}
            feld = erstes.get("loc", ["?"])[0]
            fehler.append({"zeile": index, "fehler": f"Ungültiges Feld „{feld}“."})
            continue

        await person_anlegen(db, daten)
        angelegt += 1

    return angelegt, fehler


async def person_aktualisieren(db: AsyncSession, person: Person, daten: PersonUpdate) -> Person:
    aenderungen = daten.model_dump(exclude_unset=True)
    alte_werte = {feld: getattr(person, feld) for feld in aenderungen}

    # Login läuft über E-Mail (siehe gruppenfuehrer_service.login_pruefen) – bei
    # Personen mit gesetztem Passwort muss sie daher eindeutig bleiben (Migration
    # 0070 sichert das zusätzlich per DB-Unique-Index ab; diese Prüfung liefert
    # nur die saubere 409 statt eines rohen DB-Fehlers).
    neue_email = aenderungen.get("email")
    if person.passwort_hash and neue_email:
        from app.services import gruppenfuehrer_service

        if await gruppenfuehrer_service.email_bereits_fuer_login_vergeben(
            db, neue_email, ausser_person_id=person.id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Diese E-Mail wird bereits für einen anderen Login-Zugang verwendet.",
            )

    for feld, wert in aenderungen.items():
        setattr(person, feld, wert)
    person.name = _voller_name(
        person.vorname or "", person.zwischenname, person.nachname or ""
    ).strip() or person.name

    diff_teile = []
    for feld, neuer_wert in aenderungen.items():
        alter_wert = alte_werte[feld]
        if alter_wert == neuer_wert:
            continue
        if feld == "gruppe_id":
            alt_label = await _gruppe_name(db, alter_wert)
            neu_label = await _gruppe_name(db, neuer_wert)
            diff_teile.append(f"{FELD_LABELS[feld]}: „{alt_label}“ → „{neu_label}“")
        elif feld == "funktion_id":
            alt_label = await _funktion_name(db, alter_wert)
            neu_label = await _funktion_name(db, neuer_wert)
            diff_teile.append(f"{FELD_LABELS[feld]}: „{alt_label}“ → „{neu_label}“")
        else:
            diff_teile.append(
                f"{FELD_LABELS.get(feld, feld)}: „{alter_wert or '–'}“ → „{neuer_wert or '–'}“"
            )

    if diff_teile:
        typ = "funktion_geaendert" if (
            list(aenderungen.keys()) == ["funktion_id"] and len(diff_teile) == 1
        ) else "stammdaten_geaendert"
        await person_ereignis_protokollieren(db, person.id, typ, "Geändert: " + "; ".join(diff_teile))

    await db.commit()
    await db.refresh(person)
    return person


async def _funktion_name(db: AsyncSession, funktion_id: int | None) -> str:
    if funktion_id is None:
        return "keine"
    result = await db.execute(
        select(FunktionDienststunden).where(FunktionDienststunden.id == funktion_id)
    )
    funktion = result.scalar_one_or_none()
    return funktion.name if funktion else "keine"


async def _gruppe_name(db: AsyncSession, gruppe_id: int | None) -> str:
    if gruppe_id is None:
        return "keine"
    result = await db.execute(select(Gruppe).where(Gruppe.id == gruppe_id))
    gruppe = result.scalar_one_or_none()
    return gruppe.name if gruppe else "keine"


async def person_ereignis_protokollieren(
    db: AsyncSession, person_id: int, typ: str, beschreibung: str
) -> None:
    db.add(PersonEreignis(person_id=person_id, typ=typ, beschreibung=beschreibung))


async def liste_person_ereignisse(db: AsyncSession, person_id: int) -> list[PersonEreignis]:
    stmt = (
        select(PersonEreignis)
        .where(PersonEreignis.person_id == person_id)
        .order_by(PersonEreignis.zeitpunkt)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def person_loeschen(db: AsyncSession, person: Person) -> None:
    await db.delete(person)
    await db.commit()


# Profilbilder werden nur klein angezeigt (Kiosk-Kachel/Avatar, ~200px) – ein per
# Handy hochgeladenes Foto mit mehreren Tausend Pixel Kantenlänge bringt dafür
# keinen Mehrwert, nur unnötig lange Ladezeiten. 512px deckt auch Retina-Displays
# bei der aktuell größten Anzeigegröße gut ab.
_BILD_MAX_KANTENLAENGE = 512


def _bild_verarbeiten(inhalt: bytes) -> tuple[bytes, str]:
    """Validiert die Bytes als echtes PNG/JPEG (nicht nur laut Content-Type-Header),
    verkleinert es bei Bedarf auf maximal `_BILD_MAX_KANTENLAENGE` Pixel Kantenlänge
    und gibt neu kodierte Bytes OHNE Metadaten (EXIF/GPS entfernt) + Dateiendung
    zurück. Das erneute Kodieren über Pillow verwirft sämtliche EXIF-Daten und wirkt
    zugleich als Magic-Bytes-Prüfung – wer kein gültiges Bild hochlädt, bekommt 415."""
    try:
        bild = Image.open(BytesIO(inhalt))
        bild.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Datei ist kein gültiges PNG-/JPEG-Bild.",
        )
    if bild.format not in {"PNG", "JPEG"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Bild muss PNG oder JPEG sein.",
        )
    # Verkleinert nur, wenn nötig (thumbnail() vergrößert nie) - behält das
    # Seitenverhältnis bei.
    bild.thumbnail((_BILD_MAX_KANTENLAENGE, _BILD_MAX_KANTENLAENGE), Image.LANCZOS)
    ausgabe = BytesIO()
    if bild.format == "PNG":
        # Alpha erhalten; ohne pnginfo werden Text-/Metadaten-Chunks nicht übernommen.
        bild.save(ausgabe, format="PNG")
        return ausgabe.getvalue(), ".png"
    # JPEG: in RGB wandeln (falls CMYK/P) und ohne exif= neu speichern → Metadaten weg.
    bild.convert("RGB").save(ausgabe, format="JPEG", quality=88)
    return ausgabe.getvalue(), ".jpg"


def _upload_pfad_aus_url(url: str | None) -> Path | None:
    """Interner Dateipfad zu einer `/uploads/…`-Referenz (ohne Query-Suffix)."""
    if not url or not url.startswith("/uploads/"):
        return None
    relativ = url[len("/uploads/") :].split("?", 1)[0]
    return Path(settings.upload_dir) / relativ


async def person_bild_speichern(db: AsyncSession, person: Person, datei: UploadFile) -> Person:
    """Speichert das Profilbild einer Person (PNG/JPEG) und aktualisiert bild_url.

    Der Dateiname ist ein nicht erratbares Zufallstoken (kein `person-<id>`), damit
    die öffentlich ausgelieferten Bilder nicht per ID durchzählbar sind; zusätzlich
    werden die Bytes als echtes Bild geprüft und EXIF/Metadaten entfernt."""
    inhalt = await datei.read()
    if len(inhalt) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Bild darf maximal 5 MB groß sein.",
        )
    bytes_bereinigt, endung = _bild_verarbeiten(inhalt)

    hatte_noch_kein_bild = not person.bild_url
    altes_bild = _upload_pfad_aus_url(person.bild_url)

    upload_verzeichnis = Path(settings.upload_dir) / "personen"
    upload_verzeichnis.mkdir(parents=True, exist_ok=True)
    dateiname = f"{uuid4().hex}{endung}"
    (upload_verzeichnis / dateiname).write_bytes(bytes_bereinigt)

    # Altes Bild (falls vorhanden und anderer Name) entfernen – kein verwaistes,
    # weiterhin abrufbares Profilbild zurücklassen.
    if altes_bild is not None and altes_bild.name != dateiname:
        altes_bild.unlink(missing_ok=True)

    person.bild_url = f"/uploads/personen/{dateiname}"
    await person_ereignis_protokollieren(db, person.id, "bild_geaendert", "Profilbild aktualisiert")
    await db.commit()
    await db.refresh(person)
    return person


async def personenbilder_backfill(db: AsyncSession) -> int:
    """Einmalige, idempotente Migration der alten, durchzählbaren Profilbild-Namen
    (`/uploads/personen/person-<id>.<ext>`) auf Zufallstoken. Benennt die Datei auf
    der Platte um und aktualisiert `bild_url`. Gibt die Anzahl umbenannter Bilder
    zurück. Läuft beim App-Start (siehe lifespan) und bei fehlenden Dateien
    defensiv (überspringt statt zu werfen)."""
    stmt = select(Person).where(Person.bild_url.like("/uploads/personen/person-%"))
    personen = list((await db.execute(stmt)).scalars().all())
    umbenannt = 0
    for person in personen:
        alt = _upload_pfad_aus_url(person.bild_url)
        endung = alt.suffix if alt else ".jpg"
        neuer_name = f"{uuid4().hex}{endung}"
        ziel = Path(settings.upload_dir) / "personen" / neuer_name
        try:
            if alt is not None and alt.exists():
                ziel.parent.mkdir(parents=True, exist_ok=True)
                alt.rename(ziel)
            elif alt is None:
                continue
        except OSError:
            continue
        person.bild_url = f"/uploads/personen/{neuer_name}"
        umbenannt += 1
    if umbenannt:
        await db.commit()
    return umbenannt


async def personen_zu_out(db: AsyncSession, personen: list[Person]) -> list[PersonOut]:
    # `db` bleibt für Signatur-Kompatibilität mit den Aufrufern erhalten.
    return [
        PersonOut(
            id=p.id,
            name=p.name,
            vorname=p.vorname,
            zwischenname=p.zwischenname,
            nachname=p.nachname,
            bild_url=datei_token.signierte_url(p.bild_url),
            email=p.email,
            gruppe_id=p.gruppe_id,
            funktion_id=p.funktion_id,
            pin_gesetzt=p.pin_gesetzt,
            benachrichtigungen_aktiv=p.benachrichtigungen_aktiv,
            inaktiv=p.inaktiv,
            pin_gesperrt_bis=p.pin_gesperrt_bis,
        )
        for p in personen
    ]


async def person_zu_out(db: AsyncSession, person: Person) -> PersonOut:
    return (await personen_zu_out(db, [person]))[0]


# --- Personen-PIN ----------------------------------------------------------
#
# Der PIN schützt das Profilbild in den "Barcode vergessen"-Flows: Solange
# eine Person einen PIN gesetzt hat, wird ihr Bild dort erst nach korrekter
# PIN-Eingabe sichtbar (siehe reservierung_service.py & Pendants). Personen
# ohne gesetzten PIN sind von dieser Prüfung unberührt (schrittweiser
# Rollout, siehe person_pin_korrekt).


async def person_pin_setzen(db: AsyncSession, person: Person, pin: str) -> Person:
    person.pin_hash = hash_secret(pin)
    person.pin_gesetzt = True
    await person_ereignis_protokollieren(db, person.id, "pin_gesetzt", "PIN eingerichtet/geändert")
    await db.commit()
    await db.refresh(person)
    return person


def person_pin_korrekt(person: Person, pin: str | None) -> bool:
    """True, wenn kein PIN-Schutz aktiv ist ODER der übergebene PIN passt."""
    if not person.pin_gesetzt:
        return True
    if not pin or person.pin_hash is None:
        return False
    return verify_secret(pin, person.pin_hash)


class PinGesperrtError(Exception):
    """Der PIN-Login der Person ist wegen zu vieler Fehlversuche temporär gesperrt."""

    def __init__(self, verbleibend_sekunden: int) -> None:
        super().__init__("PIN-Login vorübergehend gesperrt.")
        self.verbleibend_sekunden = verbleibend_sekunden


def _als_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _pin_gesperrt_bis(person: Person) -> datetime | None:
    """Sperr-Zeitpunkt als UTC-aware datetime (oder None), robust gegen naive Werte."""
    if person.pin_gesperrt_bis is None:
        return None
    return _als_utc(person.pin_gesperrt_bis)


async def pin_login_versuch(db: AsyncSession, person: Person, pin: str | None) -> bool:
    """Prüft den PIN mit Brute-Force-Schutz und persistiert den Zählerstand.

    - Ist die Person aktuell gesperrt (`pin_gesperrt_bis` in der Zukunft), wird
      `PinGesperrtError` mit der Restdauer geworfen – ohne den PIN überhaupt zu prüfen.
    - Bei korrektem PIN werden Zähler und Sperre zurückgesetzt → True.
    - Bei falschem PIN wird der Fehlversuchszähler erhöht; erreicht er den
      konfigurierten Schwellwert (`pin_max_fehlversuche`), wird die Person für
      `pin_sperre_minuten` gesperrt (Zähler zurückgesetzt) und ein Timeline-Eintrag
      geschrieben → False.

    Bewusst identisch für Vorschau (`/name-pin/pruefen`) und Login (`/name-pin`),
    damit die Sperre nicht über den Vorschau-Endpunkt umgangen werden kann.
    """
    jetzt = datetime.now(timezone.utc)
    veraendert = False

    gesperrt_bis = _pin_gesperrt_bis(person)
    if gesperrt_bis is not None and gesperrt_bis > jetzt:
        raise PinGesperrtError(int((gesperrt_bis - jetzt).total_seconds()) + 1)
    # Abgelaufene Sperre aufheben, bevor neu gezählt wird.
    if gesperrt_bis is not None:
        person.pin_gesperrt_bis = None
        person.pin_fehlversuche = 0
        veraendert = True

    if person_pin_korrekt(person, pin):
        if person.pin_fehlversuche or person.pin_gesperrt_bis is not None:
            person.pin_fehlversuche = 0
            person.pin_gesperrt_bis = None
            veraendert = True
        if veraendert:
            await db.commit()
        return True

    max_fehlversuche = int(await config_service.get(db, "pin_max_fehlversuche", 5))
    sperre_minuten = int(await config_service.get(db, "pin_sperre_minuten", 15))
    person.pin_fehlversuche = (person.pin_fehlversuche or 0) + 1
    if max_fehlversuche > 0 and person.pin_fehlversuche >= max_fehlversuche:
        person.pin_gesperrt_bis = jetzt + timedelta(minutes=sperre_minuten)
        person.pin_fehlversuche = 0
        await person_ereignis_protokollieren(
            db,
            person.id,
            "pin_gesperrt",
            f"PIN-Login nach {max_fehlversuche} Fehlversuchen für {sperre_minuten} Minuten gesperrt.",
        )
    await db.commit()
    return False


async def pin_sperre_aufheben(db: AsyncSession, person: Person) -> Person:
    """Hebt eine (temporäre) PIN-Sperre manuell auf (Gruppenführer) und setzt den
    Fehlversuchszähler zurück. Wird in der Personen-Timeline vermerkt."""
    war_gesperrt = _pin_gesperrt_bis(person) is not None or bool(person.pin_fehlversuche)
    person.pin_gesperrt_bis = None
    person.pin_fehlversuche = 0
    if war_gesperrt:
        await person_ereignis_protokollieren(
            db, person.id, "pin_entsperrt", "PIN-Sperre manuell aufgehoben."
        )
    await db.commit()
    await db.refresh(person)
    return person


async def person_ohne_pin_vermerken(db: AsyncSession, person: Person, kontext: str) -> None:
    """Protokolliert in der Personen-Timeline, dass eine Identifikation ohne
    gesetzten PIN erfolgt ist (Eintragung selbst bleibt möglich, wird aber in
    Listen/PDF gekennzeichnet – siehe ohne_pin-Spalten)."""
    await person_ereignis_protokollieren(
        db,
        person.id,
        "ohne_pin_eingetragen",
        f"Ohne gesetzten PIN identifiziert und eingetragen ({kontext}).",
    )
    await db.commit()


async def pin_login_erzwingen(db: AsyncSession, person: Person, pin: str | None, kontext: str) -> bool:
    """Selbstidentifikation am eigenen Handy („Barcode vergessen"). Ohne
    gesetzten PIN bleibt die Eintragung möglich (wird in der Timeline und
    später in Listen/PDF als „ohne PIN" vermerkt) – ist ein PIN gesetzt, muss
    er korrekt sein. Rückgabe: True = ohne PIN identifiziert, False = mit
    korrektem PIN. Wirft PermissionError nur noch bei falschem PIN
    (Endpunkt → 401/403)."""
    if not person.pin_gesetzt:
        await person_ohne_pin_vermerken(db, person, kontext)
        return True
    if not person_pin_korrekt(person, pin):
        raise PermissionError("PIN falsch.")
    return False


# --- Personen-Inaktivität ---------------------------------------------------
#
# Täglicher Job (siehe app/jobs/scheduler.py): Personen, die seit
# `personen_inaktivitaet_tage` Tagen keinen neuen Timeline-Eintrag mehr
# hatten, werden automatisch gelöscht. 7 Tage vorher wird einmalig gewarnt
# (kein Spam bei jedem Lauf, solange seit der Warnung keine neue Aktivität
# stattgefunden hat).

logger = structlog.get_logger(__name__)

WARNUNG_VORLAUF_TAGE = 7


async def _letzte_aktivitaet(db: AsyncSession, person: Person) -> datetime:
    stmt = (
        select(PersonEreignis.zeitpunkt)
        .where(PersonEreignis.person_id == person.id, PersonEreignis.typ != "inaktivitaets_warnung")
        .order_by(PersonEreignis.zeitpunkt.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    letzte = result.scalar_one_or_none()
    return letzte or person.erstellt_am


async def _bereits_gewarnt_seit(db: AsyncSession, person: Person, seit: datetime) -> bool:
    stmt = (
        select(PersonEreignis.id)
        .where(
            PersonEreignis.person_id == person.id,
            PersonEreignis.typ == "inaktivitaets_warnung",
            PersonEreignis.zeitpunkt > seit,
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def personen_inaktivitaet_pruefen(db: AsyncSession) -> tuple[int, int]:
    """Prüft alle Personen auf Inaktivität: warnt einmalig 7 Tage vor Ablauf,
    löscht Personen, die die volle Inaktivitätsschwelle erreicht haben (inkl.
    aller zugehörigen Daten via FK-CASCADE). Gibt (Anzahl Warnungen, Anzahl
    Löschungen) zurück."""
    schwelle_tage = await config_service.get(db, "personen_inaktivitaet_tage", 90)
    if not schwelle_tage:
        return (0, 0)
    warnschwelle_tage = max(schwelle_tage - WARNUNG_VORLAUF_TAGE, 0)

    jetzt = datetime.now(timezone.utc)
    personen = await liste_personen(db)

    anzahl_warnungen = 0
    anzahl_loeschungen = 0
    for person in personen:
        # Pro Person absichern: ein Fehler (Query/Löschung invalidiert sonst die
        # Transaktion) darf nicht den ganzen nächtlichen Lauf abbrechen. Bereits
        # committete Löschungen/Warnungen bleiben erhalten.
        person_id = person.id
        try:
            letzte_aktivitaet = await _letzte_aktivitaet(db, person)
            if letzte_aktivitaet.tzinfo is None:
                letzte_aktivitaet = letzte_aktivitaet.replace(tzinfo=timezone.utc)
            tage_inaktiv = (jetzt - letzte_aktivitaet).days

            if tage_inaktiv >= schwelle_tage:
                await person_loeschen(db, person)
                anzahl_loeschungen += 1
            elif tage_inaktiv >= warnschwelle_tage and not await _bereits_gewarnt_seit(
                db, person, letzte_aktivitaet
            ):
                await person_ereignis_protokollieren(
                    db,
                    person.id,
                    "inaktivitaets_warnung",
                    f"{tage_inaktiv} Tage ohne Aktivität – wird in 7 Tagen automatisch gelöscht, "
                    "falls keine neue Aktivität erfolgt",
                )
                await db.commit()
                await notifier_service.benachrichtige(
                    db, "benachrichtigung_person_inaktiv", person=person.name, tage_inaktiv=tage_inaktiv
                )
                anzahl_warnungen += 1
        except Exception:  # noqa: BLE001
            await db.rollback()
            logger.warning(
                "personen_inaktivitaet_person_fehlgeschlagen", person_id=person_id, exc_info=True
            )

    return (anzahl_warnungen, anzahl_loeschungen)
