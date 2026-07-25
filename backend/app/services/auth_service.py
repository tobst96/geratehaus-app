from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
