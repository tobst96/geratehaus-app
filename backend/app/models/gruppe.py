from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Gruppe(Base, TimestampMixin):
    """Organisatorische Gruppe einer Person, z. B. 1. Gruppe, Jugendfeuerwehr."""

    __tablename__ = "gruppen"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
