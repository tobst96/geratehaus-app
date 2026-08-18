"""Migrations-Hinweis für erhöhte Zugänge ohne gepflegten Vornamen (z. B.
Alt-Instanzen mit dem anonymen Platzhalter-Admin aus früheren
Setup-Wizard-Versionen) – sowohl im Gruppenführer-Dashboard (JWT-Login) als
auch in /auth/mein-profil (Namens-Cookie-Login)."""

import pytest

from app.core import mitglied_session
from app.core.security import hash_secret
from app.models.person import Person


async def _person(db, name, rolle=None, vorname=None, passwort="geheim123"):
    p = Person(
        name=name,
        vorname=vorname,
        gruppenfuehrer_rolle=rolle,
        passwort_hash=hash_secret(passwort) if passwort else None,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def _login_token(client, name, passwort="geheim123") -> str:
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": name, "password": passwort}
    )
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_dashboard_migration_hinweis_ohne_vorname(client, db):
    await _person(db, "admin", rolle="admin", vorname=None)
    token = await _login_token(client, "admin")

    r = await client.get(
        "/api/v1/gruppenfuehrer/dashboard", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json()["migration_hinweis"] is True


@pytest.mark.asyncio
async def test_dashboard_kein_migration_hinweis_mit_vorname(client, db):
    await _person(db, "Max Mustermann", rolle="admin", vorname="Max")
    token = await _login_token(client, "Max Mustermann")

    r = await client.get(
        "/api/v1/gruppenfuehrer/dashboard", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json()["migration_hinweis"] is False


@pytest.mark.asyncio
async def test_mein_profil_migration_hinweis_ohne_vorname(client, db):
    person = await _person(db, "admin", rolle="admin", vorname=None, passwort=None)
    cookie = mitglied_session.signiere_name(person.name)

    r = await client.get(
        "/api/v1/auth/mein-profil", headers={"Cookie": f"geraetehaus_name={cookie}"}
    )
    assert r.status_code == 200
    assert r.json()["migration_hinweis"] is True


@pytest.mark.asyncio
async def test_mein_profil_kein_migration_hinweis_ohne_rolle(client, db):
    """Normale Mitglieder ohne erhöhten Zugang sollen den Hinweis nie sehen,
    auch wenn ihr Vorname (noch) nicht gepflegt ist."""
    person = await _person(db, "Ohne Rolle", rolle=None, vorname=None, passwort=None)
    cookie = mitglied_session.signiere_name(person.name)

    r = await client.get(
        "/api/v1/auth/mein-profil", headers={"Cookie": f"geraetehaus_name={cookie}"}
    )
    assert r.status_code == 200
    assert r.json()["migration_hinweis"] is False
