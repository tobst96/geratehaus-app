from pydantic import BaseModel, ConfigDict, Field


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    vorname: str | None
    zwischenname: str | None
    nachname: str | None
    bild_url: str | None
    gruppe_id: int | None


class PersonCreate(BaseModel):
    vorname: str = Field(min_length=1, max_length=128)
    zwischenname: str | None = Field(default=None, max_length=128)
    nachname: str = Field(min_length=1, max_length=128)
    gruppe_id: int | None = None


class PersonUpdate(BaseModel):
    vorname: str | None = Field(default=None, min_length=1, max_length=128)
    zwischenname: str | None = Field(default=None, max_length=128)
    nachname: str | None = Field(default=None, min_length=1, max_length=128)
    gruppe_id: int | None = None
