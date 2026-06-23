"""Key-Value-Speicher für alle fachlichen/betrieblichen Einstellungen.

Jeder Wert, der von Feuerwehr zu Feuerwehr unterschiedlich sein kann, lebt
hier – niemals als Konstante im Code. Siehe app.services.config_service für
Defaults, Typisierung und Caching.
"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class AppConfig(Base, TimestampMixin):
    __tablename__ = "app_config"

    schluessel: Mapped[str] = mapped_column(String(128), primary_key=True)
    wert: Mapped[str] = mapped_column(Text, nullable=False)
    typ: Mapped[str] = mapped_column(String(32), nullable=False, default="str")
    beschreibung: Mapped[str | None] = mapped_column(Text, nullable=True)
