from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Berechtigung(Base, TimestampMixin):
    """Individueller Modul-Zugriff eines Gruppenführers (statt rollenbasiert).
    Existenz einer Zeile = Zugriff erlaubt. Admins haben über den Admin-Bypass
    in `berechtigungs_service` immer Vollzugriff (unabhängig von diesen Zeilen).

    Phase 2 ist noch OHNE Enforcement: die Daten werden gepflegt, die bestehenden
    `CurrentAdmin`/`CurrentGruppenfuehrer`-Prüfungen bleiben unverändert (Phase 4)."""

    __tablename__ = "berechtigungen"
    __table_args__ = (
        UniqueConstraint("person_id", "modul_id", name="uq_berechtigung_person_modul"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=True, index=True
    )
    modul_id: Mapped[int] = mapped_column(
        ForeignKey("module.id", ondelete="CASCADE"), nullable=False, index=True
    )
