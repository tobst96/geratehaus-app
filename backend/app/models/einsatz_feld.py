from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class EinsatzFeldDefinition(Base, TimestampMixin):
    """Frei vom Moderator konfigurierbares Zusatzfeld für Einsatzberichte,
    z. B. Einsatzleiter, Erste Lage, Tätigkeit. Werte selbst liegen pro
    Einsatz in Einsatz.zusatzfelder (JSON, keyed by schluessel)."""

    __tablename__ = "einsatz_feld_definitionen"

    id: Mapped[int] = mapped_column(primary_key=True)
    schluessel: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    # "text" (eine Zeile), "mehrzeilig" (Textarea) oder "checkbox"
    typ: Mapped[str] = mapped_column(String(32), nullable=False, default="text")
    reihenfolge: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
