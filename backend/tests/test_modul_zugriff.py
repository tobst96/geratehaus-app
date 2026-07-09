import pytest
from fastapi import HTTPException

from app.api.deps import require_modul_zugriff
from app.models.person import Person
from app.services import berechtigungs_service, modul_service


async def _moderator(db, username, rolle):
    mod = Person(name=username, passwort_hash="x", moderator_rolle=rolle)
    db.add(mod)
    await db.commit()
    await db.refresh(mod)
    return mod


async def test_require_modul_zugriff_admin_bypass(db):
    await modul_service.ensure_module(db)
    admin = await _moderator(db, "admin", "admin")
    check = require_modul_zugriff("einsatztagebuch")
    assert await check(admin, db) is admin


async def test_require_modul_zugriff_gruppenfuehrer(db):
    await modul_service.ensure_module(db)
    gf = await _moderator(db, "gf", "gruppenfuehrer")
    check = require_modul_zugriff("einsatztagebuch")

    with pytest.raises(HTTPException) as exc:
        await check(gf, db)
    assert exc.value.status_code == 403

    await berechtigungs_service.set_berechtigung(db, gf.id, "einsatztagebuch", True)
    assert await check(gf, db) is gf
