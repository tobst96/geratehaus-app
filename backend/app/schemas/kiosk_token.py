from pydantic import BaseModel, ConfigDict, Field


class KioskTokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bezeichnung: str
    token: str
    # None = globale Startseiten-Einstellung; sonst die pro-Kiosk gewählten Keys.
    startseite_module: list[str] | None = None


class KioskTokenAnlegen(BaseModel):
    bezeichnung: str = Field(min_length=1, max_length=255)


class KioskTokenStartseiteModule(BaseModel):
    """None = globale Einstellung nutzen; Liste = genau diese Module anzeigen."""

    startseite_module: list[str] | None = None


class KioskTokenValidierung(BaseModel):
    gueltig: bool
    # Effektiv auf dieser Kiosk-Startseite anzuzeigende Feature-Modul-Keys.
    startseite_module: list[str] = Field(default_factory=list)
