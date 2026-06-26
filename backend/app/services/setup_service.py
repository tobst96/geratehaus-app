from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.schemas.setup import SetupRequest
from app.services.config_service import config_service


async def ist_eingerichtet(db: AsyncSession) -> bool:
    result = await db.execute(select(Moderator).limit(1))
    return result.scalar_one_or_none() is not None


async def setup_durchfuehren(db: AsyncSession, daten: SetupRequest) -> None:
    """Legt den initialen Moderator an und befüllt app_config. Wird nur
    aufgerufen, wenn noch kein Moderator existiert (First-Run) oder explizit
    über den authentifizierten Moderator-Bereich erneut ausgelöst."""
    await config_service.ensure_defaults(db)
    await config_service.set_many(
        db,
        {
            "organisation_name": daten.organisation_name,
            "farbe_primaer": daten.farbe_primaer,
            "farbe_akzent": daten.farbe_akzent,
            "fehlerberichte_aktiv": daten.fehlerberichte_aktiv,
            "setup_abgeschlossen": True,
        },
    )

    existing = await db.execute(
        select(Moderator).where(Moderator.username == settings.admin_username)
    )
    moderator = existing.scalar_one_or_none()
    if moderator is None:
        moderator = Moderator(
            username=settings.admin_username,
            passwort_hash=hash_secret(daten.admin_passwort),
            rolle="admin",
        )
        db.add(moderator)
    else:
        moderator.passwort_hash = hash_secret(daten.admin_passwort)
    await db.commit()
