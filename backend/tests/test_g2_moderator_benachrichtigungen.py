"""G2: Pro-Moderator-Opt-in für Admin-/Betriebs-Benachrichtigungen. Der
Empfänger-Resolver vereint opted-in Moderatoren mit der bestehenden globalen
Liste (non-breaking); die API erlaubt das Setzen/Umschalten des Opt-ins, ohne
die E-Mail zu verlieren."""

import pytest

from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.services import moderator_service
from app.services.config_service import config_service


async def _admin_token(client, db, username="admin"):
    db.add(Moderator(username=username, passwort_hash=hash_secret("geheim123"), rolle="admin"))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/moderator/login", data={"username": username, "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_resolver_vereint_moderatoren_und_legacy(db):
    db.add(
        Moderator(
            username="m1",
            passwort_hash="x",
            rolle="admin",
            email="mod@example.org",
            benachrichtigungen_aktiv=True,
        )
    )
    # Nicht opted-in → nicht enthalten.
    db.add(Moderator(username="m2", passwort_hash="x", rolle="admin", email="aus@example.org"))
    await db.commit()
    # Globale Liste (inkl. Dublette zu mod@ in anderer Schreibweise).
    await config_service.set(db, "notifier_email_recipients", "MOD@example.org, extern@example.org")

    empf = await moderator_service.admin_benachrichtigungs_empfaenger(db)
    assert "mod@example.org" in empf
    assert "extern@example.org" in empf
    assert "aus@example.org" not in empf
    # Case-insensitive dedupliziert – „MOD@" nicht doppelt.
    assert sum(1 for e in empf if e.lower() == "mod@example.org") == 1


@pytest.mark.asyncio
async def test_resolver_non_breaking_nur_legacy(db):
    # Ohne opted-in Moderator bleibt die bestehende globale Liste erhalten.
    await config_service.set(db, "notifier_email_recipients", "alt@example.org")
    empf = await moderator_service.admin_benachrichtigungs_empfaenger(db)
    assert empf == ["alt@example.org"]


@pytest.mark.asyncio
async def test_anlegen_mit_opt_in(client, db):
    h = await _admin_token(client, db)
    r = await client.post(
        "/api/v1/moderator/einstellungen/moderatoren",
        json={"username": "neu", "passwort": "geheim123", "email": "neu@example.org", "benachrichtigungen_aktiv": True},
        headers=h,
    )
    assert r.status_code == 201
    assert r.json()["benachrichtigungen_aktiv"] is True


@pytest.mark.asyncio
async def test_patch_toggelt_ohne_email_zu_verlieren(client, db):
    h = await _admin_token(client, db)
    angelegt = (
        await client.post(
            "/api/v1/moderator/einstellungen/moderatoren",
            json={"username": "gf", "passwort": "geheim123", "email": "gf@example.org"},
            headers=h,
        )
    ).json()
    mid = angelegt["id"]

    # Nur das Opt-in umschalten – E-Mail nicht mitsenden → bleibt erhalten.
    r = await client.patch(
        f"/api/v1/moderator/einstellungen/moderatoren/{mid}",
        json={"benachrichtigungen_aktiv": True},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["benachrichtigungen_aktiv"] is True
    assert r.json()["email"] == "gf@example.org"  # nicht verloren
