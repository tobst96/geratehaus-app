from sqlalchemy import Boolean, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class FunktionEinsatz(Base, TimestampMixin):
    """Funktionsbezeichnung für Einsätze, z. B. Gruppenführer, Maschinist."""

    __tablename__ = "funktionen_einsatz"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class FunktionDienststunden(Base, TimestampMixin):
    """Funktionsbezeichnung für Dienststunden, mit eigenem Schwellenwert."""

    __tablename__ = "funktionen_dienststunden"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    schwellenwert_stunden: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
