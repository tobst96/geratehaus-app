from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EinsatzEreignis(Base):
    """Chronologisches Ereignisprotokoll eines Einsatzes (Anlage, Eintragungen,
    Aktualisierungen, Abschluss) – Grundlage der Timeline im Moderator-Bereich."""

    __tablename__ = "einsatz_ereignisse"

    id: Mapped[int] = mapped_column(primary_key=True)
    einsatz_id: Mapped[int] = mapped_column(
        ForeignKey("einsaetze.id", ondelete="CASCADE"), nullable=False
    )
    zeitpunkt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    typ: Mapped[str] = mapped_column(String(64), nullable=False)
    beschreibung: Mapped[str] = mapped_column(Text, nullable=False)
