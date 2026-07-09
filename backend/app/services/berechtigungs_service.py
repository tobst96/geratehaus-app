"""Zentrale Berechtigungslogik: individueller Modul-Zugriff pro **Person**.

Die Person ist das Konto (Ablösung der separaten `Gruppenführer`-Tabelle). „Elevated"
(= Gruppenführer/Admin) ist eine Person mit gesetzter `gruppenfuehrer_rolle`; Admins
(`gruppenfuehrer_rolle == "admin"`) haben immer Vollzugriff (Admin-Bypass). Alle
Zugriffsprüfungen laufen über `hat_zugriff()`.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.berechtigung import Berechtigung
from app.models.modul import Modul
from app.models.person import Person
from app.services import modul_service


def ist_elevated(person: Person) -> bool:
    """True, wenn die Person Zugang zum Gruppenführerbereich hat (Admin oder Gruppenführer)."""
    return person.gruppenfuehrer_rolle is not None


def ist_admin(person: Person) -> bool:
    return person.gruppenfuehrer_rolle == "admin"


async def hat_zugriff(db: AsyncSession, person: Person, modul_key: str) -> bool:
    """Ob eine Person auf ein Modul zugreifen darf. Admin-Bypass: Admins immer True."""
    if ist_admin(person):
        return True
    modul = await modul_service.get_by_key(db, modul_key)
    if modul is None:
        return False
    result = await db.execute(
        select(Berechtigung.id).where(
            Berechtigung.person_id == person.id,
            Berechtigung.modul_id == modul.id,
        )
    )
    return result.scalar_one_or_none() is not None


async def meine_keys(db: AsyncSession, person: Person) -> list[str]:
    """Die Modul-Keys, auf die diese Person zugreifen darf. Admins erhalten alle
    registrierten Keys (Admin-Bypass). Grundlage für die Frontend-Guards."""
    module = await modul_service.liste_module(db)
    if ist_admin(person):
        return [m.key for m in module]
    key_by_id = {m.id: m.key for m in module}
    rows = (
        await db.execute(
            select(Berechtigung.modul_id).where(Berechtigung.person_id == person.id)
        )
    ).scalars().all()
    return [key_by_id[mid] for mid in rows if mid in key_by_id]


async def matrix(db: AsyncSession) -> tuple[list[Modul], list[Person], dict[int, set[str]]]:
    """Liefert (Module, elevated Personen, {person_id: set(freigegebene modul_keys)})
    für die Admin-Berechtigungsseite. „Elevated" = Person mit gesetzter
    `gruppenfuehrer_rolle`."""
    module = await modul_service.liste_module(db)
    modul_key_by_id = {m.id: m.key for m in module}

    personen = list(
        (
            await db.execute(
                select(Person).where(Person.gruppenfuehrer_rolle.is_not(None)).order_by(Person.name)
            )
        ).scalars().all()
    )
    berechtigungen = list((await db.execute(select(Berechtigung))).scalars().all())

    keys_je_person: dict[int, set[str]] = {}
    for b in berechtigungen:
        key = modul_key_by_id.get(b.modul_id)
        if key is not None and b.person_id is not None:
            keys_je_person.setdefault(b.person_id, set()).add(key)
    return module, personen, keys_je_person


async def set_berechtigung(
    db: AsyncSession, person_id: int, modul_key: str, erlaubt: bool
) -> bool:
    """Erteilt/entzieht den Modul-Zugriff. Gibt False zurück, wenn Person oder
    Modul nicht existieren (→ 404 im Router)."""
    modul = await modul_service.get_by_key(db, modul_key)
    if modul is None:
        return False
    person = (
        await db.execute(select(Person).where(Person.id == person_id))
    ).scalar_one_or_none()
    if person is None:
        return False

    vorhanden = (
        await db.execute(
            select(Berechtigung).where(
                Berechtigung.person_id == person_id,
                Berechtigung.modul_id == modul.id,
            )
        )
    ).scalar_one_or_none()

    if erlaubt and vorhanden is None:
        db.add(Berechtigung(person_id=person_id, modul_id=modul.id))
        await db.commit()
    elif not erlaubt and vorhanden is not None:
        await db.delete(vorhanden)
        await db.commit()
    return True
