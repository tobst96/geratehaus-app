from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_secret
from app.models.person import Person
from app.schemas.setup import SetupRequest
from app.services.config_service import config_service


async def ist_eingerichtet(db: AsyncSession) -> bool:
    """Eingerichtet, sobald der Setup-Wizard durchlief (`setup_abgeschlossen`).
    Bewusst am Config-Flag statt an einer Konto-Tabelle festgemacht – so bleibt der
    Wizard bei bestehenden Instanzen aus, auch während der Umstellung auf das
    Person-Konto (bevor der Admin migriert ist)."""
    return bool(await config_service.get(db, "setup_abgeschlossen", False))


async def setup_durchfuehren(db: AsyncSession, daten: SetupRequest) -> None:
    """Legt die **initiale Admin-Person** an (Name = `admin_username`, mit Passwort)
    und befüllt app_config. First-Run oder erneut über den authentifizierten
    Gruppenführer-Bereich."""
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

    name = settings.admin_username
    person = (
        await db.execute(select(Person).where(Person.name == name))
    ).scalar_one_or_none()
    if person is None:
        person = Person(
            name=name,
            gruppenfuehrer_rolle="admin",
            passwort_hash=hash_secret(daten.admin_passwort),
        )
        db.add(person)
    else:
        person.gruppenfuehrer_rolle = "admin"
        person.passwort_hash = hash_secret(daten.admin_passwort)
    await db.commit()
