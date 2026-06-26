from pydantic import BaseModel, Field


class SetupStatus(BaseModel):
    ist_eingerichtet: bool


class SetupRequest(BaseModel):
    organisation_name: str = Field(min_length=1, max_length=255)
    farbe_primaer: str = Field(default="#FFA633", pattern=r"^#[0-9A-Fa-f]{6}$")
    farbe_akzent: str = Field(default="#1A1A1A", pattern=r"^#[0-9A-Fa-f]{6}$")
    geofence_lat: float
    geofence_lon: float
    geofence_radius_meter: float = Field(gt=0)
    admin_passwort: str = Field(min_length=8)
    fehlerberichte_aktiv: bool = False
