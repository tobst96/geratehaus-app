from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dienstbuch_planer import (
    DienstbuchPlanTermin,
    DienstbuchPlanTerminEreignis,
    DienstbuchPlanVorlage,
    PlanerKategorie,
)
from app.schemas.dienstbuch_planer import (
    PlanerKategorieAnlegen,
    PlanerKategorieAktualisieren,
    PlanPlatzhalterAnlegen,
    PlanTerminAktualisieren,
    PlanTerminAnlegen,
    PlanVorlageAnlegen,
    PlanVorlageAktualisieren,
)
from app.services.dienstbuch_plan_engine import VorlageRegel, berechne_kandidaten, validiere_regel

FELD_LABELS: dict[str, str] = {
    "titel": "Titel",
    "beschreibung": "Beschreibung",
    "wiederholungstyp": "Wiederholungstyp",
    "intervall": "Intervall",
    "wochentag": "Wochentag",
    "kalenderwoche": "Kalenderwoche",
    "kw_paritaet": "KW-Parität",
    "mindest_intervall_aktiv": "Mindest-Intervall aktiv",
    "mindest_intervall_tage": "Mindest-Intervall (Tage)",
    "startdatum": "Startdatum",
    "enddatum": "Enddatum",
    "aktiv": "Aktiv",
    "zieldatum": "Zieldatum",
    "uhrzeit": "Uhrzeit",
    "endzeit": "Endzeit",
    "ist_platzhalter": "Platzhalter",
}

_TERMIN_DETAILS = (selectinload(DienstbuchPlanTermin.kategorien), selectinload(DienstbuchPlanTermin.vorlage))


async def _ereignis_protokollieren(
    db: AsyncSession, termin_id: int, typ: str, beschreibung: str, akteur_name: str | None
) -> None:
    db.add(
        DienstbuchPlanTerminEreignis(
            termin_id=termin_id, typ=typ, beschreibung=beschreibung, akteur_name=akteur_name
        )
    )


# --- Kategorien ---------------------------------------------------------------


async def liste_kategorien(db: AsyncSession, nur_aktive: bool = True) -> list[PlanerKategorie]:
    stmt = select(PlanerKategorie).order_by(PlanerKategorie.reihenfolge)
    if nur_aktive:
        stmt = stmt.where(PlanerKategorie.aktiv.is_(True))
    return list((await db.execute(stmt)).scalars().all())


async def get_kategorie(db: AsyncSession, kategorie_id: int) -> PlanerKategorie | None:
    return (
        await db.execute(select(PlanerKategorie).where(PlanerKategorie.id == kategorie_id))
    ).scalar_one_or_none()


async def _kategorien_laden(db: AsyncSession, kategorie_ids: list[int]) -> list[PlanerKategorie]:
    if not kategorie_ids:
        return []
    result = await db.execute(select(PlanerKategorie).where(PlanerKategorie.id.in_(kategorie_ids)))
    return list(result.scalars().all())


async def kategorie_anlegen(db: AsyncSession, daten: PlanerKategorieAnlegen) -> PlanerKategorie:
    kategorie = PlanerKategorie(**daten.model_dump())
    db.add(kategorie)
    await db.commit()
    await db.refresh(kategorie)
    return kategorie


async def kategorie_aktualisieren(
    db: AsyncSession, kategorie: PlanerKategorie, daten: PlanerKategorieAktualisieren
) -> PlanerKategorie:
    for feld, wert in daten.model_dump(exclude_unset=True).items():
        setattr(kategorie, feld, wert)
    await db.commit()
    await db.refresh(kategorie)
    return kategorie


# --- Vorlagen -------------------------------------------------------------


async def liste_vorlagen(db: AsyncSession, nur_aktive: bool = False) -> list[DienstbuchPlanVorlage]:
    stmt = select(DienstbuchPlanVorlage).options(selectinload(DienstbuchPlanVorlage.kategorien))
    if nur_aktive:
        stmt = stmt.where(DienstbuchPlanVorlage.aktiv.is_(True))
    stmt = stmt.order_by(DienstbuchPlanVorlage.titel)
    return list((await db.execute(stmt)).scalars().all())


