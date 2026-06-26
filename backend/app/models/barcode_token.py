from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.base import Base


class BarcodeToken(Base):
    __tablename__ = "barcode_tokens"

    id = Column(Integer, primary_key=True)
    person_id = Column(Integer, ForeignKey("personen.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    ablauf_am = Column(DateTime, nullable=True)

    person = relationship("Person", back_populates="barcode_tokens")

    def __repr__(self):
        return f"<BarcodeToken(id={self.id}, person_id={self.person_id}, token={self.token[:8]}...)>"


class FahrzeugToken(Base):
    __tablename__ = "fahrzeug_tokens"

    id = Column(Integer, primary_key=True)
    fahrzeug_id = Column(Integer, ForeignKey("fahrzeuge.id"), nullable=False)
    token = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    fahrzeug = relationship("Fahrzeug", back_populates="fahrzeug_tokens")

    def __repr__(self):
        return f"<FahrzeugToken(id={self.id}, fahrzeug_id={self.fahrzeug_id}, token={self.token[:8]}...)>"
