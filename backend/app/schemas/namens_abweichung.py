from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NamensAbweichungOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cookie_name: str
    eingetragener_name: str
    zeitstempel: datetime
