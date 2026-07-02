from pydantic import BaseModel


class ModulKurz(BaseModel):
    key: str
    name: str


class ModeratorBerechtigungOut(BaseModel):
    id: int
    username: str
    rolle: str
    ist_admin: bool
    module: list[str]  # keys der freigegebenen Module (bei Admin leer – Vollzugriff via Bypass)


class BerechtigungMatrixOut(BaseModel):
    module: list[ModulKurz]
    moderatoren: list[ModeratorBerechtigungOut]


class BerechtigungSetzen(BaseModel):
    erlaubt: bool
