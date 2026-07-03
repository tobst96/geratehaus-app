from pydantic import BaseModel


class FeatureModulOut(BaseModel):
    key: str
    name: str
    mitgliederseitig: bool
    reihenfolge: int
    aktiv: bool
    # Nur bei mitgliederseitigen Modulen gesetzt, sonst None.
    startseite: bool | None = None
    aussenzugriff: bool | None = None


class FeatureModulFlagSetzen(BaseModel):
    aktiv: bool | None = None
    startseite: bool | None = None
    aussenzugriff: bool | None = None


class ReihenfolgeSetzen(BaseModel):
    keys: list[str]
