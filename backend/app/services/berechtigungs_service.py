"""Zentrale Berechtigungslogik: individueller Modul-Zugriff pro Moderator.

Alle Zugriffsprüfungen sollen künftig über `hat_zugriff()` laufen (kein verstreuter
Tabellenzugriff). Admins haben immer Vollzugriff (Admin-Bypass).

Phase 2: Daten werden gepflegt, aber `hat_zugriff()` wird noch NICHT zur
Absicherung von Endpunkten genutzt (Enforcement folgt in Phase 4).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.berechtigung import Berechtigung
from app.models.moderator import Moderator
from app.models.modul import Modul
from app.services import modul_service


def ist_admin(moderator: Moderator) -> bool:
    return moderator.rolle == "admin"


async def hat_zugriff(db: AsyncSession, moderator: Moderator, modul_key: str) -> bool:
    """Ob ein Moderator auf ein Modul zugreifen darf. Admin-Bypass: Admins immer True."""
    if ist_admin(moderator):
        return True
    modul = await modul_service.get_by_key(db, modul_key)
    if modul is None:
        return False
    result = await db.execute(
        select(Berechtigung.id).where(
            Berechtigung.moderator_id == moderator.id,
            Berechtigung.modul_id == modul.id,
        )
    )
    return result.scalar_one_or_none() is not None


async def matrix(db: AsyncSession) -> tuple[list[Modul], list[Moderator], dict[int, set[str]]]:
    """Liefert (Module, Moderatoren, {moderator_id: set(freigegebene modul_keys)})
    für die Admin-Berechtigungsseite."""
    module = await modul_service.liste_module(db)
    modul_key_by_id = {m.id: m.key for m in module}

    moderatoren = list(
        (await db.execute(select(Moderator).order_by(Moderator.username))).scalars().all()
    )
    berechtigungen = list((await db.execute(select(Berechtigung))).scalars().all())

    keys_je_moderator: dict[int, set[str]] = {}
    for b in berechtigungen:
        key = modul_key_by_id.get(b.modul_id)
        if key is not None:
            keys_je_moderator.setdefault(b.moderator_id, set()).add(key)
    return module, moderatoren, keys_je_moderator


async def set_berechtigung(
    db: AsyncSession, moderator_id: int, modul_key: str, erlaubt: bool
) -> bool:
    """Erteilt/entzieht den Modul-Zugriff. Gibt False zurück, wenn Moderator oder
    Modul nicht existieren (→ 404 im Router)."""
    modul = await modul_service.get_by_key(db, modul_key)
    if modul is None:
        return False
    moderator = (
        await db.execute(select(Moderator).where(Moderator.id == moderator_id))
    ).scalar_one_or_none()
    if moderator is None:
        return False

    vorhanden = (
        await db.execute(
            select(Berechtigung).where(
                Berechtigung.moderator_id == moderator_id,
                Berechtigung.modul_id == modul.id,
            )
        )
    ).scalar_one_or_none()

    if erlaubt and vorhanden is None:
        db.add(Berechtigung(moderator_id=moderator_id, modul_id=modul.id))
        await db.commit()
    elif not erlaubt and vorhanden is not None:
        await db.delete(vorhanden)
        await db.commit()
    return True
