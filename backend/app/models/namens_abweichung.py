from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NamensAbweichung(Base):
    """Protokolliert, wenn der im Cookie gespeicherte Name vom später
    eingetragenen Namen abweicht – für die Moderator-Auswertung (DSGVO-relevant,
    siehe Datenschutzhinweis)."""

    __tablename__ = "namens_abweichungen"

    id: Mapped[int] = mapped_column(primary_key=True)
    cookie_name: Mapped[str] = mapped_column(String(255), nullable=False)
    eingetragener_name: Mapped[str] = mapped_column(String(255), nullable=False)
    zeitstempel: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
