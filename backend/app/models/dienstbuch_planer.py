from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

# --- Kategorien --------------------------------------------------------------


class PlanerKategorie(Base, TimestampMixin):
    """Farbige, mehrfach zuordenbare Kategorie für Planer-Vorlagen/-Termine
    (z. B. um die Belastung bestimmter Funktionen/Gruppen im Kalender sichtbar
    zu machen)."""

    __tablename__ = "planer_kategorien"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # Hex-Farbe, gleiches Validierungsmuster wie app_config-Themefarben.
    farbe: Mapped[str] = mapped_column(String(7), nullable=False)
    reihenfolge: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# --- Association-Tables (reine M:N-Verknüpfung, kein eigenes Model) -----------

dienstbuch_plan_vorlage_kategorien = Table(
    "dienstbuch_plan_vorlage_kategorien",
    Base.metadata,
    Column("vorlage_id", ForeignKey("dienstbuch_plan_vorlagen.id", ondelete="CASCADE"), primary_key=True),
    Column("kategorie_id", ForeignKey("planer_kategorien.id", ondelete="CASCADE"), primary_key=True),
)

dienstbuch_plan_termin_kategorien = Table(
    "dienstbuch_plan_termin_kategorien",
    Base.metadata,
    Column("termin_id", ForeignKey("dienstbuch_plan_termine.id", ondelete="CASCADE"), primary_key=True),
    Column("kategorie_id", ForeignKey("planer_kategorien.id", ondelete="CASCADE"), primary_key=True),
)


# --- Wiederholungsregel (Vorlage) ---------------------------------------------


class DienstbuchPlanVorlage(Base, TimestampMixin):
    """Wiederholungsregel für einen jährlich/periodisch wiederkehrenden
    Dienstbuch-Termin (z. B. „Unterweisung UVV, immer KW 5, Mittwoch,
    ungerade Woche"). Aus einer Vorlage werden pro Jahr konkrete
    `DienstbuchPlanTermin`-Instanzen berechnet (siehe
    `dienstbuch_plan_engine.py`)."""

    __tablename__ = "dienstbuch_plan_vorlagen"

    id: Mapped[int] = mapped_column(primary_key=True)
    titel: Mapped[str] = mapped_column(String(255), nullable=False)
    beschreibung: Mapped[str | None] = mapped_column(Text, nullable=True)

    # "jaehrlich" | "monatlich" | "alle_x_tage" | "alle_x_wochen" |
    # "alle_x_monate" | "alle_x_jahre"
    wiederholungstyp: Mapped[str] = mapped_column(String(32), nullable=False)
    # Das "X" bei den alle_x_...-Typen; NULL bei jaehrlich/monatlich.
    intervall: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 0=Montag..6=Sonntag (wie date.weekday()).
    wochentag: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # 1-53, nur bei wiederholungstyp == "jaehrlich" relevant.
    kalenderwoche: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # "gerade" | "ungerade" | NULL (keine Einschränkung).
    kw_paritaet: Mapped[str | None] = mapped_column(String(16), nullable=True)

    mindest_intervall_aktiv: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # In Tagen gespeichert (nicht Kalendermonaten) - vermeidet Mehrdeutigkeit
    # bei der Überfällig-Berechnung. UI rechnet Monatseingaben um.
    mindest_intervall_tage: Mapped[int | None] = mapped_column(Integer, nullable=True)

    startdatum: Mapped[date] = mapped_column(Date, nullable=False)
    enddatum: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Optionale Beginn-/Endzeit - generierte Jahres-Termine erben sie.
    uhrzeit: Mapped[time | None] = mapped_column(Time, nullable=True)
    endzeit: Mapped[time | None] = mapped_column(Time, nullable=True)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    kategorien: Mapped[list["PlanerKategorie"]] = relationship(
        secondary=dienstbuch_plan_vorlage_kategorien, order_by="PlanerKategorie.reihenfolge"
    )
    termine: Mapped[list["DienstbuchPlanTermin"]] = relationship(back_populates="vorlage")


# --- Konkrete Termin-Instanz pro Jahr -----------------------------------------


