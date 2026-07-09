from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
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
    divera_user_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    gruppe_id: Mapped[int | None] = mapped_column(ForeignKey("gruppen.id"), nullable=True)
    funktion_id: Mapped[int | None] = mapped_column(
        ForeignKey("funktionen_dienststunden.id"), nullable=True
    )
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pin_gesetzt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Brute-Force-Schutz für den öffentlichen Name+PIN-Login: Zähler
    # aufeinanderfolgender Fehlversuche und Zeitpunkt, bis zu dem der PIN-Login
    # dieser Person gesperrt ist (NULL = nicht gesperrt; nach Ablauf automatisch frei).
    pin_fehlversuche: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pin_gesperrt_bis: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Zeitpunkt der letzten PIN-Erinnerungsmail (Person ohne PIN); steuert das
    # Intervall des Erinnerungs-Jobs. NULL = noch nie erinnert.
    pin_erinnerung_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    benachrichtigungen_aktiv: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Aktivitäts-Ampel: manuell auf inaktiv gesetzte Personen (z. B. Beurlaubung)
    # werden von Ampel-Färbung und Ampel-Benachrichtigung ausgenommen. Die separate
    # Inaktivitäts-Auto-Löschung bleibt davon unberührt (eigene Schwelle).
    inaktiv: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Zuletzt per Benachrichtigung gemeldete Ampelstufe (gruen/gelb/rot) – damit die
    # Benachrichtigung nur einmal beim Überschreiten einer Schwelle ausgelöst wird.
    ampel_gemeldet: Mapped[str] = mapped_column(String(10), default="gruen", nullable=False)

    # --- Erhöhte Rechte (Moderator/Admin): die Person IST das Konto ---
    # NULL = normale Person; sonst "admin" oder "gruppenfuehrer". Elevated-Personen
    # melden sich am Moderatorbereich mit Name + Passwort (+2FA) an – der PIN oben
    # bleibt für Kiosk/Mitglied. (Ablösung der separaten `moderatoren`-Tabelle.)
    moderator_rolle: Mapped[str | None] = mapped_column(String(64), nullable=True)
    passwort_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # E-Mail-OTP-2FA für den Moderatorbereich (analog zum früheren Moderator-Konto).
    zwei_faktor_aktiv: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    otp_code_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    otp_ablauf_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_versuche: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Brute-Force-Schutz für den Passwort-Login (getrennt vom PIN-Login oben).
    login_fehlversuche: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    login_gesperrt_bis: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # passive_deletes: überlässt das Entfernen abhängiger Zeilen der
    # DB-FK-CASCADE (siehe Migration 0023), statt dass SQLAlchemy versucht,
    # die NOT NULL person_id-Spalte beim Löschen auf NULL zu setzen.
    barcode_tokens = relationship("BarcodeToken", back_populates="person", passive_deletes=True)
    gruppe: Mapped["Gruppe | None"] = relationship(viewonly=True)
    funktion: Mapped["FunktionDienststunden | None"] = relationship(viewonly=True)
