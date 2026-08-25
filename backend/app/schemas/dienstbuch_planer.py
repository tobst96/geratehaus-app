from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

HEX_FARBE_PATTERN = r"^#[0-9A-Fa-f]{6}$"

WIEDERHOLUNGSTYPEN = (
    "jaehrlich",
    "monatlich",
    "alle_x_tage",
    "alle_x_wochen",
    "alle_x_monate",
    "alle_x_jahre",
)


class PlanerKategorieAnlegen(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    farbe: str = Field(pattern=HEX_FARBE_PATTERN)
    reihenfolge: int = 0
    aktiv: bool = True


class PlanerKategorieAktualisieren(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    farbe: str | None = Field(default=None, pattern=HEX_FARBE_PATTERN)
    reihenfolge: int | None = None
    aktiv: bool | None = None


class PlanerKategorieOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    farbe: str
    reihenfolge: int
    aktiv: bool


class PlanVorlageAnlegen(BaseModel):
    titel: str = Field(min_length=1, max_length=255)
    beschreibung: str | None = None
    wiederholungstyp: str = Field(pattern="|".join(WIEDERHOLUNGSTYPEN))
    intervall: int | None = Field(default=None, ge=1)
    wochentag: int | None = Field(default=None, ge=0, le=6)
    kalenderwoche: int | None = Field(default=None, ge=1, le=53)
    kw_paritaet: str | None = Field(default=None, pattern="gerade|ungerade")
    mindest_intervall_aktiv: bool = False
    mindest_intervall_tage: int | None = Field(default=None, ge=1)
    startdatum: date
    enddatum: date | None = None
    aktiv: bool = True
    kategorie_ids: list[int] = []


class PlanVorlageAktualisieren(BaseModel):
    titel: str | None = Field(default=None, min_length=1, max_length=255)
    beschreibung: str | None = None
    wiederholungstyp: str | None = Field(default=None, pattern="|".join(WIEDERHOLUNGSTYPEN))
    intervall: int | None = Field(default=None, ge=1)
    wochentag: int | None = Field(default=None, ge=0, le=6)
    kalenderwoche: int | None = Field(default=None, ge=1, le=53)
    kw_paritaet: str | None = Field(default=None, pattern="gerade|ungerade")
    mindest_intervall_aktiv: bool | None = None
    mindest_intervall_tage: int | None = Field(default=None, ge=1)
    startdatum: date | None = None
    enddatum: date | None = None
    aktiv: bool | None = None
    kategorie_ids: list[int] | None = None


class PlanVorlageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titel: str
    beschreibung: str | None
    wiederholungstyp: str
    intervall: int | None
    wochentag: int | None
    kalenderwoche: int | None
    kw_paritaet: str | None
    mindest_intervall_aktiv: bool
    mindest_intervall_tage: int | None
    startdatum: date
    enddatum: date | None
    aktiv: bool
    kategorien: list[PlanerKategorieOut]


class PlanPlatzhalterAnlegen(BaseModel):
    titel: str = Field(min_length=1, max_length=255)
    beschreibung: str | None = None
    jahr: int = Field(ge=2000, le=2200)
    kategorie_ids: list[int] = []


class PlanTerminAnlegen(BaseModel):
    """Manuell angelegter Einzeltermin mit festem Datum (kein Platzhalter, keine
    Vorlage - z. B. per "+ Neuer Termin" oder per Drag&Drop aus dem Kalender)."""

    titel: str = Field(min_length=1, max_length=255)
    beschreibung: str | None = None
    zieldatum: date
    uhrzeit: time | None = None
    endzeit: time | None = None
    kategorie_ids: list[int] = []


class PlanTerminAktualisieren(BaseModel):
    titel: str | None = Field(default=None, min_length=1, max_length=255)
    beschreibung: str | None = None
    # Wird gesetzt (nicht None) -> Termin gilt automatisch nicht mehr als
    # Platzhalter (siehe dienstbuch_planer_service.termin_aktualisieren).
    zieldatum: date | None = None
    uhrzeit: time | None = None
    endzeit: time | None = None
    kategorie_ids: list[int] | None = None


class PlanTerminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vorlage_id: int | None
    vorlage_titel: str | None = None
    jahr: int
    titel: str
    beschreibung: str | None
    zieldatum: date | None
    uhrzeit: time | None
    ist_platzhalter: bool
    status: str
    dienstbuch_id: int | None
    dienstbuch_erzeugt_am: datetime | None
    kategorien: list[PlanerKategorieOut]


class PlanTerminEreignisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    zeitpunkt: datetime
    typ: str
    beschreibung: str
    akteur_name: str | None


class VorlageUeberfaelligOut(BaseModel):
    vorlage_id: int
    titel: str
    letztes_zieldatum: date | None
    tage_ueberfaellig: int


class FeiertagOut(BaseModel):
    datum: date
    name: str
    quelle: str  # "regel" | "manuell"
    id: int | None = None  # nur bei manuellen Einträgen (fürs Löschen)


class FeiertagAnlegen(BaseModel):
    datum: date
    name: str = Field(min_length=1, max_length=255)


class DiveraUebertragung(BaseModel):
    termin_ids: list[int] = Field(min_length=1)
    # Gruppen-NAMEN (Divera akzeptiert Namen via instructions.group.mapping);
    # leer = an alle des Standorts.
    gruppen: list[str] = []
    erinnerung_minuten: int | None = Field(default=None, ge=1)
    send_push: bool = True


class DiveraUebertragungErgebnis(BaseModel):
    termin_id: int
    titel: str
    ok: bool
    fehler: str = ""