class DienstbuchPlanTermin(Base, TimestampMixin):
    """Konkrete Instanz eines Planer-Termins in einem bestimmten Jahr - entweder
    aus einer Vorlage berechnet, manuell einzeln angelegt (vorlage_id NULL) oder
    ein Platzhalter ohne festes Datum. Durchläuft die Stufen Entwurf →
    Bestätigt; ein bestätigter Termin wird am Zieldatum automatisch mit einem
    echten Dienstbuch-Eintrag verknüpft (siehe scheduler.py)."""

    __tablename__ = "dienstbuch_plan_termine"
    __table_args__ = (
        UniqueConstraint("dienstbuch_id", name="uq_dienstbuch_plan_termine_dienstbuch_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    vorlage_id: Mapped[int | None] = mapped_column(
        ForeignKey("dienstbuch_plan_vorlagen.id", ondelete="SET NULL"), nullable=True
    )
    jahr: Mapped[int] = mapped_column(Integer, nullable=False)

    titel: Mapped[str] = mapped_column(String(255), nullable=False)
    beschreibung: Mapped[str | None] = mapped_column(Text, nullable=True)

    # NULL nur bei Platzhaltern (ist_platzhalter=True).
    zieldatum: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Optionale Beginn-/Endzeit zum Zieldatum (z. B. 19:00-21:00) - nur
    # relevant, wenn zieldatum gesetzt ist; endzeit nur zusammen mit uhrzeit.
    uhrzeit: Mapped[time | None] = mapped_column(Time, nullable=True)
    endzeit: Mapped[time | None] = mapped_column(Time, nullable=True)
    # Wird aus zieldatum abgeleitet (siehe dienstbuch_planer_service): gesetzt
    # solange kein Zieldatum feststeht. Kein unabhängig vom Client gesetztes
    # Flag mehr, um Inkonsistenzen (Datum gesetzt, aber ist_platzhalter=True)
    # auszuschließen.
    ist_platzhalter: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # "entwurf" | "bestaetigt"
    status: Mapped[str] = mapped_column(String(16), default="entwurf", nullable=False)

    dienstbuch_id: Mapped[int | None] = mapped_column(
        ForeignKey("dienstbuecher.id", ondelete="SET NULL"), nullable=True
    )
    dienstbuch_erzeugt_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Ankerdatum für die Mindest-Intervall-Überfällig-Berechnung (siehe
    # dienstbuch_planer_service.ueberfaellige_vorlagen) - i.d.R. das Zieldatum
    # dieses Termins, sobald er bestätigt wurde.
    mindest_intervall_letzte_referenz: Mapped[date | None] = mapped_column(Date, nullable=True)

    vorlage: Mapped["DienstbuchPlanVorlage | None"] = relationship(back_populates="termine")
    # Eigene Kopie der Kategorien (bei Erzeugung von der Vorlage übernommen,
    # danach unabhängig - spätere Vorlagen-Änderungen wirken nicht rückwirkend).
    kategorien: Mapped[list["PlanerKategorie"]] = relationship(
        secondary=dienstbuch_plan_termin_kategorien, order_by="PlanerKategorie.reihenfolge"
    )
    ereignisse: Mapped[list["DienstbuchPlanTerminEreignis"]] = relationship(
        back_populates="termin", cascade="all, delete-orphan", order_by="DienstbuchPlanTerminEreignis.zeitpunkt"
    )


# --- Feiertage (manuell gepflegt, Phase 2) ------------------------------------


class PlanerFeiertag(Base, TimestampMixin):
    """Feiertag/Blockiertag im Planer-Kalender. Gesetzliche Feiertage werden
    EINMALIG pro Jahr aus dem Regelwerk `backend/app/data/feiertage_regeln.json`
    in diese Tabelle geseedet (quelle="regel", beim App-Start bzw. beim
    Jahres-Job) - danach ist die DB die einzige Wahrheit und JEDE Zeile ist
    löschbar (Nutzerwunsch). quelle="manuell" = von Hand ergänzt."""

    __tablename__ = "planer_feiertage"

    id: Mapped[int] = mapped_column(primary_key=True)
    datum: Mapped[date] = mapped_column(Date, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    quelle: Mapped[str] = mapped_column(String(16), default="manuell", nullable=False)


# --- Audit-/Timeline-Protokoll ------------------------------------------------


class DienstbuchPlanTerminEreignis(Base):
    """Chronologisches Änderungsprotokoll eines Planer-Termins - analog
    `EinsatzEreignis`, aber mit `akteur_name` von Anfang an (kein Nachrüsten
    wie bei `PersonEreignis`). NULL bei Systemereignissen (automatische
    Jahres-Generierung, automatische Dienstbuch-Verknüpfung durch den
    Tages-Job)."""

    __tablename__ = "dienstbuch_plan_termin_ereignisse"

    id: Mapped[int] = mapped_column(primary_key=True)
    termin_id: Mapped[int] = mapped_column(
        ForeignKey("dienstbuch_plan_termine.id", ondelete="CASCADE"), nullable=False
    )
    zeitpunkt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    typ: Mapped[str] = mapped_column(String(64), nullable=False)
    beschreibung: Mapped[str] = mapped_column(Text, nullable=False)
    akteur_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    termin: Mapped["DienstbuchPlanTermin"] = relationship(back_populates="ereignisse")
