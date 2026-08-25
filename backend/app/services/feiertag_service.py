"""Feiertage für den Dienstbuch-Planer (Phase 2).

Quellen:
- Regelwerk `backend/app/data/feiertage_regeln.json` (im Git editierbar):
  feste Daten, osterabhängige Offsets und der sächsische Buß- und Bettag,
  gefiltert auf das konfigurierte Bundesland (`dienstbuch_planer_bundesland`,
  leer = nur bundesweite Feiertage).
- Manuell in den Modul-Einstellungen gepflegte Zusatztermine
  (`PlanerFeiertag`-Tabelle, z. B. örtliche Feste/Blockiertage).

Bewegliche Feiertage werden über die Gauß'sche Osterformel (anonymer
gregorianischer Algorithmus) berechnet - kein JSON mit fest verdrahteten
Jahren nötig.
"""

import json
from dataclasses import dataclass
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dienstbuch_planer import PlanerFeiertag
from app.services.config_service import config_service

_REGELN_PFAD = Path(__file__).resolve().parent.parent / "data" / "feiertage_regeln.json"


@dataclass(frozen=True)
class Feiertag:
    datum: date
    name: str
    # "regel" (aus dem JSON berechnet) oder "manuell" (DB-Eintrag)
    quelle: str
    id: int | None = None  # nur bei manuellen Einträgen (fürs Löschen)


@lru_cache(maxsize=1)
def _regeln() -> dict:
    return json.loads(_REGELN_PFAD.read_text(encoding="utf-8"))


def bundeslaender() -> dict[str, str]:
    return dict(_regeln()["bundeslaender"])


def ostersonntag(jahr: int) -> date:
    """Gauß'sche Osterformel (anonymer gregorianischer Algorithmus)."""
    a = jahr % 19
    b, c = divmod(jahr, 100)
    d, e = divmod(b, 4)
    g = (8 * b + 13) // 25
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7  # noqa: E741
    m = (a + 11 * h + 19 * l) // 433
    monat = (h + l - 7 * m + 90) // 25
    tag = (h + l - 7 * m + 33 * monat + 19) % 32
    return date(jahr, monat, tag)


def _buss_und_bettag(jahr: int) -> date:
    """Mittwoch vor dem 23. November."""
    d = date(jahr, 11, 22)
    while d.weekday() != 2:  # Mittwoch
        d -= timedelta(days=1)
    return d


def berechne_feiertage(jahr: int, bundesland: str) -> list[Feiertag]:
    """Feiertage eines Jahres aus dem Regelwerk - bundesweite immer, landes-
    spezifische nur für das übergebene Bundesland-Kürzel (leer = keine)."""
    ostern = ostersonntag(jahr)
    ergebnis: list[Feiertag] = []
    for regel in _regeln()["feiertage"]:
        laender = regel.get("laender")
        if laender is not None and bundesland not in laender:
            continue
        if regel["typ"] == "fest":
            datum = date(jahr, regel["monat"], regel["tag"])
        elif regel["typ"] == "ostern":
            datum = ostern + timedelta(days=regel["offset"])
        elif regel["typ"] == "buss_und_bettag":
            datum = _buss_und_bettag(jahr)
        else:
            continue
        ergebnis.append(Feiertag(datum=datum, name=regel["name"], quelle="regel"))
    return sorted(ergebnis, key=lambda f: f.datum)


async def feiertage_fuer_jahr(db: AsyncSession, jahr: int) -> list[Feiertag]:
    """Berechnete Feiertage (konfiguriertes Bundesland) + manuelle Einträge."""
    bundesland = str(await config_service.get(db, "dienstbuch_planer_bundesland", "") or "")
    ergebnis = berechne_feiertage(jahr, bundesland)

    manuelle = (
        await db.execute(
            select(PlanerFeiertag).where(
                PlanerFeiertag.datum >= date(jahr, 1, 1), PlanerFeiertag.datum <= date(jahr, 12, 31)
            )
        )
    ).scalars().all()
    ergebnis.extend(Feiertag(datum=f.datum, name=f.name, quelle="manuell", id=f.id) for f in manuelle)
    return sorted(ergebnis, key=lambda f: f.datum)


async def feiertag_anlegen(db: AsyncSession, datum: date, name: str) -> PlanerFeiertag:
    feiertag = PlanerFeiertag(datum=datum, name=name)
    db.add(feiertag)
    await db.commit()
    await db.refresh(feiertag)
    return feiertag


async def feiertag_loeschen(db: AsyncSession, feiertag_id: int) -> bool:
    feiertag = (
        await db.execute(select(PlanerFeiertag).where(PlanerFeiertag.id == feiertag_id))
    ).scalar_one_or_none()
    if feiertag is None:
        return False
    await db.delete(feiertag)
    await db.commit()
    return True
