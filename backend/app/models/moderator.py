from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
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
    # Zwei-Faktor-Authentisierung per E-Mail-OTP (opt-in). `otp_*` hält den
    # kurzlebigen Login-Code (Hash + Ablauf + Fehlversuche).
    zwei_faktor_aktiv: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    otp_code_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    otp_ablauf_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_versuche: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class ModeratorRecoveryCode(Base):
    """Gehashter Einmal-Wiederherstellungscode (falls kein Zugriff aufs Postfach)."""

    __tablename__ = "moderator_recovery_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    moderator_id: Mapped[int] = mapped_column(
        ForeignKey("moderatoren.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    benutzt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class ModeratorTrustedDevice(Base):
    """Gehashter Geräte-Token: auf diesem Gerät ist 30 Tage lang kein OTP nötig."""

    __tablename__ = "moderator_trusted_devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    moderator_id: Mapped[int] = mapped_column(
        ForeignKey("moderatoren.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
