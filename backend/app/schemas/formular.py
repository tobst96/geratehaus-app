from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Feldtypen des Formular-Moduls. Dropdowns nutzen `optionen`, „sterne" nutzt `max_sterne`.
ERLAUBTE_FELDTYPEN = {"text", "mehrzeilig", "checkbox", "sterne", "dropdown", "dropdown_mehrfach"}
DROPDOWN_TYPEN = {"dropdown", "dropdown_mehrfach"}


# --- Felder ------------------------------------------------------------------


class FormularFeldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    typ: str
    pflicht: bool
    optionen: list[str]
    max_sterne: int
    reihenfolge: int
    aktiv: bool


class FormularFeldCreate(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    typ: str = "text"
    pflicht: bool = False
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
    moderator_sichtbar: bool
    ablauf_am: datetime | None
    reihenfolge: int
    felder: list[FormularFeldOut] = []


class FormularCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    beschreibung: str | None = None
    aktiv: bool = False
    login_erforderlich: bool = False
    email_empfaenger: str | None = Field(default=None, max_length=255)
    moderator_sichtbar: bool = False
    ablauf_am: datetime | None = None
    reihenfolge: int = 0


class FormularUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    beschreibung: str | None = None
    aktiv: bool | None = None
    login_erforderlich: bool | None = None
    email_empfaenger: str | None = Field(default=None, max_length=255)
    moderator_sichtbar: bool | None = None
    # Ablaufdatum setzen/ändern; explizit null = dauerhaft gültig. `exclude_unset`
    # im Service sorgt dafür, dass ein weggelassenes Feld unverändert bleibt.
    ablauf_am: datetime | None = None
    reihenfolge: int | None = None


class FormularOeffentlichOut(BaseModel):
    """Öffentliche Sicht (Kiosk/Mitglied): nur was zum Ausfüllen nötig ist –
    ohne E-Mail-Empfänger und Moderator-Sichtbarkeit."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    beschreibung: str | None
    login_erforderlich: bool
    felder: list[FormularFeldOut] = []


# --- Einreichungen -----------------------------------------------------------


class EinreichungCreate(BaseModel):
    # Antworten je Feld: {feld_id (als String) -> Wert}. Wert-Typ hängt vom Feldtyp ab
    # (str / bool / int / list[str]); die inhaltliche Validierung macht der Service.
    antworten: dict[str, object] = Field(default_factory=dict)


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
