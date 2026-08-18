"""Etappe P2 („Phase 5"): die vier Gruppenführer-Arbeitsbereiche
(einsatztagebuch/dienstbuch/dienststunden/fahrzeugbuchung) sind jetzt granular
über `require_modul_zugriff` geschützt statt „jeder Gruppenführer".

- Admin → Zugriff via Bypass (200),
- Gruppenführer ohne Recht → 403,
- Gruppenführer mit Recht → 200,
- Kiosk-/Mitglieder-Endpunkte desselben Bereichs bleiben ungegatet (Regression),
- Anti-Aussperr-Seed erteilt bestehenden Gruppenführern die vier Rechte.
"""

import pytest
from sqlalchemy import text

from app.core.security import hash_secret
from app.models.person import Person
from app.services import berechtigungs_service, modul_service
from app.services.config_service import config_service

# (Listen-Endpunkt, Berechtigungs-Key) je Arbeitsbereich – Listen brauchen keine
# vorhandenen Daten (leere Liste genügt fürs Gate).
BEREICHE = [
    ("/api/v1/gruppenfuehrer/listen/einsaetze", "einsatztagebuch"),
    ("/api/v1/gruppenfuehrer/listen/dienstbuecher", "dienstbuch"),
    ("/api/v1/gruppenfuehrer/listen/dienststunden", "dienststunden"),
    ("/api/v1/gruppenfuehrer/listen/buchungen", "fahrzeugbuchung"),
]


async def _token(client, db, username="admin", rolle="admin"):
    m = Person(name=username, email=username, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle)
    db.add(m)
    await db.commit()
    await db.refresh(m)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": "geheim123"}
    )
    return m, {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
@pytest.mark.parametrize("pfad,key", BEREICHE)
async def test_admin_bypass(client, db, pfad, key):
    await modul_service.ensure_module(db)
    _m, h = await _token(client, db)
    assert (await client.get(pfad, headers=h)).status_code == 200


@pytest.mark.asyncio
@pytest.mark.parametrize("pfad,key", BEREICHE)
async def test_gruppenfuehrer_ohne_recht_403(client, db, pfad, key):
    await modul_service.ensure_module(db)
    _m, h = await _token(client, db, "gf", "gruppenfuehrer")
    assert (await client.get(pfad, headers=h)).status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("pfad,key", BEREICHE)
async def test_gruppenfuehrer_mit_recht_200(client, db, pfad, key):
    await modul_service.ensure_module(db)
    gf, h = await _token(client, db, "gf", "gruppenfuehrer")
    await berechtigungs_service.set_berechtigung(db, gf.id, key, True)
    assert (await client.get(pfad, headers=h)).status_code == 200


@pytest.mark.asyncio
async def test_recht_ist_bereichsspezifisch(client, db):
    # Ein Recht schaltet NUR seinen Bereich frei, nicht die anderen.
    await modul_service.ensure_module(db)
    gf, h = await _token(client, db, "gf", "gruppenfuehrer")
    await berechtigungs_service.set_berechtigung(db, gf.id, "dienstbuch", True)
    assert (await client.get("/api/v1/gruppenfuehrer/listen/dienstbuecher", headers=h)).status_code == 200
    assert (await client.get("/api/v1/gruppenfuehrer/listen/einsaetze", headers=h)).status_code == 403


@pytest.mark.asyncio
async def test_kiosk_leseendpunkt_bleibt_ungegatet(client, db):
    # NON-BREAKING: die mitglieder-/kioskseitige Einsatzliste (require_zugriff)
    # ist NICHT vom Modul-Recht abhängig – ein Gruppenführer ohne
    # „einsatztagebuch"-Recht erreicht sie weiterhin (Gruppenführer-JWT genügt fürs Gate).
    await modul_service.ensure_module(db)
    await config_service.set(db, "modul_einsatztagebuch_aktiv", True)
    _m, h = await _token(client, db, "gf", "gruppenfuehrer")
    assert (await client.get("/api/v1/einsaetze", headers=h)).status_code == 200


@pytest.mark.asyncio
async def test_anti_aussperr_seed(client, db):
    # Bildet die Migration 0059 nach: bestehende Gruppenführer bekommen genau die
    # vier Arbeitsbereichs-Rechte, Admins nichts (die brauchen den Bypass).
    await modul_service.ensure_module(db)
    gf = Person(name="alt-gf", email="alt-gf", passwort_hash=hash_secret("x"), gruppenfuehrer_rolle="gruppenfuehrer")
    admin = Person(name="alt-admin", email="alt-admin", passwort_hash=hash_secret("x"), gruppenfuehrer_rolle="admin")
    db.add_all([gf, admin])
    await db.commit()
    await db.refresh(gf)
    await db.refresh(admin)

    await db.execute(
        text(
            """
            INSERT INTO berechtigungen (person_id, modul_id)
            SELECT p.id, md.id
            FROM personen p
            CROSS JOIN module md
            WHERE p.gruppenfuehrer_rolle IS NOT NULL AND p.gruppenfuehrer_rolle <> 'admin'
              AND md.key IN ('einsatztagebuch','dienstbuch','dienststunden','fahrzeugbuchung')
              AND NOT EXISTS (
                  SELECT 1 FROM berechtigungen b
                  WHERE b.person_id = p.id AND b.modul_id = md.id
              )
            """
        )
    )
    await db.commit()

    gf_keys = set(await berechtigungs_service.meine_keys(db, gf))
    assert {"einsatztagebuch", "dienstbuch", "dienststunden", "fahrzeugbuchung"} <= gf_keys
    # Kein Seed-Eintrag für Admins (die haben ohnehin alles via Bypass).
    rows = (
        await db.execute(
            text("SELECT count(*) FROM berechtigungen WHERE person_id = :mid"),
            {"mid": admin.id},
        )
    ).scalar_one()
    assert rows == 0
