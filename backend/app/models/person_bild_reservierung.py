from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PersonBildReservierung(Base):
    """Kurzlebiger Reservierungs-Token, mit dem das Profilbild einer bereits
    angelegten Person per QR-Code vom eigenen Handy aus hochgeladen werden
    kann (Foto aufnehmen oder Datei wählen), ohne Moderator-Login."""

    __tablename__ = "person_bild_reservierungen"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=False
    )
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    eingeloest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
