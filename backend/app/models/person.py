from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.funktion import FunktionDienststunden
from app.models.gruppe import Gruppe
from app.models.mixins import TimestampMixin


class Person(Base, TimestampMixin):
    """Mitglied der Organisation, identifiziert über den Namens-Cookie.

    `name` ist der vollständige Anzeigename und bleibt die Identität für
    Cookie/Barcode-Auflösung (historisch gewachsen, von vielen Stellen
    referenziert). Bei moderator-gepflegten Personen wird er aus
    vorname/zwischenname/nachname zusammengesetzt und synchron gehalten."""

    __tablename__ = "personen"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    vorname: Mapped[str | None] = mapped_column(String(128), nullable=True)
    zwischenname: Mapped[str | None] = mapped_column(String(128), nullable=True)
    nachname: Mapped[str | None] = mapped_column(String(128), nullable=True)
    bild_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gruppe_id: Mapped[int | None] = mapped_column(ForeignKey("gruppen.id"), nullable=True)
    funktion_id: Mapped[int | None] = mapped_column(
        ForeignKey("funktionen_dienststunden.id"), nullable=True
    )
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pin_gesetzt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # passive_deletes: überlässt das Entfernen abhängiger Zeilen der
    # DB-FK-CASCADE (siehe Migration 0023), statt dass SQLAlchemy versucht,
    # die NOT NULL person_id-Spalte beim Löschen auf NULL zu setzen.
    barcode_tokens = relationship("BarcodeToken", back_populates="person", passive_deletes=True)
    gruppe: Mapped["Gruppe | None"] = relationship(viewonly=True)
    funktion: Mapped["FunktionDienststunden | None"] = relationship(viewonly=True)
