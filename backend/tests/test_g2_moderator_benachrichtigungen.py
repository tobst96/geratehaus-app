"""G2: Pro-Moderator-Opt-in für Admin-/Betriebs-Benachrichtigungen. Der
Empfänger-Resolver vereint opted-in Moderatoren mit der bestehenden globalen
Liste (non-breaking); die API erlaubt das Setzen/Umschalten des Opt-ins, ohne
die E-Mail zu verlieren."""

import pytest

from app.models.person import Person
from app.services import gruppenfuehrer_service
from app.services.config_service import config_service


@pytest.mark.asyncio
async def test_resolver_vereint_moderatoren_und_legacy(db):
    db.add(
        Person(
            name="m1",
            passwort_hash="x",
            gruppenfuehrer_rolle="admin",
            email="mod@example.org",
            benachrichtigungen_aktiv=True,
        )
    )
    # Nicht opted-in → nicht enthalten.
    db.add(Person(name="m2", passwort_hash="x", gruppenfuehrer_rolle="admin", email="aus@example.org"))
    await db.commit()
    # Globale Liste (inkl. Dublette zu mod@ in anderer Schreibweise).
    await config_service.set(db, "notifier_email_recipients", "MOD@example.org, extern@example.org")

    empf = await gruppenfuehrer_service.admin_benachrichtigungs_empfaenger(db)
    assert "mod@example.org" in empf
    assert "extern@example.org" in empf
    assert "aus@example.org" not in empf
    # Case-insensitive dedupliziert – „MOD@" nicht doppelt.
    assert sum(1 for e in empf if e.lower() == "mod@example.org") == 1


@pytest.mark.asyncio
async def test_resolver_non_breaking_nur_legacy(db):
    # Ohne opted-in Moderator bleibt die bestehende globale Liste erhalten.
    await config_service.set(db, "notifier_email_recipients", "alt@example.org")
    empf = await gruppenfuehrer_service.admin_benachrichtigungs_empfaenger(db)
    assert empf == ["alt@example.org"]
