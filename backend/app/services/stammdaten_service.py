import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_secret, verify_secret
from app.models.einsatz_feld import EinsatzFeldDefinition
from app.models.fahrzeug import Fahrzeug
from app.models.funktion import FunktionDienststunden, FunktionEinsatz
from app.models.gruppe import Gruppe
from app.models.person import Person
from app.models.person_ereignis import PersonEreignis
from app.models.person_punkt import PersonPunkt
from app.schemas.einsatz_feld import (
    EinsatzFeldDefinitionCreate,
    EinsatzFeldDefinitionUpdate,
    schluessel_aus_label,
)
from app.schemas.person import PersonCreate, PersonOut, PersonUpdate
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
    await db.flush()

    await punkte_regel_anwenden(db, person.id, "anlage")

    await db.commit()
    await db.refresh(person)
    return person


async def person_aktualisieren(db: AsyncSession, person: Person, daten: PersonUpdate) -> Person:
    aenderungen = daten.model_dump(exclude_unset=True)
    alte_werte = {feld: getattr(person, feld) for feld in aenderungen}

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

    if "email" in aenderungen and not alte_werte["email"] and aenderungen["email"]:
        await punkte_regel_anwenden(db, person.id, "email", einmalig=True)

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


async def person_bild_speichern(db: AsyncSession, person: Person, datei: UploadFile) -> Person:
    """Speichert das Profilbild einer Person (PNG/JPEG) und aktualisiert bild_url."""
    erlaubte_typen = {"image/png": ".png", "image/jpeg": ".jpg"}
    if datei.content_type not in erlaubte_typen:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Bild muss PNG oder JPEG sein.",
        )
    inhalt = await datei.read()
    if len(inhalt) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Bild darf maximal 5 MB groß sein.",
        )

    hatte_noch_kein_bild = not person.bild_url

    upload_verzeichnis = Path(settings.upload_dir) / "personen"
    upload_verzeichnis.mkdir(parents=True, exist_ok=True)
    dateiname = f"person-{person.id}{erlaubte_typen[datei.content_type]}"
    (upload_verzeichnis / dateiname).write_bytes(inhalt)

    # Cache-busting-Suffix, damit ein neu hochgeladenes Bild beim selben
    # Dateinamen nicht aus dem Browser-Cache des alten Bilds angezeigt wird.
    person.bild_url = f"/uploads/personen/{dateiname}?v={int(time.time())}"
    await person_ereignis_protokollieren(db, person.id, "bild_geaendert", "Profilbild aktualisiert")
    if hatte_noch_kein_bild:
        await punkte_regel_anwenden(db, person.id, "profilbild", einmalig=True)
    await db.commit()
    await db.refresh(person)
    return person


# --- Personen-Punkte --------------------------------------------------------
#
# Automatische Vergaberegeln (Punkte/Tage/Abbau-Modus) sind über app_config
# einstellbar (Moderator-Bereich > Punkte, siehe config_defaults.py), Keys
# "punkte_<schluessel>_punkte" / "_tage" / "_modus". Pro Person+Grund wird nur
# einmalig vergeben (siehe `_bereits_vergeben`), damit z. B. das erste
# Profilbild nicht bei jedem erneuten Hochladen erneut Punkte bringt.

PUNKTE_REGEL_SCHLUESSEL = ("anlage", "profilbild", "email", "einsatz", "dienstbuch", "dienststunden")


async def _punkte_regel_lesen(db: AsyncSession, schluessel: str) -> tuple[float, int, str]:
    punkte = await config_service.get(db, f"punkte_{schluessel}_punkte", 0)
    tage = await config_service.get(db, f"punkte_{schluessel}_tage", 0)
    modus = await config_service.get(db, f"punkte_{schluessel}_modus", "halten")
    return float(punkte), int(tage), modus


