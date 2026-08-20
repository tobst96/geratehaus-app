"""Regressionstest für den Startup-Schutz gegen unveränderte Default-Secrets
(Sicherheitsaudit-Fund, siehe Backlog Etappe AD)."""

import pytest

from app.core.config import Settings
from app.main import _pruefe_secrets, lifespan


def test_unsichere_default_secrets_erkennt_beide_platzhalter():
    einstellungen = Settings(
        jwt_secret_key="change-me-to-a-random-secret",
        cookie_secret_key="change-me-to-another-random-secret",
    )
    assert einstellungen.unsichere_default_secrets == ["JWT_SECRET_KEY", "COOKIE_SECRET_KEY"]


def test_unsichere_default_secrets_leer_bei_echten_werten():
    einstellungen = Settings(
        jwt_secret_key="ein-echtes-zufaelliges-secret",
        cookie_secret_key="ein-anderes-echtes-secret",
    )
    assert einstellungen.unsichere_default_secrets == []


@pytest.mark.asyncio
async def test_lifespan_bricht_bei_default_secrets_in_production_ab(monkeypatch):
    import app.main as main_modul

    monkeypatch.setattr(main_modul.settings, "environment", "production")
    monkeypatch.setattr(main_modul.settings, "jwt_secret_key", "change-me-to-a-random-secret")
    monkeypatch.setattr(main_modul.settings, "cookie_secret_key", "change-me-to-another-random-secret")

    with pytest.raises(RuntimeError, match="Unsichere Standard-Secrets"):
        async with lifespan(main_modul.app):
            pass


def test_pruefe_secrets_ignoriert_default_secrets_ausserhalb_production(monkeypatch):
    import app.main as main_modul

    monkeypatch.setattr(main_modul.settings, "environment", "test")
    monkeypatch.setattr(main_modul.settings, "jwt_secret_key", "change-me-to-a-random-secret")
    monkeypatch.setattr(main_modul.settings, "cookie_secret_key", "change-me-to-another-random-secret")

    _pruefe_secrets()  # darf nicht raisen


def test_pruefe_secrets_ignoriert_echte_secrets_in_production(monkeypatch):
    import app.main as main_modul

    monkeypatch.setattr(main_modul.settings, "environment", "production")
    monkeypatch.setattr(main_modul.settings, "jwt_secret_key", "ein-echtes-zufaelliges-secret")
    monkeypatch.setattr(main_modul.settings, "cookie_secret_key", "ein-anderes-echtes-secret")

    _pruefe_secrets()  # darf nicht raisen
