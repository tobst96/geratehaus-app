from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.fahrzeug import Fahrzeug
from app.models.funktion import FunktionEinsatz
from app.models.mixins import TimestampMixin
from app.models.person import Person


class Einsatz(Base, TimestampMixin):
    __tablename__ = "einsaetze"

    id: Mapped[int] = mapped_column(primary_key=True)
    titel: Mapped[str] = mapped_column(String(255), nullable=False)
    # "manuell" oder "divera"
    quelle: Mapped[str] = mapped_column(String(32), default="manuell", nullable=False)
    divera_id: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    zeitpunkt: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="offen", nullable=False)
    archiviert: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Werte der frei konfigurierbaren Zusatzfelder, keyed by EinsatzFeldDefinition.schluessel.
    zusatzfelder: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    teilnahmen: Mapped[list["EinsatzPerson"]] = relationship(
        back_populates="einsatz", cascade="all, delete-orphan"
    )


class EinsatzPerson(Base, TimestampMixin):
    """Teilnahme einer Person an einem Einsatz inkl. Fahrzeug/Funktion/VAB."""

    __tablename__ = "einsatz_personen"

    id: Mapped[int] = mapped_column(primary_key=True)
    einsatz_id: Mapped[int] = mapped_column(
        ForeignKey("einsaetze.id", ondelete="CASCADE"), nullable=False
    )
    person_id: Mapped[int] = mapped_column(ForeignKey("personen.id"), nullable=False)
    fahrzeug_id: Mapped[int | None] = mapped_column(ForeignKey("fahrzeuge.id"), nullable=True)
    sitzplatz_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    funktion_id: Mapped[int | None] = mapped_column(
        ForeignKey("funktionen_einsatz.id"), nullable=True
    )
    vab: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    atemschutzminuten: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    nur_geraetehaus: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bemerkung: Mapped[str | None] = mapped_column(Text, nullable=True)

    einsatz: Mapped["Einsatz"] = relationship(back_populates="teilnahmen")
    person: Mapped["Person"] = relationship(viewonly=True)
    fahrzeug: Mapped["Fahrzeug | None"] = relationship(viewonly=True)
    funktion: Mapped["FunktionEinsatz | None"] = relationship(viewonly=True)

    @property
    def person_name(self) -> str:
        return self.person.name

    @property
    def fahrzeug_name(self) -> str | None:
        return self.fahrzeug.name if self.fahrzeug else None

    @property
    def funktion_name(self) -> str | None:
        return self.funktion.name if self.funktion else None
