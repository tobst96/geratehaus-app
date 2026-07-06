from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Moderator(Base, TimestampMixin):
    """Moderator-Account mit JWT-Login. Rolle wird für künftige Mehrbenutzer-/
    Rechteverwaltung mitgeführt, aktuell genügt eine einzige Rolle ("admin")."""

    __tablename__ = "moderatoren"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    passwort_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rolle: Mapped[str] = mapped_column(String(64), default="admin", nullable=False)
    # Optionale E-Mail des Zugangs – Grundlage für pro-Zugang-Benachrichtigungen
    # und E-Mail-OTP-2FA.
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Brute-Force-Schutz für den Moderator-Login: Zähler aufeinanderfolgender
    # Fehlversuche und Zeitpunkt, bis zu dem der Login gesperrt ist (NULL = frei;
    # nach Ablauf automatisch wieder frei).
    login_fehlversuche: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    login_gesperrt_bis: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
