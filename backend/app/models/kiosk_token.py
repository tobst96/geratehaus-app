from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.db.base import Base


class KioskToken(Base):
    """Pro-Gerät-Zugang zum Kiosk-Modus (Tablet im Gerätehaus). Die
    Startseite ist jetzt eine öffentliche Werbe-/Login-Seite; der eigentliche
    Kiosk ist nur über /kiosk/<token> erreichbar, ein eigener Token pro
    Tablet (Admin-Bereich > Kiosk-Geräte)."""

    __tablename__ = "kiosk_tokens"

    id = Column(Integer, primary_key=True)
    bezeichnung = Column(String(255), nullable=False)
    token = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<KioskToken(id={self.id}, bezeichnung={self.bezeichnung!r}, token={self.token[:8]}...)>"
