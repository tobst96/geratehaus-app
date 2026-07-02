from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Benachrichtigungskanal(Base, TimestampMixin):
    """Bevorzugter Benachrichtigungsweg einer Person (Phase 3). `typ` ist ein Key
    aus der Kanal-Registry (`benachrichtigungskanal_service.KANAL_TYPEN`, z. B.
    mail/telegram), `zielwert` die E-Mail-Adresse bzw. Chat-ID. Ein Kanal je
    (person, typ).

    Additiv/nicht-brechend: das bestehende Notifier-Routing bleibt in dieser Phase
    unverändert – die Verdrahtung dieser Kanäle in den Versand folgt später."""

    __tablename__ = "benachrichtigungskanaele"
    __table_args__ = (UniqueConstraint("person_id", "typ", name="uq_kanal_person_typ"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=False, index=True
    )
    typ: Mapped[str] = mapped_column(String(32), nullable=False)
    zielwert: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
