"""Audit-Log: zentrales Protokollieren sicherheitsrelevanter Aktionen.

Aktionen werden aus den Routern heraus protokolliert (dort ist der auslösende
Moderator bekannt). `protokolliere()` committet selbst, damit der Eintrag auch
dann erhalten bleibt, wenn er nach der eigentlichen (bereits committeten) Aktion
geschrieben wird.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


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
