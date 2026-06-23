"""Zentraler Zugriffspunkt für app_config.

Alle anderen Module fragen fachliche Einstellungen ausschließlich über
ConfigService an – nie direkt über die app_config-Tabelle und nie über eine
Konstante im Code. Werte werden im Prozess gecached und bei jeder Änderung
über den Moderator-Bereich invalidiert.
"""

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.app_config import AppConfig
from app.services.config_defaults import DEFAULTS, ConfigTyp


def _cast(wert: str, typ: str) -> Any:
    match typ:
        case ConfigTyp.INT:
            return int(wert)
        case ConfigTyp.FLOAT:
            return float(wert)
        case ConfigTyp.BOOL:
            return wert.strip().lower() in ("true", "1", "yes")
        case ConfigTyp.JSON:
            return json.loads(wert)
        case _:
            return wert


def _serialize(wert: Any, typ: str) -> str:
    if typ == ConfigTyp.JSON:
        return json.dumps(wert)
    if typ == ConfigTyp.BOOL:
        return "true" if wert else "false"
    return str(wert)


class ConfigService:
    """Pro Prozess ein Singleton-Cache; invalidate() nach jedem Schreibvorgang."""

    def __init__(self) -> None:
        self._cache: dict[str, Any] | None = None
        self._typen: dict[str, str] = {d.schluessel: d.typ for d in DEFAULTS}

    async def ensure_defaults(self, db: AsyncSession) -> None:
        """Seedet fehlende Keys mit ihren Defaults (idempotent, für Migrationen
        und neu hinzugekommene Settings über App-Updates hinweg)."""
        stmt = insert(AppConfig).values(
            [
                {
                    "schluessel": d.schluessel,
                    "wert": d.wert,
                    "typ": d.typ.value,
                    "beschreibung": d.beschreibung,
                }
                for d in DEFAULTS
            ]
        )
        stmt = stmt.on_conflict_do_nothing(index_elements=["schluessel"])
        await db.execute(stmt)
        await db.commit()

    async def _load(self, db: AsyncSession) -> dict[str, Any]:
        result = await db.execute(select(AppConfig))
        rows = result.scalars().all()
        return {row.schluessel: _cast(row.wert, row.typ) for row in rows}

    async def get_all(self, db: AsyncSession, refresh: bool = False) -> dict[str, Any]:
        if self._cache is None or refresh:
            self._cache = await self._load(db)
        return self._cache

    async def get(self, db: AsyncSession, schluessel: str, default: Any = None) -> Any:
        values = await self.get_all(db)
        if schluessel in values:
            return values[schluessel]
        return default

    async def set(self, db: AsyncSession, schluessel: str, wert: Any) -> None:
        typ = self._typen.get(schluessel, ConfigTyp.STR)
        serialized = _serialize(wert, typ)
        stmt = insert(AppConfig).values(schluessel=schluessel, wert=serialized, typ=typ)
        stmt = stmt.on_conflict_do_update(
            index_elements=["schluessel"], set_={"wert": serialized}
        )
        await db.execute(stmt)
        await db.commit()
        self.invalidate()

    async def set_many(self, db: AsyncSession, werte: dict[str, Any]) -> None:
        for schluessel, wert in werte.items():
            typ = self._typen.get(schluessel, ConfigTyp.STR)
            serialized = _serialize(wert, typ)
            stmt = insert(AppConfig).values(schluessel=schluessel, wert=serialized, typ=typ)
            stmt = stmt.on_conflict_do_update(
                index_elements=["schluessel"], set_={"wert": serialized}
            )
            await db.execute(stmt)
        await db.commit()
        self.invalidate()

    def invalidate(self) -> None:
        self._cache = None


config_service = ConfigService()
