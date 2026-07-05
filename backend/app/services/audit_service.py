"""Audit-Log: zentrales Protokollieren sicherheitsrelevanter Aktionen.

Aktionen werden aus den Routern heraus protokolliert (dort ist der auslösende
Moderator bekannt). `protokolliere()` committet selbst, damit der Eintrag auch
dann erhalten bleibt, wenn er nach der eigentlichen (bereits committeten) Aktion
geschrieben wird.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.services.config_service import config_service


async def protokolliere(
    db: AsyncSession,
    akteur: str,
    aktion: str,
    objekt_typ: str,
    objekt_id: int | None = None,
    details: str | None = None,
) -> None:
    db.add(
        AuditLog(
            akteur=akteur,
            aktion=aktion,
            objekt_typ=objekt_typ,
            objekt_id=objekt_id,
            details=details,
        )
    )
    await db.commit()


async def liste(
    db: AsyncSession, aktion: str | None = None, limit: int = 200
) -> list[AuditLog]:
    stmt = select(AuditLog).order_by(AuditLog.zeitpunkt.desc(), AuditLog.id.desc())
    if aktion:
        stmt = stmt.where(AuditLog.aktion == aktion)
    stmt = stmt.limit(limit)
    return list((await db.execute(stmt)).scalars().all())


async def aufbewahrung_bereinigen(db: AsyncSession) -> int:
    """Löscht Audit-Einträge, die älter als die konfigurierte Aufbewahrungsfrist
    (`audit_aufbewahrung_tage`) sind – Datenminimierung. 0 = keine Löschung.
    Gibt die Anzahl gelöschter Einträge zurück."""
    tage = int(await config_service.get(db, "audit_aufbewahrung_tage", 365))
    if tage <= 0:
        return 0
    grenze = datetime.now(timezone.utc) - timedelta(days=tage)
    ergebnis = await db.execute(delete(AuditLog).where(AuditLog.zeitpunkt < grenze))
    await db.commit()
    return ergebnis.rowcount or 0
