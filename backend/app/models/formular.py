from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin
from app.models.person import Person


class Formular(Base, TimestampMixin):
    """Ein vom Admin konfigurierbares Formular (Rückmeldungen, Anmeldungen,
    Bewertungen, interne Meldungen …)."""

    __tablename__ = "formulare"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    beschreibung: Mapped[str | None] = mapped_column(Text, nullable=True)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Muss vor dem Absenden ein Mitglied angemeldet sein (Name+PIN / Kiosk-Barcode)?
    login_erforderlich: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Formularspezifischer Empfänger, der bei jeder Einreichung per Mail informiert wird.
    email_empfaenger: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Dürfen Gruppenführer/Gruppenführer die Einreichungen sehen (sonst nur Admins)?
    gruppenfuehrer_sichtbar: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Optionales Startdatum (NULL = sofort) und Ablaufdatum (NULL = dauerhaft gültig).
    start_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ablauf_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Wann die Ablauf-Zusammenfassung per Mail verschickt wurde (kein Doppelversand).
    zusammenfassung_gesendet_am: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Kapazität (NULL/0 = unbegrenzt) und Auto-Löschung der Einreichungen nach X Tagen.
    max_einreichungen: Mapped[int | None] = mapped_column(Integer, nullable=True)
    aufbewahrung_tage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Danke-Text nach Absenden; Ergebnis öffentlich zeigen; DSGVO-Einwilligungstext;
    # Mehrfach-Einreichung verhindern (bei Login serverseitig erzwungen).
    danke_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ergebnis_oeffentlich: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    einwilligung_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    mehrfach_verhindern: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reihenfolge: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    felder: Mapped[list["FormularFeld"]] = relationship(
        back_populates="formular",
        cascade="all, delete-orphan",
        order_by="FormularFeld.reihenfolge",
    )


class FormularFeld(Base, TimestampMixin):
    """Ein Feld innerhalb eines Formulars. `optionen` (Dropdowns) und `max_sterne`
    (Sternebewertung) sind typabhängig; Feldtypen siehe schemas/formular.py."""

    __tablename__ = "formular_felder"

    id: Mapped[int] = mapped_column(primary_key=True)
    formular_id: Mapped[int] = mapped_column(
        ForeignKey("formulare.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    typ: Mapped[str] = mapped_column(String(32), nullable=False, default="text")
    pflicht: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Optionaler Hilfetext/Platzhalter unter dem Feld.
    hinweis: Mapped[str | None] = mapped_column(Text, nullable=True)
    optionen: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    max_sterne: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    reihenfolge: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    formular: Mapped["Formular"] = relationship(back_populates="felder")


class FormularEinreichung(Base, TimestampMixin):
    """Eine abgesendete Formular-Antwort. `antworten` ist ein Snapshot der Felder
    zum Einreichzeitpunkt (Liste von {feld_id, label, typ, wert}), damit die
    Einreichung auch nach Formularänderungen lesbar bleibt."""

    __tablename__ = "formular_einreichungen"

    id: Mapped[int] = mapped_column(primary_key=True)
    formular_id: Mapped[int] = mapped_column(
        ForeignKey("formulare.id", ondelete="CASCADE"), nullable=False
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("personen.id", ondelete="SET NULL"), nullable=True
    )
    antworten: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)

    person: Mapped["Person | None"] = relationship(viewonly=True)

    @property
    def person_name(self) -> str | None:
        return self.person.name if self.person else None
