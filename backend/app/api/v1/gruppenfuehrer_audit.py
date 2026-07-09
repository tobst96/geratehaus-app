from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentAdmin, DbSession
from app.schemas.audit_log import AuditLogOut
from app.services import audit_service

router = APIRouter(prefix="/gruppenfuehrer/audit", tags=["gruppenfuehrer:audit"])


@router.get("", response_model=list[AuditLogOut])
async def audit_liste(
    db: DbSession, _admin: CurrentAdmin, aktion: str | None = None, limit: int = 200
) -> list[AuditLogOut]:
    """Audit-Protokoll (nur Admin): sicherheitsrelevante Aktionen, neueste zuerst.
    Optional nach `aktion` filterbar; `limit` begrenzt die Anzahl (Default 200)."""
    limit = max(1, min(limit, 1000))
    return await audit_service.liste(db, aktion=aktion, limit=limit)


@router.get("/export")
async def audit_export(
    db: DbSession, _admin: CurrentAdmin, format: str = "csv", aktion: str | None = None
) -> Response:
    """Vollständiger Export des Audit-Protokolls (nur Admin) als CSV oder JSON,
    optional nach `aktion` gefiltert."""
    if format not in ("csv", "json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Ungültiges Format (csv oder json)."
        )
    eintraege = await audit_service.liste(db, aktion=aktion, limit=100_000)
    if format == "json":
        return Response(
            content=audit_service.json_export(eintraege),
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="audit-log.json"'},
        )
    return Response(
        content="﻿" + audit_service.csv_export(eintraege),  # BOM → Excel erkennt UTF-8
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="audit-log.csv"'},
    )
