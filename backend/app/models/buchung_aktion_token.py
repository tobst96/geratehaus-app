from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BuchungAktionToken(Base):
    """Kurzlebiger, einmal verwendbarer Token, mit dem ein Moderator eine
    Fahrzeugbuchungs-Anfrage direkt aus der Benachrichtigungsmail annehmen
    oder ablehnen kann, ohne sich einzuloggen (Annehmen/Ablehnen-Button in
    der Mail). Anders als die "Barcode vergessen"-Reservierungen (30 Min.
    gültig, für Personen ohne Login) ist dieser Token deutlich länger gültig
    (siehe Service), da Moderatoren ihre Mails nicht sofort lesen."""

    __tablename__ = "buchung_aktion_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    buchung_id: Mapped[int] = mapped_column(
        ForeignKey("fahrzeug_buchungen.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    eingeloest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
