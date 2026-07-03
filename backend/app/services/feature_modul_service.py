"""Feature-Module: die funktionalen Module mit An/Aus, Sortierung und – für die
mitgliederseitigen – Kiosk-Anzeige und Außenzugriff.

Bewusst getrennt vom Berechtigungssystem (`modul_service` / `Modul`-Tabelle):
hier geht es um die vom Admin schaltbaren Funktionsmodule, deren Zustand
vollständig in `app_config` liegt (`modul_<key>_aktiv` / `_startseite` /
`_aussenzugriff`, `modul_reihenfolge`).

Divera ist ein Feature-Modul (An/Aus), aber nicht mitgliederseitig – es hat daher
keine Kiosk-/Außenzugriff-Schalter.
"""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import config_service


@dataclass(frozen=True)
class FeatureModulDef:
    key: str
    name: str
    # Nur mitgliederseitige Module haben Kiosk-Anzeige und Außenzugriff.
    mitgliederseitig: bool


FEATURE_MODULE: list[FeatureModulDef] = [
    FeatureModulDef("einsatztagebuch", "Einsatztagebuch", True),
    FeatureModulDef("dienstbuch", "Dienstbuch", True),
    FeatureModulDef("dienststunden", "Dienststunden", True),
    FeatureModulDef("fahrzeugbuchung", "Fahrzeugbuchung", True),
    FeatureModulDef("divera", "Divera 24/7", False),
]

_BY_KEY = {m.key: m for m in FEATURE_MODULE}
_FLAGS = {"aktiv", "startseite", "aussenzugriff"}


def get_def(key: str) -> FeatureModulDef | None:
    return _BY_KEY.get(key)


async def _reihenfolge_keys(db: AsyncSession) -> list[str]:
    """Konfigurierte Reihenfolge, robust gegen unbekannte/fehlende Keys: nur
    bekannte Keys in der gespeicherten Reihenfolge, fehlende Module werden in
    Registry-Reihenfolge hinten angehängt."""
    roh = await config_service.get(db, "modul_reihenfolge", "")
    order = [k.strip() for k in str(roh).split(",") if k.strip() in _BY_KEY]
    for m in FEATURE_MODULE:
        if m.key not in order:
            order.append(m.key)
    return order


async def liste(db: AsyncSession) -> list[dict]:
    order = await _reihenfolge_keys(db)
    ergebnis: list[dict] = []
    for i, key in enumerate(order):
        m = _BY_KEY[key]
        eintrag = {
            "key": m.key,
            "name": m.name,
            "mitgliederseitig": m.mitgliederseitig,
            "reihenfolge": i,
            "aktiv": bool(await config_service.get(db, f"modul_{key}_aktiv", False)),
            "startseite": None,
            "aussenzugriff": None,
        }
        if m.mitgliederseitig:
            eintrag["startseite"] = bool(await config_service.get(db, f"modul_{key}_startseite", False))
            eintrag["aussenzugriff"] = bool(await config_service.get(db, f"modul_{key}_aussenzugriff", False))
        ergebnis.append(eintrag)
    return ergebnis


async def eintrag(db: AsyncSession, key: str) -> dict | None:
    for e in await liste(db):
        if e["key"] == key:
            return e
    return None


async def set_flag(db: AsyncSession, key: str, feld: str, wert: bool) -> bool:
    """Setzt aktiv/startseite/aussenzugriff. False bei unbekanntem Modul/Feld oder
    wenn startseite/aussenzugriff für ein nicht-mitgliederseitiges Modul (Divera)
    gesetzt werden soll."""
    m = _BY_KEY.get(key)
    if m is None or feld not in _FLAGS:
        return False
    if feld in ("startseite", "aussenzugriff") and not m.mitgliederseitig:
        return False
    await config_service.set(db, f"modul_{key}_{feld}", wert)
    return True


async def set_reihenfolge(db: AsyncSession, keys: list[str]) -> bool:
    """Speichert die Reihenfolge. Erwartet genau alle Feature-Modul-Keys je einmal."""
    if sorted(keys) != sorted(_BY_KEY.keys()):
        return False
    await config_service.set(db, "modul_reihenfolge", ",".join(keys))
    return True


async def ist_aktiv(db: AsyncSession, key: str) -> bool:
    if key not in _BY_KEY:
        return False
    return bool(await config_service.get(db, f"modul_{key}_aktiv", False))
