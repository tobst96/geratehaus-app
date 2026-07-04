from pydantic import BaseModel


class MinioEinstellungen(BaseModel):
    endpoint: str
    console_url: str
    region: str
    access_key: str
    secret_gesetzt: bool
    bucket_backups: str
    bucket_einsaetze: str
    bucket_dienstbuecher: str


class MinioEinstellungenUpdate(BaseModel):
    endpoint: str | None = None
    console_url: str | None = None
    region: str | None = None
    access_key: str | None = None
    secret_key: str | None = None
    bucket_backups: str | None = None
    bucket_einsaetze: str | None = None
    bucket_dienstbuecher: str | None = None


class MinioTestErgebnis(BaseModel):
    ok: bool
    meldung: str
