from app.core.security import hash_secret
from app.models.person import Person
from app.services.update_service import _ist_neuer, _passende_release


def test_beta_kanal_ueberspringt_stable():
    # Neuestes Release ist ein Stable, daneben eine ältere Prerelease.
    releases = [
        {"tag_name": "v0.4.1", "prerelease": False, "draft": False},
        {"tag_name": "v0.4.0-beta.1", "prerelease": True, "draft": False},
    ]
    assert _passende_release(releases, "stable")["tag_name"] == "v0.4.1"
    # Beta-Kanal darf NICHT auf das Stable zeigen, sondern auf die Prerelease.
    assert _passende_release(releases, "beta")["tag_name"] == "v0.4.0-beta.1"


def test_beta_kanal_ohne_prerelease_gibt_none():
    releases = [{"tag_name": "v0.4.1", "prerelease": False, "draft": False}]
    assert _passende_release(releases, "beta") is None


def test_ist_neuer_verhindert_downgrade():
    assert _ist_neuer("0.4.1", "0.4.0") is True
    assert _ist_neuer("0.4.0", "0.4.1") is False  # älter → kein Update
    assert _ist_neuer("0.4.0", "0.4.0") is False  # gleich → kein Update
    # Genau der gemeldete Fall: installiert 0.4.0 (final), Beta-Kanal bietet die
    # ältere 0.4.0-beta.1 → darf NICHT als Update/Downgrade erscheinen.
    assert _ist_neuer("0.4.0-beta.1", "0.4.0") is False
    assert _ist_neuer("0.4.0", "0.4.0-beta.1") is True


async def _admin_token(client, db):
    moderator = Person(name="admin", passwort_hash=hash_secret("geheim123"), moderator_rolle="admin")
    db.add(moderator)
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def test_update_status_ohne_login_verweigert(client):
    response = await client.get("/api/v1/moderator/update")
    assert response.status_code == 401


async def test_update_status_default_kanal_ist_stable(client, db):
    token = await _admin_token(client, db)
    response = await client.get(
        "/api/v1/moderator/update", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["kanal"] == "stable"


async def test_update_kanal_auf_beta_umschalten(client, db):
    token = await _admin_token(client, db)
    response = await client.put(
        "/api/v1/moderator/update/kanal",
        json={"kanal": "beta"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["kanal"] == "beta"

    erneut = await client.get(
        "/api/v1/moderator/update", headers={"Authorization": f"Bearer {token}"}
    )
    assert erneut.json()["kanal"] == "beta"


async def test_update_kanal_ungueltiger_wert_abgelehnt(client, db):
    token = await _admin_token(client, db)
    response = await client.put(
        "/api/v1/moderator/update/kanal",
        json={"kanal": "nightly"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422
