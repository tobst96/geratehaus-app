from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DienstbuchReservierung(Base):
    """Kurzlebiger Reservierungs-Token für die "Barcode vergessen"-Funktion
    im Dienstbuch: QR-Code verweist auf genau dieses Dienstbuch, damit die
    Person sich auf dem eigenen Handy ohne Barcode eintragen kann."""

    __tablename__ = "dienstbuch_reservierungen"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    dienstbuch_id: Mapped[int] = mapped_column(
        ForeignKey("dienstbuecher.id", ondelete="CASCADE"), nullable=False
    )
    vorschau_person_id: Mapped[int | None] = mapped_column(ForeignKey("personen.id"), nullable=True)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    eingeloest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
