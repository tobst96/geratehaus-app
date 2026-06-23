from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Person(Base, TimestampMixin):
    """Mitglied der Organisation, identifiziert über den Namens-Cookie."""

    __tablename__ = "personen"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    barcode_tokens = relationship("BarcodeToken", back_populates="person")
