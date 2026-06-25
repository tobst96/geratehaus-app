from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SitzplatzReservierung(Base):
    """Kurzlebiger Reservierungs-Token für die "Barcode vergessen"-Funktion:
    QR-Code verweist auf genau diesen Sitzplatz/diese Aktion in genau diesem
    Einsatz, damit die Person sich auf dem eigenen Handy ohne Barcode
    eintragen kann."""

    __tablename__ = "sitzplatz_reservierungen"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    einsatz_id: Mapped[int] = mapped_column(
        ForeignKey("einsaetze.id", ondelete="CASCADE"), nullable=False
    )
    fahrzeug_id: Mapped[int | None] = mapped_column(ForeignKey("fahrzeuge.id"), nullable=True)
    sitzplatz_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bezeichnung: Mapped[str] = mapped_column(String(255), nullable=False)
    nur_geraetehaus: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auf_anfahrt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    eingeloest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Sobald die Person sich auf dem Handy auswählt (noch vor dem Absenden),
    # wird das hier vermerkt, damit das Gerätehaus-Display Name+Bild neben
    # dem QR-Code zeigen kann, ohne auf die endgültige Eintragung zu warten.
    vorschau_person_id: Mapped[int | None] = mapped_column(ForeignKey("personen.id"), nullable=True)
