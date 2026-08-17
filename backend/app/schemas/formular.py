from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Feldtypen des Formular-Moduls. Dropdowns nutzen `optionen`; sterne/skala nutzen
# `max_sterne` als Maximum; datei = Datei-Upload.
ERLAUBTE_FELDTYPEN = {
    "text",
    "mehrzeilig",
    "checkbox",
    "sterne",
    "skala",
    "dropdown",
    "dropdown_mehrfach",
    "datum",
    "zahl",
    "email",
    "telefon",
    "ja_nein",
    "datei",
}
DROPDOWN_TYPEN = {"dropdown", "dropdown_mehrfach"}


# --- Felder ------------------------------------------------------------------


class FormularFeldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    typ: str
    pflicht: bool
    hinweis: str | None
    optionen: list[str]
    max_sterne: int
    reihenfolge: int
    aktiv: bool


class FormularFeldCreate(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    typ: str = "text"
    pflicht: bool = False
    hinweis: str | None = None
    optionen: list[str] = Field(default_factory=list)
    max_sterne: int = Field(default=5, ge=1, le=10)
    reihenfolge: int = 0
    aktiv: bool = True

    @field_validator("typ")
    @classmethod
    def typ_gueltig(cls, wert: str) -> str:
        if wert not in ERLAUBTE_FELDTYPEN:
            raise ValueError(f"typ muss einer von {sorted(ERLAUBTE_FELDTYPEN)} sein")
        return wert


class FormularFeldUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=255)
    typ: str | None = None
    pflicht: bool | None = None
    hinweis: str | None = None
    optionen: list[str] | None = None
    max_sterne: int | None = Field(default=None, ge=1, le=10)
    reihenfolge: int | None = None
    aktiv: bool | None = None

    @field_validator("typ")
    @classmethod
    def typ_gueltig(cls, wert: str | None) -> str | None:
        if wert is not None and wert not in ERLAUBTE_FELDTYPEN:
            raise ValueError(f"typ muss einer von {sorted(ERLAUBTE_FELDTYPEN)} sein")
        return wert


# --- Formulare ---------------------------------------------------------------


class FormularOut(BaseModel):
    """Admin-Sicht auf ein Formular inkl. aller Felder."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    beschreibung: str | None
    aktiv: bool
    login_erforderlich: bool
    email_empfaenger: str | None
    gruppenfuehrer_sichtbar: bool
    start_am: datetime | None
    ablauf_am: datetime | None
    max_einreichungen: int | None
    aufbewahrung_tage: int | None
    danke_text: str | None
    ergebnis_oeffentlich: bool
    einwilligung_text: str | None
    mehrfach_verhindern: bool
    reihenfolge: int
    felder: list[FormularFeldOut] = []


class FormularCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    beschreibung: str | None = None
    aktiv: bool = False
    login_erforderlich: bool = False
    email_empfaenger: str | None = Field(default=None, max_length=255)
    gruppenfuehrer_sichtbar: bool = False
    start_am: datetime | None = None
    ablauf_am: datetime | None = None
    max_einreichungen: int | None = None
    aufbewahrung_tage: int | None = None
    danke_text: str | None = None
    ergebnis_oeffentlich: bool = False
    einwilligung_text: str | None = None
    mehrfach_verhindern: bool = False
    reihenfolge: int = 0


class FormularUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    beschreibung: str | None = None
    aktiv: bool | None = None
    login_erforderlich: bool | None = None
    email_empfaenger: str | None = Field(default=None, max_length=255)
    gruppenfuehrer_sichtbar: bool | None = None
    # Datum-/Text-Felder: explizit null = löschen; weggelassen = unverändert
    # (`model_dump(exclude_unset=True)` im Service).
    start_am: datetime | None = None
    ablauf_am: datetime | None = None
    max_einreichungen: int | None = None
    aufbewahrung_tage: int | None = None
    danke_text: str | None = None
    ergebnis_oeffentlich: bool | None = None
    einwilligung_text: str | None = None
    mehrfach_verhindern: bool | None = None
    reihenfolge: int | None = None


class FormularOeffentlichOut(BaseModel):
    """Öffentliche Sicht (Kiosk/Mitglied): nur was zum Ausfüllen nötig ist –
    ohne E-Mail-Empfänger und Gruppenführer-Sichtbarkeit."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    beschreibung: str | None
    login_erforderlich: bool
    danke_text: str | None
    einwilligung_text: str | None
    ergebnis_oeffentlich: bool
    felder: list[FormularFeldOut] = []


# --- Einreichungen -----------------------------------------------------------


class EinreichungCreate(BaseModel):
    # Antworten je Feld: {feld_id (als String) -> Wert}. Wert-Typ hängt vom Feldtyp ab
    # (str / bool / int / list[str]); die inhaltliche Validierung macht der Service.
    antworten: dict[str, object] = Field(default_factory=dict)
    # DSGVO-Einwilligung (nur nötig, wenn das Formular einen Einwilligungstext hat).
    einwilligung: bool = False
    # Honeypot gegen Bots: von echten Nutzern nie ausgefüllt (verstecktes Feld).
    hp: str = ""


class EinreichungAntwortOut(BaseModel):
    feld_id: int
    label: str
    typ: str
    wert: object


class EinreichungOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    formular_id: int
    person_id: int | None
    person_name: str | None
    antworten: list[EinreichungAntwortOut]
    erstellt_am: datetime


# --- Zusammenfassung / Auswertung --------------------------------------------


class FeldZusammenfassung(BaseModel):
    feld_id: int
    label: str
    typ: str
    anzahl_beantwortet: int
    # Ø bei Sternebewertung
    durchschnitt: float | None = None
    # Anzahl je Ausprägung (Sterne, Dropdown-Optionen, Ja/Nein)
    verteilung: dict[str, int] | None = None
    # Einzelantworten bei Freitextfeldern
    texte: list[str] | None = None


class ZusammenfassungOut(BaseModel):
    formular_id: int
    name: str
    anzahl_einreichungen: int
    ablauf_am: datetime | None
    felder: list[FeldZusammenfassung]
