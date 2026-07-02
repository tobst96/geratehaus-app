from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class PersonEreignisAbo(Base, TimestampMixin):
    """Abonnement einer Person für einen Benachrichtigungs-Ereignistyp. Existenz
    einer Zeile = die Person möchte dieses Ereignis empfangen. Zusammen mit den
    `Benachrichtigungskanal`-Einträgen (Mail/Telegram) steuert das, WER WAS WIE
    bekommt – Ereignis-Benachrichtigungen gehen ausschließlich an Abonnenten über
    deren aktive Kanäle."""

    __tablename__ = "person_ereignis_abos"
    __table_args__ = (
        UniqueConstraint("person_id", "ereignis", name="uq_ereignis_abo_person_ereignis"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("personen.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ereignis: Mapped[str] = mapped_column(String(64), nullable=False)
