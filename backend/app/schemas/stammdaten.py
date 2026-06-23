from pydantic import BaseModel, ConfigDict, Field


class FahrzeugOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    aktiv: bool
    buchbar: bool


class FahrzeugCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    aktiv: bool = True
    buchbar: bool = True


class FahrzeugUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    aktiv: bool | None = None
    buchbar: bool | None = None


class FunktionEinsatzOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    aktiv: bool


class FunktionEinsatzCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    aktiv: bool = True


class FunktionEinsatzUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    aktiv: bool | None = None


class FunktionDienststundenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    schwellenwert_stunden: float
    aktiv: bool


class FunktionDienststundenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    schwellenwert_stunden: float = Field(default=0.0, ge=0)
    aktiv: bool = True


class FunktionDienststundenUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    schwellenwert_stunden: float | None = Field(default=None, ge=0)
    aktiv: bool | None = None
