from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PersonEreignis(Base):
    """Chronologisches Ereignisprotokoll einer Person (z. B. Funktionswechsel) –
    Grundlage der Timeline im Moderator-Bereich."""

    __tablename__ = "person_ereignisse"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=False
    )
    zeitpunkt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    typ: Mapped[str] = mapped_column(String(64), nullable=False)
    beschreibung: Mapped[str] = mapped_column(Text, nullable=False)
