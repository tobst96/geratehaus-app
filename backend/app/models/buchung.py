from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.fahrzeug import Fahrzeug
from app.models.mixins import TimestampMixin
from app.models.person import Person


class FahrzeugBuchung(Base, TimestampMixin):
    __tablename__ = "fahrzeug_buchungen"

    id: Mapped[int] = mapped_column(primary_key=True)
    fahrzeug_id: Mapped[int] = mapped_column(ForeignKey("fahrzeuge.id"), nullable=False)
    von: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    bis: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    zweck: Mapped[str] = mapped_column(Text, nullable=False)
    verantwortliche_person_id: Mapped[int] = mapped_column(
        ForeignKey("personen.id"), nullable=False
    )
    # "ausstehend", "genehmigt", "abgelehnt", "zurueckgezogen"
    status: Mapped[str] = mapped_column(String(32), default="ausstehend", nullable=False)
    ablehnungsgrund: Mapped[str | None] = mapped_column(Text, nullable=True)
    hat_konflikt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    fahrzeug: Mapped["Fahrzeug"] = relationship(viewonly=True)
    verantwortliche_person: Mapped["Person"] = relationship(viewonly=True)

    @property
    def fahrzeug_name(self) -> str:
        return self.fahrzeug.name

    @property
    def verantwortliche_person_name(self) -> str:
        return self.verantwortliche_person.name
