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
    # erstellt_am muss automatisch gesetzt werden (server_default). Fehlt der
    # DB-Default, scheitert der Insert an der NOT-NULL-Bedingung und es entstehen
    # gar keine Vorschläge (siehe Migration 0040 – realer Divera-Bug).
    assert vorschlaege[0].erstellt_am is not None


@pytest.mark.asyncio
async def test_mehrere_neue_personen_ohne_email_erzeugen_alle_vorschlaege(db: AsyncSession):
    """Regressionsschutz: Divera liefert je Consumer nur firstname/lastname
    (keine E-Mail, keine id im Objekt – id ist der Dict-Key). Alle müssen als
    „neu" ankommen, wenn sie noch nicht im System sind."""
    await _divera_aktivieren(db)
    roh = [
        {"id": "753618", "firstname": "Bastian", "lastname": "Sander"},
        {"id": "753657", "firstname": "Benjamin", "lastname": "Sander"},
        {"id": "753664", "firstname": "Björn", "lastname": "Seidel"},
    ]

    with patch("app.services.divera_client.hole_personal", new=AsyncMock(return_value=roh)):
        anzahl = await divera_personal_service.synchronisiere_personal(db)

    assert anzahl == 3
    vorschlaege = await divera_personal_service.liste_offene_vorschlaege(db)
    assert {v.divera_user_id for v in vorschlaege} == {"753618", "753657", "753664"}
    assert all(v.art == "neu" and v.erstellt_am is not None for v in vorschlaege)


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
async def test_alle_neuen_uebernehmen_legt_alle_personen_an(db: AsyncSession):
    for uid, name in [("1", "A A"), ("2", "B B"), ("3", "C C")]:
        db.add(
            DiveraVorschlag(
                divera_user_id=uid,
                art="neu",
                vorschlag_daten={"name": name, "vorname": name.split()[0], "nachname": name.split()[1], "email": None},
                status="offen",
            )
        )
    # Ein E-Mail-Update-Vorschlag darf NICHT mit übernommen werden.
    db.add(
        DiveraVorschlag(
            divera_user_id="9",
            art="email_update",
            vorschlag_daten={"name": "D D", "neue_email": "d@example.org"},
            bestehende_person_id=None,
            status="offen",
        )
    )
    await db.commit()

    anzahl = await divera_personal_service.alle_neuen_uebernehmen(db)

    assert anzahl == 3
    personen = (await db.execute(select(Person).where(Person.divera_user_id.in_(["1", "2", "3"])))).scalars().all()
    assert len(personen) == 3
    # Der E-Mail-Update-Vorschlag bleibt offen.
    offen = await divera_personal_service.liste_offene_vorschlaege(db)
    assert [v.art for v in offen] == ["email_update"]


@pytest.mark.asyncio
async def test_alle_neuen_uebernehmen_mit_namenskollision(db: AsyncSession):
    """Regression: Ein Vorschlag mit bereits vergebenem Namen darf NICHT den
    ganzen Bulk-Insert abbrechen (personen.name ist unique)."""
    db.add(Person(name="Jannick Bremm", vorname="Jannick", nachname="Bremm"))
    await db.commit()

    for uid, name in [("10", "Jannick Bremm"), ("11", "Neu Eins"), ("12", "Neu Zwei")]:
        db.add(
            DiveraVorschlag(
                divera_user_id=uid,
                art="neu",
                vorschlag_daten={"name": name, "vorname": name.split()[0], "nachname": name.split()[1], "email": None},
                status="offen",
            )
        )
    await db.commit()

    # Darf nicht werfen und muss alle drei Vorschläge abschließen.
    anzahl = await divera_personal_service.alle_neuen_uebernehmen(db)
    assert anzahl == 3
    assert await divera_personal_service.liste_offene_vorschlaege(db) == []
    # Die beiden echten Neuen sind angelegt, kein Duplikat für „Jannick Bremm".
    namen = (await db.execute(select(Person.name).where(Person.name == "Jannick Bremm"))).scalars().all()
    assert len(namen) == 1
    assert len((await db.execute(select(Person).where(Person.divera_user_id.in_(["11", "12"])))).scalars().all()) == 2


@pytest.mark.asyncio
async def test_ignorierte_auflisten_und_zuruecksetzen(db: AsyncSession):
    v = DiveraVorschlag(
        divera_user_id="5",
        art="neu",
        vorschlag_daten={"name": "E E", "vorname": "E", "nachname": "E", "email": None},
        status="offen",
    )
    db.add(v)
    await db.commit()

    await divera_personal_service.entscheide_vorschlag(db, v, "ignorieren")

    ignorierte = await divera_personal_service.liste_ignorierte_vorschlaege(db)
    assert len(ignorierte) == 1 and ignorierte[0].divera_user_id == "5"
    assert await divera_personal_service.liste_offene_vorschlaege(db) == []

    anzahl = await divera_personal_service.alle_ignorierten_zuruecksetzen(db)
    assert anzahl == 1
    offen = await divera_personal_service.liste_offene_vorschlaege(db)
    assert len(offen) == 1 and offen[0].status == "offen"
    assert await divera_personal_service.liste_ignorierte_vorschlaege(db) == []


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
