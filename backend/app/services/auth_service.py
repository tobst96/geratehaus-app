from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.namens_abweichung import NamensAbweichung
from app.models.person import Person


async def get_or_create_person(db: AsyncSession, name: str) -> Person:
    result = await db.execute(select(Person).where(Person.name == name))
    person = result.scalar_one_or_none()
    if person is None:
        person = Person(name=name)
        db.add(person)
        await db.commit()
        await db.refresh(person)
    return person


async def protokolliere_namensabweichung(
    db: AsyncSession, cookie_name: str, eingetragener_name: str
) -> None:
    db.add(
        NamensAbweichung(cookie_name=cookie_name, eingetragener_name=eingetragener_name)
    )
    await db.commit()


async def liste_namensabweichungen(db: AsyncSession) -> list[NamensAbweichung]:
    result = await db.execute(select(NamensAbweichung).order_by(NamensAbweichung.zeitstempel.desc()))
    return list(result.scalars().all())
