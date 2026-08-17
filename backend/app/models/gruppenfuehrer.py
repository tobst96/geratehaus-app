"""2FA-Hilfstabellen für den erhöhten Zugang (Gruppenführer/Admin = Person).

Recovery-Codes und Trusted-Devices hängen an der `Person` (`person_id`). Das
frühere separate `Gruppenführer`-Konto ist entfallen (Person = Konto).
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GruppenfuehrerRecoveryCode(Base):
    """Gehashter Einmal-Wiederherstellungscode (falls kein Zugriff aufs Postfach)."""

    __tablename__ = "gruppenfuehrer_recovery_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=True, index=True
    )
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    benutzt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class GruppenfuehrerTrustedDevice(Base):
    """Gehashter Geräte-Token: auf diesem Gerät ist 30 Tage lang kein OTP nötig."""

    __tablename__ = "gruppenfuehrer_trusted_devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=True, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