async def _bereits_vergeben(db: AsyncSession, person_id: int, grund: str) -> bool:
    result = await db.execute(
        select(PersonPunkt.id).where(PersonPunkt.person_id == person_id, PersonPunkt.grund == grund).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def punkte_regel_anwenden(
    db: AsyncSession,
    person_id: int,
    regel_schluessel: str,
    *,
    grund: str | None = None,
    einmalig: bool = False,
    faktor: float = 1.0,
) -> None:
    """Wendet eine konfigurierte Punkte-Regel an und protokolliert sie in der
    Timeline. `regel_schluessel` bestimmt, welche app_config-Werte gelesen
    werden (punkte_<schluessel>_*); `grund` ist der in PersonPunkt.grund
    gespeicherte Wert (Default = regel_schluessel, kann z. B. für Einsätze
    auf "einsatz_<id>" individualisiert werden, damit die Punkte bei
    Wiedereröffnung gezielt wieder entfernt werden können). `einmalig=True`
    vergibt nur, wenn für diesen Grund noch nie Punkte vergeben wurden (z. B.
    erstes Profilbild, erste E-Mail). `faktor` skaliert die konfigurierten
    Punkte (z. B. Dienststunden: Punkte pro Stunde × Anzahl Stunden)."""
    punkte, tage, modus = await _punkte_regel_lesen(db, regel_schluessel)
    if punkte <= 0 or tage <= 0:
        return
    grund = grund or regel_schluessel
    if einmalig and await _bereits_vergeben(db, person_id, grund):
        return

    effektive_punkte = round(punkte * faktor, 2)
    if effektive_punkte <= 0:
        return
    gueltig_bis = date.today() + timedelta(days=tage)
    await punkte_vergeben(db, person_id, effektive_punkte, grund, gueltig_bis, abbau_modus=modus)
    modus_text = "linear abgebaut bis" if modus == "abziehend" else "gültig bis"
    await person_ereignis_protokollieren(
        db,
        person_id,
        "punkte_vergeben",
        f"{effektive_punkte:g} Punkt(e) vergeben ({modus_text} {gueltig_bis.strftime('%d.%m.%Y')})",
    )


async def punkte_entfernen(db: AsyncSession, grund: str) -> int:
    """Entfernt alle Punkte mit dem angegebenen Grund – z. B. wenn ein
    Einsatz/Dienstbuch wieder geöffnet wird und die dafür vergebenen Punkte
    zurückgenommen werden müssen (bei erneutem Abschluss werden sie über
    `punkte_regel_anwenden` neu vergeben)."""
    result = await db.execute(delete(PersonPunkt).where(PersonPunkt.grund == grund))
    await db.commit()
    return result.rowcount


async def punkte_vergeben(
    db: AsyncSession, person_id: int, punkte: float, grund: str, gueltig_bis: date, abbau_modus: str = "halten"
) -> PersonPunkt:
    eintrag = PersonPunkt(
        person_id=person_id, punkte=punkte, grund=grund, gueltig_bis=gueltig_bis, abbau_modus=abbau_modus
    )
    db.add(eintrag)
    return eintrag


def _punkt_wert_aktuell(punkte: float, erstellt_am: date, gueltig_bis: date, abbau_modus: str, heute: date) -> float:
    if heute > gueltig_bis:
        return 0.0
    if abbau_modus != "abziehend":
        return punkte
    gesamt_tage = (gueltig_bis - erstellt_am).days
    if gesamt_tage <= 0:
        return punkte
    vergangene_tage = max(0, (heute - erstellt_am).days)
    anteil_rest = max(0.0, (gesamt_tage - vergangene_tage) / gesamt_tage)
    return punkte * anteil_rest


async def gesamtpunkte(db: AsyncSession, person_id: int) -> int:
    batch = await gesamtpunkte_batch(db, [person_id])
    return batch.get(person_id, 0)


async def gesamtpunkte_batch(db: AsyncSession, person_ids: list[int]) -> dict[int, int]:
    """Gibt je Person die gerundete Gesamtpunktzahl zurück. In der Datenbank
    dürfen Punkte-Einträge Kommazahlen enthalten (z. B. Dienststunden-Punkte
    je angefangener Minute) – angezeigt wird immer nur die gerundete Summe."""
    if not person_ids:
        return {}
    heute = date.today()
    stmt = select(
        PersonPunkt.person_id,
        PersonPunkt.punkte,
        PersonPunkt.erstellt_am,
        PersonPunkt.gueltig_bis,
        PersonPunkt.abbau_modus,
    ).where(PersonPunkt.person_id.in_(person_ids), PersonPunkt.gueltig_bis >= heute)
    result = await db.execute(stmt)

    summen: dict[int, float] = {}
    for person_id, punkte, erstellt_am, gueltig_bis, abbau_modus in result.all():
        wert = _punkt_wert_aktuell(punkte, erstellt_am.date(), gueltig_bis, abbau_modus, heute)
        summen[person_id] = summen.get(person_id, 0.0) + wert
    return {person_id: round(wert) for person_id, wert in summen.items()}


async def punkte_aufraeumen(db: AsyncSession) -> int:
    heute = date.today()
    result = await db.execute(delete(PersonPunkt).where(PersonPunkt.gueltig_bis < heute))
    await db.commit()
    return result.rowcount


async def personen_zu_out(db: AsyncSession, personen: list[Person]) -> list[PersonOut]:
    punkte_je_person = await gesamtpunkte_batch(db, [p.id for p in personen])
    return [
        PersonOut(
            id=p.id,
            name=p.name,
            vorname=p.vorname,
            zwischenname=p.zwischenname,
            nachname=p.nachname,
            bild_url=p.bild_url,
            email=p.email,
            gruppe_id=p.gruppe_id,
            funktion_id=p.funktion_id,
            gesamtpunkte=punkte_je_person.get(p.id, 0),
            pin_gesetzt=p.pin_gesetzt,
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


# --- Personen-Inaktivität ---------------------------------------------------
#
# Täglicher Job (siehe app/jobs/scheduler.py): Personen, die seit
# `personen_inaktivitaet_tage` Tagen keinen neuen Timeline-Eintrag mehr
# hatten, werden automatisch gelöscht. 7 Tage vorher wird einmalig gewarnt
# (kein Spam bei jedem Lauf, solange seit der Warnung keine neue Aktivität
# stattgefunden hat).

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

    return (anzahl_warnungen, anzahl_loeschungen)
