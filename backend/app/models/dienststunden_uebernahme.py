from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.funktion import FunktionDienststunden
from app.models.mixins import TimestampMixin
from app.models.person import Person


class DienststundenUebernahme(Base, TimestampMixin):
    """Stunden, die einer Person bei einer Schwellenwert-Überschreitung auf
    Antrag gutgeschrieben ("übernommen") wurden – wird vom Überschuss
    abgezogen, ohne die eigentlichen Dienststunden-Einträge zu verändern."""

    __tablename__ = "dienststunden_uebernahmen"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("personen.id", ondelete="CASCADE"), nullable=False)
    funktion_id: Mapped[int] = mapped_column(
        ForeignKey("funktionen_dienststunden.id", ondelete="CASCADE"), nullable=False
    )
    stunden: Mapped[float] = mapped_column(Float, nullable=False)

    person: Mapped["Person"] = relationship(viewonly=True)
    funktion: Mapped["FunktionDienststunden"] = relationship(viewonly=True)
