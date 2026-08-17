from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PinSetzenToken(Base):
    """Einmal verwendbarer Token für den Self-Service-Link „PIN setzen": Eine
    Person mit hinterlegter E-Mail bekommt einen Link, über den sie ihren PIN
    selbst setzen kann (ohne Login). Wird sowohl aus dem Kiosk-Fallback
    („PIN anfordern") als auch aus dem periodischen Erinnerungs-Job erzeugt."""

    __tablename__ = "pin_setzen_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    eingeloest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class PasswortSetzenToken(Base):
    """Einmal verwendbarer Token für den Link „Passwort setzen": Eine Person mit
    hinterlegter E-Mail bekommt einen Link, über den sie ihr persönliches Passwort
    (für den Mitglieder-/App-Login) selbst setzt – ohne Login. Analog zu
    `PinSetzenToken`, aber für das Passwort statt den PIN."""

    __tablename__ = "passwort_setzen_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    eingeloest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class PersonFreigabeToken(Base):
    """Token für die Gruppenführer-Freigabe, wenn eine Person ohne E-Mail einen PIN
    anfordert: Die Gruppenführer erhalten eine Mail mit Freigeben/Ablehnen-Link.
    „Freigeben" öffnet eine Seite, auf der für die Person eine E-Mail (und
    optional direkt der PIN) gesetzt wird."""

    __tablename__ = "person_freigabe_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # offen | freigegeben | abgelehnt
    status: Mapped[str] = mapped_column(String(20), default="offen", nullable=False)