async def get_vorlage(db: AsyncSession, vorlage_id: int) -> DienstbuchPlanVorlage | None:
    stmt = (
        select(DienstbuchPlanVorlage)
        .options(selectinload(DienstbuchPlanVorlage.kategorien))
        .where(DienstbuchPlanVorlage.id == vorlage_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def vorlage_anlegen(db: AsyncSession, daten: PlanVorlageAnlegen) -> DienstbuchPlanVorlage:
    werte = daten.model_dump(exclude={"kategorie_ids"})
    vorlage = DienstbuchPlanVorlage(**werte)
    vorlage.kategorien = await _kategorien_laden(db, daten.kategorie_ids)
    # Validiert die Wiederholungsregel früh (z. B. widersprüchliche
    # KW-Parität) statt erst beim ersten Instanzen-Generieren zu scheitern.
    regel_pruefen(vorlage)
    db.add(vorlage)
    await db.commit()
    await db.refresh(vorlage, attribute_names=["kategorien"])
    return vorlage


async def vorlage_aktualisieren(
    db: AsyncSession, vorlage: DienstbuchPlanVorlage, daten: PlanVorlageAktualisieren
) -> DienstbuchPlanVorlage:
    aenderungen = daten.model_dump(exclude_unset=True, exclude={"kategorie_ids"})
    for feld, wert in aenderungen.items():
        setattr(vorlage, feld, wert)
    if daten.kategorie_ids is not None:
        vorlage.kategorien = await _kategorien_laden(db, daten.kategorie_ids)
    regel_pruefen(vorlage)
    await db.commit()
    await db.refresh(vorlage, attribute_names=["kategorien"])
    return vorlage


async def vorlage_deaktivieren(db: AsyncSession, vorlage: DienstbuchPlanVorlage) -> DienstbuchPlanVorlage:
    """Kein Hard-Delete - bestehende Instanzen bleiben unberührt, es werden
    nur keine neuen mehr generiert."""
    vorlage.aktiv = False
    await db.commit()
    await db.refresh(vorlage, attribute_names=["kategorien"])
    return vorlage


def regel_pruefen(vorlage: DienstbuchPlanVorlage) -> None:
    """Wirft `VorlageValidierungsFehler`, wenn die Wiederholungsregel in sich
    widersprüchlich ist (siehe `dienstbuch_plan_engine.validiere_regel`)."""
    validiere_regel(_zu_regel(vorlage))


def _zu_regel(vorlage: DienstbuchPlanVorlage) -> VorlageRegel:
    return VorlageRegel(
        wiederholungstyp=vorlage.wiederholungstyp,
        startdatum=vorlage.startdatum,
        intervall=vorlage.intervall,
        wochentag=vorlage.wochentag,
        kalenderwoche=vorlage.kalenderwoche,
        kw_paritaet=vorlage.kw_paritaet,
        enddatum=vorlage.enddatum,
    )


# --- Termine ----------------------------------------------------------------


async def liste_termine(db: AsyncSession, jahr: int) -> list[DienstbuchPlanTermin]:
    stmt = (
        select(DienstbuchPlanTermin)
        .options(*_TERMIN_DETAILS)
        .where(DienstbuchPlanTermin.jahr == jahr)
        .order_by(DienstbuchPlanTermin.zieldatum.nulls_last())
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_termin(db: AsyncSession, termin_id: int) -> DienstbuchPlanTermin | None:
    stmt = select(DienstbuchPlanTermin).options(*_TERMIN_DETAILS).where(DienstbuchPlanTermin.id == termin_id)
    return (await db.execute(stmt)).scalar_one_or_none()


def _gleiche_kw_im_jahr(quelle: date, jahr: int) -> date:
    """Datum im Zieljahr mit gleicher ISO-Kalenderwoche und gleichem Wochentag.
    Hat das Zieljahr keine KW 53, wird auf KW 52 ausgewichen."""
    _, kw, wochentag_iso = quelle.isocalendar()
    try:
        return date.fromisocalendar(jahr, kw, wochentag_iso)
    except ValueError:
        return date.fromisocalendar(jahr, 52, wochentag_iso)


async def instanzen_fuer_jahr_sicherstellen(
    db: AsyncSession, jahr: int, akteur_name: str | None = None
) -> list[DienstbuchPlanTermin]:
    """Erzeugt die fehlenden Entwurfs-Termine eines Jahres aus zwei Quellen:

    1. Alle aktiven Vorlagen (Wiederholungsregeln, inkl. Zeiten-Übernahme).
    2. Alle Einzeltermine des VORJAHRES ohne Vorlage (Nutzerwunsch 25.08.2026:
       „es sollen immer alle Termine als Entwurf ins neue Jahr") - Standard:
       gleiche Kalenderwoche + gleicher Wochentag im Zieljahr.

    Idempotent: pro Vorlage werden (vorlage_id, zieldatum)-Duplikate, bei der
    Vorjahres-Übernahme (titel, zieldatum)-Duplikate im Zieljahr übersprungen.
    """
    neue: list[DienstbuchPlanTermin] = []

    # --- Quelle 1: Vorlagen -----------------------------------------------
    vorlagen = await liste_vorlagen(db, nur_aktive=True)
    bestehende = await db.execute(
        select(DienstbuchPlanTermin.vorlage_id, DienstbuchPlanTermin.zieldatum).where(
            DienstbuchPlanTermin.jahr == jahr, DienstbuchPlanTermin.vorlage_id.isnot(None)
        )
    )
    vorhandene_daten: set[tuple[int, date]] = {(v, d) for v, d in bestehende.all() if d is not None}

    for vorlage in vorlagen:
        kandidaten = berechne_kandidaten(_zu_regel(vorlage), jahr)
        for datum, verschoben in kandidaten:
            if (vorlage.id, datum) in vorhandene_daten:
                continue
            termin = DienstbuchPlanTermin(
                vorlage_id=vorlage.id,
                jahr=jahr,
                titel=vorlage.titel,
                beschreibung=vorlage.beschreibung,
                zieldatum=datum,
                uhrzeit=vorlage.uhrzeit,
                endzeit=vorlage.endzeit,
                status="entwurf",
                kategorien=list(vorlage.kategorien),
            )
            db.add(termin)
            await db.flush()  # braucht termin.id für das Ereignis
            await _ereignis_protokollieren(
                db, termin.id, "angelegt", f"Automatisch aus Vorlage „{vorlage.titel}“ erzeugt.", akteur_name
            )
            if verschoben:
                await _ereignis_protokollieren(
                    db,
                    termin.id,
                    "datum_automatisch_verschoben",
                    "Zieldatum automatisch verschoben, da das rechnerische Datum die "
                    "Wochentag-/Kalenderwochen-Bedingung verletzt hätte.",
                    akteur_name,
                )
            neue.append(termin)
            vorhandene_daten.add((vorlage.id, datum))

    # --- Quelle 2: Einzeltermine des Vorjahres ------------------------------
    vorjahres_termine = (
        await db.execute(
            select(DienstbuchPlanTermin)
            .options(selectinload(DienstbuchPlanTermin.kategorien))
            .where(
                DienstbuchPlanTermin.jahr == jahr - 1,
                DienstbuchPlanTermin.vorlage_id.is_(None),
                DienstbuchPlanTermin.ist_platzhalter.is_(False),
                DienstbuchPlanTermin.zieldatum.isnot(None),
            )
        )
    ).scalars().all()
    belegte_titel = {
        (t, d)
        for t, d in (
            await db.execute(
                select(DienstbuchPlanTermin.titel, DienstbuchPlanTermin.zieldatum).where(
                    DienstbuchPlanTermin.jahr == jahr
                )
            )
        ).all()
        if d is not None
    }
    for quelle in vorjahres_termine:
        assert quelle.zieldatum is not None
        ziel = _gleiche_kw_im_jahr(quelle.zieldatum, jahr)
        if (quelle.titel, ziel) in belegte_titel:
            continue
        termin = DienstbuchPlanTermin(
            vorlage_id=None,
            jahr=jahr,
            titel=quelle.titel,
            beschreibung=quelle.beschreibung,
            zieldatum=ziel,
            uhrzeit=quelle.uhrzeit,
            endzeit=quelle.endzeit,
            status="entwurf",
            kategorien=list(quelle.kategorien),
        )
        db.add(termin)
        await db.flush()
        await _ereignis_protokollieren(
            db,
            termin.id,
            "angelegt",
            f"Aus Vorjahrestermin ({quelle.zieldatum.strftime('%d.%m.%Y')}) übernommen - "
            "gleiche Kalenderwoche und Wochentag.",
            akteur_name,
        )
        neue.append(termin)
        belegte_titel.add((quelle.titel, ziel))

    await db.commit()
    for termin in neue:
        await db.refresh(termin, attribute_names=["kategorien"])
    return neue


async def platzhalter_anlegen(
    db: AsyncSession, daten: PlanPlatzhalterAnlegen, akteur_name: str | None
) -> DienstbuchPlanTermin:
    termin = DienstbuchPlanTermin(
        vorlage_id=None,
        jahr=daten.jahr,
        titel=daten.titel,
        beschreibung=daten.beschreibung,
        zieldatum=None,
        ist_platzhalter=True,
        status="entwurf",
        kategorien=await _kategorien_laden(db, daten.kategorie_ids),
    )
    db.add(termin)
    await db.flush()
    await _ereignis_protokollieren(db, termin.id, "angelegt", "Platzhalter angelegt.", akteur_name)
    await db.commit()
    await db.refresh(termin, attribute_names=["kategorien"])
    return termin


async def termin_anlegen(
    db: AsyncSession, daten: PlanTerminAnlegen, akteur_name: str | None
) -> DienstbuchPlanTermin:
    """Manuell angelegter Einzeltermin mit festem Datum (kein Platzhalter,
    keine Vorlage)."""
    termin = DienstbuchPlanTermin(
        vorlage_id=None,
        jahr=daten.zieldatum.year,
        titel=daten.titel,
        beschreibung=daten.beschreibung,
        zieldatum=daten.zieldatum,
        uhrzeit=daten.uhrzeit,
        endzeit=daten.endzeit,
        ist_platzhalter=False,
        status="entwurf",
        kategorien=await _kategorien_laden(db, daten.kategorie_ids),
    )
    db.add(termin)
    await db.flush()
    await _ereignis_protokollieren(db, termin.id, "angelegt", "Termin manuell angelegt.", akteur_name)
    await db.commit()
    await db.refresh(termin, attribute_names=["kategorien"])
    return termin


async def termin_aktualisieren(
    db: AsyncSession, termin: DienstbuchPlanTermin, daten: PlanTerminAktualisieren, akteur_name: str | None
) -> DienstbuchPlanTermin:
    aenderungen = daten.model_dump(exclude_unset=True, exclude={"kategorie_ids"})
    alte_werte = {feld: getattr(termin, feld) for feld in aenderungen}

    diff_teile = []
    for feld, neuer_wert in aenderungen.items():
        alter_wert = alte_werte[feld]
        setattr(termin, feld, neuer_wert)
        if alter_wert != neuer_wert:
            diff_teile.append(f"{FELD_LABELS.get(feld, feld)}: „{alter_wert or '–'}“ → „{neuer_wert or '–'}“")

    # Bekommt ein Platzhalter ein Zieldatum (z. B. per Drag&Drop auf den
    # Kalender), wird er automatisch zum normalen Termin - und umgekehrt.
    if "zieldatum" in aenderungen:
        neu_platzhalter = aenderungen["zieldatum"] is None
        if termin.ist_platzhalter != neu_platzhalter:
            termin.ist_platzhalter = neu_platzhalter
            diff_teile.append(
                "Platzhalter terminiert" if not neu_platzhalter else "Zu Platzhalter zurückgestuft"
            )
        if aenderungen["zieldatum"] is not None:
            termin.jahr = aenderungen["zieldatum"].year

    if daten.kategorie_ids is not None:
        alte_namen = sorted(k.name for k in termin.kategorien)
        termin.kategorien = await _kategorien_laden(db, daten.kategorie_ids)
        neue_namen = sorted(k.name for k in termin.kategorien)
        if alte_namen != neue_namen:
            diff_teile.append(
                f"Kategorien: „{', '.join(alte_namen) or '–'}“ → „{', '.join(neue_namen) or '–'}“"
            )

    if diff_teile:
        await _ereignis_protokollieren(
            db, termin.id, "geaendert", "Geändert: " + "; ".join(diff_teile), akteur_name
        )
        await db.commit()
        await db.refresh(termin, attribute_names=["kategorien"])
    return termin


async def termin_bestaetigen(
    db: AsyncSession, termin: DienstbuchPlanTermin, akteur_name: str | None
) -> DienstbuchPlanTermin:
    termin.status = "bestaetigt"
    await _ereignis_protokollieren(db, termin.id, "bestaetigt", "Termin bestätigt.", akteur_name)
    await db.commit()
    await db.refresh(termin, attribute_names=["kategorien"])
    return termin


async def termin_zu_entwurf_zuruecksetzen(
    db: AsyncSession, termin: DienstbuchPlanTermin, akteur_name: str | None
) -> DienstbuchPlanTermin:
    if termin.dienstbuch_id is not None:
        raise ValueError("Termin ist bereits mit einem Dienstbuch verknüpft, kann nicht zurückgesetzt werden.")
    termin.status = "entwurf"
    await _ereignis_protokollieren(
        db, termin.id, "entwurf_zurueckgesetzt", "Bestätigung zurückgenommen.", akteur_name
    )
    await db.commit()
    await db.refresh(termin, attribute_names=["kategorien"])
    return termin


async def termin_ereignisse(db: AsyncSession, termin_id: int) -> list[DienstbuchPlanTerminEreignis]:
    stmt = (
        select(DienstbuchPlanTerminEreignis)
        .where(DienstbuchPlanTerminEreignis.termin_id == termin_id)
        .order_by(DienstbuchPlanTerminEreignis.zeitpunkt)
    )
    return list((await db.execute(stmt)).scalars().all())


# --- Mindest-Intervall / Überfällig -------------------------------------------


async def ueberfaellige_vorlagen(
    db: AsyncSession, heute: date | None = None
) -> list[tuple[DienstbuchPlanVorlage, date | None, int]]:
    """Vorlagen mit aktivem Mindest-Intervall, deren letzter bestätigter
    Termin länger als `mindest_intervall_tage` zurückliegt (oder die noch nie
    bestätigt wurden). Rückgabe je Treffer: (Vorlage, letztes Zieldatum oder
    None, Tage überfällig)."""
    heute = heute or datetime.now(timezone.utc).date()
    stmt = select(DienstbuchPlanVorlage).where(
        DienstbuchPlanVorlage.mindest_intervall_aktiv.is_(True),
        DienstbuchPlanVorlage.aktiv.is_(True),
    )
    vorlagen = list((await db.execute(stmt)).scalars().all())
    ergebnis: list[tuple[DienstbuchPlanVorlage, date | None, int]] = []
    for vorlage in vorlagen:
        letztes = (
            await db.execute(
                select(DienstbuchPlanTermin.zieldatum)
                .where(
                    DienstbuchPlanTermin.vorlage_id == vorlage.id,
                    DienstbuchPlanTermin.status == "bestaetigt",
                    DienstbuchPlanTermin.zieldatum.isnot(None),
                )
                .order_by(DienstbuchPlanTermin.zieldatum.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        intervall_tage = vorlage.mindest_intervall_tage or 0
        if letztes is None:
            tage_ueberfaellig = (heute - vorlage.startdatum).days - intervall_tage
        else:
            tage_ueberfaellig = (heute - letztes).days - intervall_tage
        if tage_ueberfaellig > 0:
            ergebnis.append((vorlage, letztes, tage_ueberfaellig))
    return ergebnis
