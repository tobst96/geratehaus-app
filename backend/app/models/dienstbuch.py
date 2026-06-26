from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.gruppe import Gruppe
from app.models.mixins import TimestampMixin
from app.models.person import Person


class Dienstbuch(Base, TimestampMixin):
    __tablename__ = "dienstbuecher"

    id: Mapped[int] = mapped_column(primary_key=True)
    titel: Mapped[str] = mapped_column(Text, nullable=False)
    eroeffnet_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notizen: Mapped[str | None] = mapped_column(Text, nullable=True)
    archiviert: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    geschlossen: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    teilnehmer: Mapped[list["DienstbuchPerson"]] = relationship(
        back_populates="dienstbuch",
        cascade="all, delete-orphan",
        order_by="DienstbuchPerson.id.desc()",
    )


class DienstbuchPerson(Base, TimestampMixin):
    __tablename__ = "dienstbuch_personen"

    id: Mapped[int] = mapped_column(primary_key=True)
    dienstbuch_id: Mapped[int] = mapped_column(
        ForeignKey("dienstbuecher.id", ondelete="CASCADE"), nullable=False
    )
    person_id: Mapped[int] = mapped_column(ForeignKey("personen.id", ondelete="CASCADE"), nullable=False)
    gruppe_id: Mapped[int | None] = mapped_column(ForeignKey("gruppen.id"), nullable=True)
    atemschutzminuten: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    dienstbuch: Mapped["Dienstbuch"] = relationship(back_populates="teilnehmer")
    person: Mapped["Person"] = relationship(viewonly=True)
    gruppe: Mapped["Gruppe | None"] = relationship(viewonly=True)

    @property
    def person_name(self) -> str:
        return self.person.name

    @property
    def gruppe_name(self) -> str | None:
        return self.gruppe.name if self.gruppe else None
