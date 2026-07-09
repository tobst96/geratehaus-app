from pydantic import BaseModel


class ModulKurz(BaseModel):
    key: str
    name: str


class GruppenfuehrerBerechtigungOut(BaseModel):
    id: int
    username: str
    rolle: str
    ist_admin: bool
    module: list[str]  # keys der freigegebenen Module (bei Admin leer – Vollzugriff via Bypass)


class BerechtigungMatrixOut(BaseModel):
    module: list[ModulKurz]
    gruppenfuehrer: list[GruppenfuehrerBerechtigungOut]


class BerechtigungSetzen(BaseModel):
    erlaubt: bool
