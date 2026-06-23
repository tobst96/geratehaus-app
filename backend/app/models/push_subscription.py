from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class PushSubscription(Base, TimestampMixin):
    """Browser-Subscription für Web Push. Wird anonym gespeichert – die
    Zuordnung zu einer Person ist für Benachrichtigungen nicht nötig, da
    Web-Push-Nachrichten an alle abonnierten Geräte gleichermaßen gehen."""

    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    endpoint: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    p256dh: Mapped[str] = mapped_column(String(255), nullable=False)
    auth: Mapped[str] = mapped_column(String(255), nullable=False)
