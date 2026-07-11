"""Regression: `installierte_version()` muss die AKTUELL deployte Version liefern
(aus `pyproject.toml`), unabhängig von evtl. veralteten Paket-Metadaten.

Hintergrund: Ein gecachter `pip install .`-Layer im Docker-Build kann die
dist-info-Metadaten auf einer alten Version einfrieren. `importlib.metadata.version`
lieferte dann z. B. "0.4.0", obwohl `pyproject.toml` bereits "0.6.0-beta.1" ist →
die beta-Instanz wurde in Sentry fälschlich als `environment=production` / alte
`release` getaggt (Ursache des JAVASCRIPT-39-Rauschens). `pyproject.toml` ist im
Image immer aktuell (per COPY eingebacken), daher die verlässlichere Quelle.
"""

import tomllib
from pathlib import Path

from app.core import sentry_setup
from app.services import update_service


def _pyproject_version() -> str:
    pfad = Path(update_service.__file__).resolve().parents[2] / "pyproject.toml"
    with pfad.open("rb") as f:
        return tomllib.load(f)["project"]["version"]


def test_installierte_version_bevorzugt_pyproject_vor_metadata(monkeypatch):
    # Metadaten simuliert veraltet:
    monkeypatch.setattr(update_service, "version", lambda _name: "0.4.0")
    erwartet = _pyproject_version()
    assert erwartet != "0.4.0"
    assert update_service.installierte_version() == erwartet


def test_umgebung_folgt_pyproject_nicht_veralteter_metadata(monkeypatch):
    # Selbst wenn die Metadaten eine (alte) Stable-Version melden, muss die
    # Sentry-Umgebung der tatsächlich deployten pyproject-Version folgen.
    monkeypatch.setattr(update_service, "version", lambda _name: "0.4.0")
    erwartet = sentry_setup._sentry_umgebung(_pyproject_version())
    assert sentry_setup._sentry_umgebung(update_service.installierte_version()) == erwartet


def test_fallback_auf_metadata_wenn_pyproject_fehlt(monkeypatch):
    # Ist pyproject.toml nicht lesbar, greift der Metadaten-Fallback.
    monkeypatch.setattr(update_service, "_version_aus_pyproject", lambda: None)
    monkeypatch.setattr(update_service, "version", lambda _name: "9.9.9")
    assert update_service.installierte_version() == "9.9.9"
