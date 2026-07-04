from sqlalchemy import BigInteger, Boolean, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Backup(Base, TimestampMixin):
    """Metadaten je erzeugtem Backup – Grundlage für den Backup-Browser im Modul.
    Die eigentliche (verschlüsselte) Backup-Datei liegt in den konfigurierten
    Zielen (lokaler Ordner, WebDAV …), nicht in der DB."""

    __tablename__ = "backups"

    id: Mapped[int] = mapped_column(primary_key=True)
    dateiname: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    groesse_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    # Komma-getrennte Liste der Ziele, an die tatsächlich geschrieben wurde.
    ziele: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    # "geplant" oder "manuell".
    ausloeser: Mapped[str] = mapped_column(String(32), default="manuell", nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="ok", nullable=False)  # ok | fehler
    fehlermeldung: Mapped[str | None] = mapped_column(Text, nullable=True)
    verschluesselt: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Kurz-Zusammenfassung des Inhalts (Tabellen+Anzahlen, Dateianzahl) fürs Browsen.
    zusammenfassung: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
