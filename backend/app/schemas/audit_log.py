from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    zeitpunkt: datetime
    akteur: str
    aktion: str
    objekt_typ: str
    objekt_id: int | None
    details: str | None
