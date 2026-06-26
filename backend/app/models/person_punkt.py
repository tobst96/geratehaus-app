from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PersonPunkt(Base):
    """Aktivitätspunkt einer Person mit Gültigkeitsdatum. Abgelaufene Punkte
    fließen nicht mehr in die Gesamtpunkte-Summe ein und werden vom täglichen
    Aufräum-Job entfernt (siehe app/jobs/scheduler.py)."""

    __tablename__ = "person_punkte"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=False
    )
    punkte: Mapped[int] = mapped_column(Integer, nullable=False)
    grund: Mapped[str] = mapped_column(String(64), nullable=False)
    gueltig_bis: Mapped[date] = mapped_column(Date, nullable=False)
    # "halten": Punkte bleiben bis gueltig_bis voll erhalten (Standard).
    # "abziehend": linearer Abbau von `punkte` auf 0, exakt erreicht an gueltig_bis.
    abbau_modus: Mapped[str] = mapped_column(String(16), default="halten", nullable=False)
    erstellt_am: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
