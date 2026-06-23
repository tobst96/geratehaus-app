from datetime import date

from sqlalchemy import Date, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.funktion import FunktionDienststunden
from app.models.mixins import TimestampMixin
from app.models.person import Person


class Dienststunden(Base, TimestampMixin):
    __tablename__ = "dienststunden"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("personen.id"), nullable=False)
    funktion_id: Mapped[int] = mapped_column(
        ForeignKey("funktionen_dienststunden.id"), nullable=False
    )
    stunden: Mapped[float] = mapped_column(Float, nullable=False)
    datum: Mapped[date] = mapped_column(Date, nullable=False)

    person: Mapped["Person"] = relationship(viewonly=True)
    funktion: Mapped["FunktionDienststunden"] = relationship(viewonly=True)
