import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Wie Einsatz-Felder, plus Typ „auswahl" (Dropdown mit konfigurierbaren Optionen).
ERLAUBTE_TYPEN = {"text", "mehrzeilig", "checkbox", "auswahl"}


def schluessel_aus_label(label: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_")
    return slug or "feld"


class DienstbuchFeldDefinitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schluessel: str
    label: str
    typ: str
    optionen: list[str]
    reihenfolge: int
    aktiv: bool


class DienstbuchFeldDefinitionCreate(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    typ: str = "text"
    optionen: list[str] = Field(default_factory=list)
    reihenfolge: int = 0
    aktiv: bool = True

    @field_validator("typ")
    @classmethod
    def typ_gueltig(cls, wert: str) -> str:
        if wert not in ERLAUBTE_TYPEN:
            raise ValueError(f"typ muss einer von {sorted(ERLAUBTE_TYPEN)} sein")
        return wert

    @field_validator("optionen")
    @classmethod
    def optionen_bereinigen(cls, werte: list[str]) -> list[str]:
        return [w.strip() for w in werte if w and w.strip()]


class DienstbuchFeldDefinitionUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=255)
    typ: str | None = None
    optionen: list[str] | None = None
    reihenfolge: int | None = None
    aktiv: bool | None = None

    @field_validator("typ")
    @classmethod
    def typ_gueltig(cls, wert: str | None) -> str | None:
        if wert is not None and wert not in ERLAUBTE_TYPEN:
            raise ValueError(f"typ muss einer von {sorted(ERLAUBTE_TYPEN)} sein")
        return wert

    @field_validator("optionen")
    @classmethod
    def optionen_bereinigen(cls, werte: list[str] | None) -> list[str] | None:
        if werte is None:
            return None
        return [w.strip() for w in werte if w and w.strip()]
