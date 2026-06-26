import secrets
from datetime import datetime, timedelta

from app.models.barcode_token import BarcodeToken
from app.models.person import Person


async def _person_mit_barcode(db, name="Erika Musterfrau", abgelaufen=False):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)

    ablauf = datetime.utcnow() - timedelta(days=1) if abgelaufen else datetime.utcnow() + timedelta(days=1)
    token = BarcodeToken(person_id=person.id, token=secrets.token_urlsafe(16), ablauf_am=ablauf)
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return person, token


async def test_barcode_scan_setzt_cookie_und_liefert_namen(client, db):
    person, token = await _person_mit_barcode(db)
    response = await client.post("/api/v1/auth/barcode", json={"token": token.token})
    assert response.status_code == 200
    assert response.json()["name"] == person.name
    assert "geraetehaus_name" in response.cookies


async def test_unbekannter_barcode_liefert_404(client):
    response = await client.post("/api/v1/auth/barcode", json={"token": "existiert-nicht"})
    assert response.status_code == 404


async def test_abgelaufener_barcode_liefert_410(client, db):
    _, token = await _person_mit_barcode(db, abgelaufen=True)
    response = await client.post("/api/v1/auth/barcode", json={"token": token.token})
    assert response.status_code == 410


async def test_barcode_einscannen_wird_rate_limitiert(client, db):
    _, token = await _person_mit_barcode(db)
    letzte_antwort = None
    for _ in range(25):
        letzte_antwort = await client.post("/api/v1/auth/barcode", json={"token": token.token})
    assert letzte_antwort.status_code == 429
