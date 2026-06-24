from pydantic import BaseModel, ConfigDict, Field


class ModeratorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    rolle: str


class ModeratorAnlegen(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    passwort: str = Field(min_length=8)


class ModeratorPasswortAendern(BaseModel):
    passwort: str = Field(min_length=8)
