from app.core import sentry_setup


def test_kein_dsn_initialisiert_nie(monkeypatch):
    monkeypatch.setattr(sentry_setup.settings, "sentry_dsn", "")
    assert sentry_setup.init_sentry_wenn_aktiviert(True) is False
    assert sentry_setup.init_sentry_wenn_aktiviert(False) is False


def test_dsn_ohne_zustimmung_initialisiert_nicht(monkeypatch):
    monkeypatch.setattr(sentry_setup.settings, "sentry_dsn", "https://abc@o0.ingest.sentry.io/1")
    assert sentry_setup.init_sentry_wenn_aktiviert(False) is False


def test_dsn_mit_zustimmung_initialisiert(monkeypatch):
    monkeypatch.setattr(sentry_setup.settings, "sentry_dsn", "https://abc@o0.ingest.sentry.io/1")
    assert sentry_setup.init_sentry_wenn_aktiviert(True) is True
