from fastapi import APIRouter

from app.api.deps import CurrentAdmin, DbSession
from app.schemas.audit_log import AuditLogOut
from app.services import audit_service

router = APIRouter(prefix="/moderator/audit", tags=["moderator:audit"])


@router.get("", response_model=list[AuditLogOut])
async def audit_liste(
    db: DbSession, _admin: CurrentAdmin, aktion: str | None = None, limit: int = 200
) -> list[AuditLogOut]:
    """Audit-Protokoll (nur Admin): sicherheitsrelevante Aktionen, neueste zuerst.
    Optional nach `aktion` filterbar; `limit` begrenzt die Anzahl (Default 200)."""
    limit = max(1, min(limit, 1000))
    return await audit_service.liste(db, aktion=aktion, limit=limit)
