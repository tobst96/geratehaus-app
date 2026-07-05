from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
    """Modulübergreifendes Audit-Protokoll sicherheitsrelevanter Aktionen
    (Löschungen, Freigaben, Rechteänderungen): wer, wann, was. Bewusst ohne
    Fremdschlüssel auf das betroffene Objekt (das kann bereits gelöscht sein) –
    `objekt_typ`/`objekt_id`/`details` halten die Nachvollziehbarkeit fest.
    Nur für Admins einsehbar."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    zeitpunkt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # Benutzername des auslösenden Moderators (kein FK: der Zugang kann später
    # umbenannt/gelöscht werden, das Protokoll soll erhalten bleiben).
    akteur: Mapped[str] = mapped_column(String(255), nullable=False)
    # Maschinenlesbare Aktion, z. B. "person_geloescht", "buchung_genehmigt".
    aktion: Mapped[str] = mapped_column(String(64), nullable=False)
    objekt_typ: Mapped[str] = mapped_column(String(64), nullable=False)
    objekt_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Menschlesbare Kurzbeschreibung (Name des gelöschten Objekts o. Ä.).
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
