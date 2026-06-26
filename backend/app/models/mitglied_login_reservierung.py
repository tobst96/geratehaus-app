from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MitgliedLoginReservierung(Base):
    """"Barcode vergessen" für den Mitglieder-Login: QR-Code führt auf eine
    Seite, auf der man sich per Namenssuche (+ PIN, falls gesetzt) selbst
    identifiziert. Das ursprüngliche Gerät (das den QR-Code zeigt) pollt den
    Status und setzt sich selbst den Namens-Cookie, sobald die Auswahl
    bestätigt wurde – die Identität wird also nicht auf dem Handy "übernommen",
    sondern dem ursprünglichen Gerät zugewiesen."""

    __tablename__ = "mitglied_login_reservierungen"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    erstellt_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ablauf_am: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("personen.id"), nullable=True)
    bestaetigt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    eingeloest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
