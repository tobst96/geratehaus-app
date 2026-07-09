"""Etappe P2: gruppenfuehrer_stammdaten granular geschaltet – Stammdaten-Config
(Fahrzeuge/Funktionen/Gruppen/Zusatzfelder) = Key `stammdaten`, Personen-
Mutationen = Key `personal`. Admins via Bypass; die bisher für alle Gruppenführer
offenen `CurrentGruppenfuehrer`-Endpunkte (Personen-Liste) bleiben offen (non-breaking)."""

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services import berechtigungs_service, modul_service


async def _token(client, db, username="admin", rolle="admin"):
    m = Person(name=username, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle)
    db.add(m)
    await db.commit()
    await db.refresh(m)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": "geheim123"}
    )
    return m, {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_fahrzeuge_admin_bypass(client, db):
    await modul_service.ensure_module(db)
    _m, h = await _token(client, db)
    assert (await client.get("/api/v1/gruppenfuehrer/stammdaten/fahrzeuge", headers=h)).status_code == 200


@pytest.mark.asyncio
async def test_fahrzeuge_gf_ohne_recht_403(client, db):
    await modul_service.ensure_module(db)
    _m, h = await _token(client, db, "gf", "gruppenfuehrer")
    assert (await client.get("/api/v1/gruppenfuehrer/stammdaten/fahrzeuge", headers=h)).status_code == 403


@pytest.mark.asyncio
async def test_fahrzeuge_gf_mit_stammdaten_ok(client, db):
    await modul_service.ensure_module(db)
    gf, h = await _token(client, db, "gf", "gruppenfuehrer")
    await berechtigungs_service.set_berechtigung(db, gf.id, "stammdaten", True)
    assert (await client.get("/api/v1/gruppenfuehrer/stammdaten/fahrzeuge", headers=h)).status_code == 200


@pytest.mark.asyncio
async def test_personen_mutation_braucht_personal_recht(client, db):
    await modul_service.ensure_module(db)
    gf, h = await _token(client, db, "gf", "gruppenfuehrer")
    # Ohne "personal" → 403; ein "stammdaten"-Recht genügt NICHT.
    await berechtigungs_service.set_berechtigung(db, gf.id, "stammdaten", True)
    r = await client.post(
        "/api/v1/gruppenfuehrer/stammdaten/personen",
        json={"vorname": "Max", "nachname": "Muster"},
        headers=h,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_personen_liste_bleibt_fuer_gruppenfuehrer_offen(client, db):
    # NON-BREAKING: /personen (CurrentGruppenfuehrer) ist weiterhin ohne Freigabe erreichbar.
    await modul_service.ensure_module(db)
    _m, h = await _token(client, db, "gf", "gruppenfuehrer")
    assert (await client.get("/api/v1/gruppenfuehrer/stammdaten/personen", headers=h)).status_code == 200
