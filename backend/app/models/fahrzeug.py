from sqlalchemy import Boolean, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Fahrzeug(Base, TimestampMixin):
    __tablename__ = "fahrzeuge"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    buchbar: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    issi: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Liste von Sitzplätzen für die Fahrzeugskizze: [{id, bezeichnung, x, y}, ...]
    # x/y sind Prozentwerte (0-100) relativ zum Fahrzeug-Kasten.
    sitzplaetze: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)

    fahrzeug_tokens = relationship("FahrzeugToken", back_populates="fahrzeug")
