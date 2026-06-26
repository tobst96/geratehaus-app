from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FahrzeugbuchungReservierung(Base):
    """Kurzlebiger Reservierungs-Token für die "Barcode vergessen"-Funktion
    bei Fahrzeugbuchungen: kein Bezug auf eine einzelne Buchung nötig, die
    Person trägt Fahrzeug/Zeitraum/Zweck komplett auf dem eigenen Handy ein."""

    __tablename__ = "fahrzeugbuchung_reservierungen"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    vorschau_person_id: Mapped[int | None] = mapped_column(ForeignKey("personen.id"), nullable=True)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    eingeloest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
