"""Modul-Registry für das Berechtigungssystem.

Die Registry listet alle Anwendungsbereiche, für die künftig pro Gruppenführer ein
Zugriff vergeben werden kann. `ensure_module()` seedet sie idempotent in die
`module`-Tabelle (analog zu `config_service.ensure_defaults`). Neue Module hier
registrieren – bestehende Einträge (inkl. vom Admin gesetztem `aktiv`) bleiben
unangetastet.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.modul import Modul


@dataclass(frozen=True)
class ModulDef:
    key: str
    name: str
    beschreibung: str


# Bewusst inkl. Querschnittsbereiche (Personal, Stammdaten, …), damit später der
# Zugriff je Bereich pro Gruppenführer vergeben werden kann. „berechtigungen" ist das
# Berechtigungssystem selbst – es erscheint als eigenes Modul in der Liste.
MODUL_REGISTRY: list[ModulDef] = [
    ModulDef("einsatztagebuch", "Einsatztagebuch", "Einsätze erfassen und verwalten"),
    ModulDef("dienstbuch", "Dienstbuch", "Dienste erfassen und verwalten"),
    ModulDef("dienststunden", "Dienststunden", "Dienststunden erfassen und auswerten"),
    ModulDef("fahrzeugbuchung", "Fahrzeugbuchung", "Fahrzeuge buchen und freigeben"),
    ModulDef("personal", "Personal", "Personen-Stammdaten verwalten"),
    ModulDef("stammdaten", "Stammdaten", "Fahrzeuge, Funktionen, Gruppen, Zusatzfelder"),
    ModulDef("barcodes", "Barcodes", "Barcodes erzeugen und versenden"),
    ModulDef("kiosk-geraete", "Kiosk-Geräte", "Kiosk-/Geräte-Tokens verwalten"),
    ModulDef("benachrichtigungen", "Benachrichtigungen", "Benachrichtigungskanäle konfigurieren"),
    ModulDef("einstellungen", "Einstellungen", "App-Konfiguration"),
    ModulDef("berechtigungen", "Berechtigungen", "Modul-Zugriffe pro Gruppenführer vergeben"),
]


async def ensure_module(db: AsyncSession) -> None:
    """Seedet fehlende Registry-Module idempotent (INSERT ... ON CONFLICT DO
    NOTHING). Bestehende Einträge bleiben unverändert."""
    stmt = insert(Modul).values(
        [
            {"key": m.key, "name": m.name, "beschreibung": m.beschreibung, "aktiv": True}
            for m in MODUL_REGISTRY
        ]
    )
    stmt = stmt.on_conflict_do_nothing(index_elements=["key"])
    await db.execute(stmt)
    await db.commit()


async def liste_module(db: AsyncSession) -> list[Modul]:
    result = await db.execute(select(Modul).order_by(Modul.name))
    return list(result.scalars().all())


async def get_by_key(db: AsyncSession, key: str) -> Modul | None:
    result = await db.execute(select(Modul).where(Modul.key == key))
    return result.scalar_one_or_none()


async def set_aktiv(db: AsyncSession, key: str, aktiv: bool) -> Modul | None:
    modul = await get_by_key(db, key)
    if modul is None:
        return None
    modul.aktiv = aktiv
    await db.commit()
    await db.refresh(modul)
    return modul
