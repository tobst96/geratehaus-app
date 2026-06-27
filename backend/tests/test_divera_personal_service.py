"""Tests für divera_personal_service: Matching (per divera_user_id/Name),
Vorschlag-Erzeugung, Entscheiden, 1-Jahres-Aufräumung."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.divera_vorschlag import DiveraVorschlag
from app.models.person import Person
from app.services import divera_personal_service
from app.services.config_service import config_service


async def _divera_aktivieren(db: AsyncSession) -> None:
    await config_service.set(db, "divera_aktiv", True)
    await config_service.set(db, "divera_api_key", "test-key")


@pytest.mark.asyncio
async def test_neue_person_erzeugt_vorschlag(db: AsyncSession):
    await _divera_aktivieren(db)
    roh = [{"id": 7, "firstname": "Max", "lastname": "Mustermann", "email": "max@example.org"}]

    with patch("app.services.divera_client.hole_personal", new=AsyncMock(return_value=roh)):
        anzahl = await divera_personal_service.synchronisiere_personal(db)

    assert anzahl == 1
    vorschlaege = await divera_personal_service.liste_offene_vorschlaege(db)
    assert len(vorschlaege) == 1
    assert vorschlaege[0].art == "neu"
    assert vorschlaege[0].divera_user_id == "7"
    assert vorschlaege[0].vorschlag_daten["name"] == "Max Mustermann"


@pytest.mark.asyncio
async def test_bestehende_person_per_name_gematcht_kein_neuer_vorschlag(db: AsyncSession):
    await _divera_aktivieren(db)
    person = Person(name="Max Mustermann", vorname="Max", nachname="Mustermann", email="max@example.org")
    db.add(person)
    await db.commit()

    roh = [{"id": 7, "firstname": "Max", "lastname": "Mustermann", "email": "max@example.org"}]
    with patch("app.services.divera_client.hole_personal", new=AsyncMock(return_value=roh)):
        anzahl = await divera_personal_service.synchronisiere_personal(db)

    assert anzahl == 0
    vorschlaege = await divera_personal_service.liste_offene_vorschlaege(db)
    assert vorschlaege == []


@pytest.mark.asyncio
async def test_abweichende_email_erzeugt_email_update_vorschlag(db: AsyncSession):
    await _divera_aktivieren(db)
    person = Person(name="Max Mustermann", vorname="Max", nachname="Mustermann", email="alt@example.org")
    db.add(person)
    await db.commit()

    roh = [{"id": 7, "firstname": "Max", "lastname": "Mustermann", "email": "neu@example.org"}]
    with patch("app.services.divera_client.hole_personal", new=AsyncMock(return_value=roh)):
        anzahl = await divera_personal_service.synchronisiere_personal(db)

    assert anzahl == 1
    vorschlaege = await divera_personal_service.liste_offene_vorschlaege(db)
    assert len(vorschlaege) == 1
    assert vorschlaege[0].art == "email_update"
    assert vorschlaege[0].vorschlag_daten["alte_email"] == "alt@example.org"
    assert vorschlaege[0].vorschlag_daten["neue_email"] == "neu@example.org"
    assert vorschlaege[0].bestehende_person_id == person.id


@pytest.mark.asyncio
async def test_matching_per_divera_user_id_bevorzugt_vor_name(db: AsyncSession):
    """Wenn divera_user_id bereits gesetzt ist, matcht der Sync darüber statt
    über den (ggf. inzwischen geänderten) Namen."""
    await _divera_aktivieren(db)
    person = Person(
        name="Anderer Name", vorname="Anderer", nachname="Name", email="alt@example.org",
        divera_user_id="7",
    )
    db.add(person)
    await db.commit()

    roh = [{"id": 7, "firstname": "Max", "lastname": "Mustermann", "email": "neu@example.org"}]
    with patch("app.services.divera_client.hole_personal", new=AsyncMock(return_value=roh)):
        anzahl = await divera_personal_service.synchronisiere_personal(db)

    assert anzahl == 1
    vorschlaege = await divera_personal_service.liste_offene_vorschlaege(db)
    assert vorschlaege[0].bestehende_person_id == person.id


@pytest.mark.asyncio
async def test_zweiter_sync_erzeugt_keinen_doppelten_vorschlag(db: AsyncSession):
    await _divera_aktivieren(db)
    roh = [{"id": 7, "firstname": "Max", "lastname": "Mustermann", "email": "max@example.org"}]

    with patch("app.services.divera_client.hole_personal", new=AsyncMock(return_value=roh)):
        await divera_personal_service.synchronisiere_personal(db)
        anzahl_zweiter_lauf = await divera_personal_service.synchronisiere_personal(db)

    assert anzahl_zweiter_lauf == 0
    vorschlaege = await divera_personal_service.liste_offene_vorschlaege(db)
    assert len(vorschlaege) == 1


@pytest.mark.asyncio
async def test_uebernehmen_neuer_vorschlag_legt_person_an(db: AsyncSession):
    vorschlag = DiveraVorschlag(
        divera_user_id="7",
        art="neu",
        vorschlag_daten={"divera_user_id": "7", "vorname": "Max", "nachname": "Mustermann", "name": "Max Mustermann", "email": "max@example.org"},
        status="offen",
    )
    db.add(vorschlag)
    await db.commit()

    ergebnis = await divera_personal_service.entscheide_vorschlag(db, vorschlag, "uebernehmen")

    assert ergebnis.status == "uebernommen"
    assert ergebnis.entschieden_am is not None
    result = await db.execute(select(Person).where(Person.divera_user_id == "7"))
    person = result.scalar_one()
    assert person.name == "Max Mustermann"
    assert person.email == "max@example.org"


@pytest.mark.asyncio
async def test_uebernehmen_email_update_aktualisiert_person(db: AsyncSession):
    person = Person(name="Max Mustermann", vorname="Max", nachname="Mustermann", email="alt@example.org")
    db.add(person)
    await db.flush()
    vorschlag = DiveraVorschlag(
        divera_user_id="7",
        art="email_update",
        vorschlag_daten={"alte_email": "alt@example.org", "neue_email": "neu@example.org", "name": "Max Mustermann"},
        bestehende_person_id=person.id,
        status="offen",
    )
    db.add(vorschlag)
    await db.commit()

    await divera_personal_service.entscheide_vorschlag(db, vorschlag, "uebernehmen")

    await db.refresh(person)
    assert person.email == "neu@example.org"
    assert person.divera_user_id == "7"


@pytest.mark.asyncio
async def test_ignorieren_setzt_status_ohne_aenderung(db: AsyncSession):
    vorschlag = DiveraVorschlag(
        divera_user_id="7",
        art="neu",
        vorschlag_daten={"name": "Max Mustermann"},
        status="offen",
    )
    db.add(vorschlag)
    await db.commit()

    ergebnis = await divera_personal_service.entscheide_vorschlag(db, vorschlag, "ignorieren")

    assert ergebnis.status == "ignoriert"
    result = await db.execute(select(Person))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_raeumt_vorschlaege_aelter_als_ein_jahr_auf(db: AsyncSession):
    alt = DiveraVorschlag(
        divera_user_id="1",
        art="neu",
        vorschlag_daten={"name": "Alt"},
        status="ignoriert",
        erstellt_am=datetime.now(timezone.utc) - timedelta(days=400),
    )
    neu = DiveraVorschlag(
        divera_user_id="2",
        art="neu",
        vorschlag_daten={"name": "Neu"},
        status="offen",
        erstellt_am=datetime.now(timezone.utc),
    )
    db.add_all([alt, neu])
    await db.commit()

    anzahl = await divera_personal_service.raeume_alte_vorschlaege_auf(db)

    assert anzahl == 1
    result = await db.execute(select(DiveraVorschlag))
    verbleibend = result.scalars().all()
    assert len(verbleibend) == 1
    assert verbleibend[0].divera_user_id == "2"


@pytest.mark.asyncio
async def test_sync_deaktiviert_macht_nichts(db: AsyncSession):
    await config_service.set(db, "divera_aktiv", False)
    with patch("app.services.divera_client.hole_personal", new=AsyncMock(return_value=[])) as mock_fn:
        anzahl = await divera_personal_service.synchronisiere_personal(db)
    assert anzahl == 0
    mock_fn.assert_not_called()
