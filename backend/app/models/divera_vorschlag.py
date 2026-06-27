from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DiveraVorschlag(Base):
    """Vorschlag aus dem Divera-Personal-Abgleich: entweder eine neue Person
    (`art="neu"`), die in Divera existiert aber noch nicht im System ist, oder
    eine E-Mail-Aktualisierung (`art="email_update"`) für eine bereits
    bestehende Person. Einmal entschiedene (übernommene/ignorierte) Vorschläge
    bleiben über `status` dauerhaft ausgeblendet und werden nach 1 Jahr
    aufgeräumt (siehe divera_personal_service.raeume_alte_vorschlaege_auf)."""

    __tablename__ = "divera_vorschlaege"

    id: Mapped[int] = mapped_column(primary_key=True)
    divera_user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    art: Mapped[str] = mapped_column(String(32), nullable=False)
    vorschlag_daten: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    bestehende_person_id: Mapped[int | None] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="offen")
    erstellt_am: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    entschieden_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
