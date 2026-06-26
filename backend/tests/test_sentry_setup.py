from app.core import sentry_setup


def test_code_konstante_wird_ohne_override_verwendet(monkeypatch):
    monkeypatch.setattr(sentry_setup.settings, "sentry_dsn", None)
    assert sentry_setup._aktive_dsn() == sentry_setup.PROJECT_DSN


def test_leerer_override_schaltet_zuverlaessig_aus(monkeypatch):
    monkeypatch.setattr(sentry_setup.settings, "sentry_dsn", "")
    assert sentry_setup.init_sentry_wenn_aktiviert(True) is False


def test_ohne_zustimmung_initialisiert_nicht(monkeypatch):
    monkeypatch.setattr(sentry_setup.settings, "sentry_dsn", None)
    assert sentry_setup.init_sentry_wenn_aktiviert(False) is False


def test_mit_zustimmung_und_code_konstante_initialisiert(monkeypatch):
    monkeypatch.setattr(sentry_setup.settings, "sentry_dsn", None)
    assert sentry_setup.init_sentry_wenn_aktiviert(True) is True


def test_expliziter_override_wird_verwendet(monkeypatch):
    monkeypatch.setattr(sentry_setup.settings, "sentry_dsn", "https://abc@o0.ingest.sentry.io/1")
    assert sentry_setup._aktive_dsn() == "https://abc@o0.ingest.sentry.io/1"
