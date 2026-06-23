from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Moderator(Base, TimestampMixin):
    """Moderator-Account mit JWT-Login. Rolle wird für künftige Mehrbenutzer-/
    Rechteverwaltung mitgeführt, aktuell genügt eine einzige Rolle ("admin")."""

    __tablename__ = "moderatoren"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    passwort_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rolle: Mapped[str] = mapped_column(String(64), default="admin", nullable=False)
