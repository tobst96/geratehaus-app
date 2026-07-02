from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Modul(Base, TimestampMixin):
    """Registrierter Anwendungsbereich für das Berechtigungssystem. Wird aus der
    Modul-Registry (`modul_service.MODUL_REGISTRY`) idempotent geseedet.

    Phase 1 ist bewusst rein additiv/nicht-brechend: `aktiv` ist hier der
    Registry-Status des Moduls und steuert NOCH NICHT die bestehende
    Kiosk-Sichtbarkeit (`modul_*_aktiv` in app_config) oder Zugriffsprüfungen –
    das kommt erst in späteren Phasen."""

    __tablename__ = "module"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    beschreibung: Mapped[str] = mapped_column(Text, default="", nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
