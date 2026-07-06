"""Sentry-Konfiguration: Umgebungs-Erkennung (beta/production) und Auslieferung
der Frontend-Konfiguration über /oeffentliche-konfiguration."""

import pytest

from app.core import sentry_setup
from app.services.config_service import config_service


def test_umgebung_aus_version():
    assert sentry_setup._sentry_umgebung("0.5.0b1") == "beta"
    assert sentry_setup._sentry_umgebung("0.5.0-beta.1") == "beta"
    assert sentry_setup._sentry_umgebung("0.5.0") == "production"
    assert sentry_setup._sentry_umgebung("keine-version") == "production"


@pytest.mark.asyncio
async def test_konfig_ohne_zustimmung_ohne_dsn(client, db):
    await config_service.set(db, "fehlerberichte_aktiv", False)
    r = await client.get("/api/v1/oeffentliche-konfiguration")
    assert r.status_code == 200
    d = r.json()
    assert d["fehlerberichte_aktiv"] is False
    assert d["sentry_dsn"] == ""  # ohne Zustimmung keine DSN ans Frontend
    assert d["sentry_environment"] in ("beta", "production")


@pytest.mark.asyncio
async def test_konfig_mit_zustimmung_liefert_dsn(client, db):
    await config_service.set(db, "fehlerberichte_aktiv", True)
    r = await client.get("/api/v1/oeffentliche-konfiguration")
    d = r.json()
    assert d["fehlerberichte_aktiv"] is True
    assert d["sentry_dsn"]  # Code-Konstante PROJECT_DSN (nicht leer)
