"""Tests für den Brute-Force-Schutz des Moderator-Logins (Etappe P4, Phase 1):
temporäre Sperre nach zu vielen Fehlversuchen, automatische Freigabe, Reset bei
Erfolg, deaktivierbar über Config."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services import moderator_service
from app.services.config_service import config_service


async def _moderator(db, username="admin", passwort="richtig123"):
    m = Person(name=username, passwort_hash=hash_secret(passwort))
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


async def _login(client, username, passwort):
    return await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": passwort}
    )


@pytest.mark.asyncio
async def test_lockout_nach_max_fehlversuchen(client, db):
    await config_service.set(db, "moderator_login_max_fehlversuche", 5)
    await config_service.set(db, "moderator_login_sperre_minuten", 15)
    await _moderator(db)

    for _ in range(5):
        r = await _login(client, "admin", "falsch")
        assert r.status_code == 401
    # Jetzt gesperrt: selbst das richtige Passwort ergibt 429.
    r = await _login(client, "admin", "richtig123")
    assert r.status_code == 429


@pytest.mark.asyncio
async def test_korrektes_passwort_setzt_zaehler_zurueck(client, db):
    await config_service.set(db, "moderator_login_max_fehlversuche", 5)
    m = await _moderator(db)
    await _login(client, "admin", "falsch")
    await _login(client, "admin", "falsch")
    r = await _login(client, "admin", "richtig123")
    assert r.status_code == 200
    await db.refresh(m)
    assert m.login_fehlversuche == 0


@pytest.mark.asyncio
async def test_sperre_laeuft_automatisch_ab(db):
    await config_service.set(db, "moderator_login_max_fehlversuche", 3)
    m = await _moderator(db)
    for _ in range(3):
        assert await moderator_service.login_pruefen(db, "admin", "falsch") is None
    assert m.login_gesperrt_bis is not None

    m.login_gesperrt_bis = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db.commit()
    res = await moderator_service.login_pruefen(db, "admin", "richtig123")
    assert res is not None
    assert m.login_gesperrt_bis is None
    assert m.login_fehlversuche == 0


@pytest.mark.asyncio
async def test_unbekannter_user_401_ohne_sperre(client, db):
    r = await _login(client, "gibtsnicht", "x")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_lockout_deaktivierbar_ueber_config(db):
    await config_service.set(db, "moderator_login_max_fehlversuche", 0)
    m = await _moderator(db)
    for _ in range(8):
        assert await moderator_service.login_pruefen(db, "admin", "falsch") is None
    assert m.login_gesperrt_bis is None
