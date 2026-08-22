"""Test-Setup: eigene Postgres-Testdatenbank (kein SQLite, da JSONB und
Postgres-Upsert (`ON CONFLICT`) in mehreren Modellen/Services verwendet
werden). Erwartet eine lokal erreichbare Datenbank `geratehaus_test`
(`createdb geratehaus_test`, peer-auth reicht lokal aus). In CI: per
DATABASE_URL überschreibbar.

Env-Variablen werden VOR jedem App-Import gesetzt, da Settings (.env) sonst
production-nahe Werte laden und main.py beim Import bereits UPLOAD_DIR
anlegt. `DATABASE_URL` bleibt bewusst `setdefault` (CI überschreibt sie
gezielt) - die übrigen werden erzwungen, siehe WICHTIG unten.

WICHTIG: Die Testsuite läuft (scripts/test-backend.sh) über
`docker compose run ... backend`, also im selben Service, dessen `env_file`
die ECHTE `.env` dieser Instanz lädt (u. a. echtes `ENVIRONMENT=production`
+ echte Secrets + echter `UPLOAD_DIR`). Für diese vier Variablen wäre
`setdefault` daher ein No-op (schon gesetzt) - die Tests liefen dann
unbemerkt mit Produktions-Environment/-Secrets statt der Test-Werte. Erst
entdeckt, als ein `environment == "production"`-Check (Cookie-`secure`-Flag)
mangels echtem HTTPS im Testclient reihenweise 401 statt der erwarteten
Werte lieferte - daher hier erzwungene direkte Zuweisung statt `setdefault`."""

import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://localhost:5432/geratehaus_test"
)
os.environ["UPLOAD_DIR"] = "/tmp/geratehaus_test_uploads"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"
os.environ["COOKIE_SECRET_KEY"] = "test-cookie-secret"
os.environ["ENVIRONMENT"] = "test"

from collections.abc import AsyncGenerator  # noqa: E402

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.session import AsyncSessionLocal, engine  # noqa: E402

import app.models  # noqa: E402,F401  (registriert alle Modelle an Base.metadata)


@pytest_asyncio.fixture(scope="session", autouse=True, loop_scope="session")
async def _tabellen_erstellen():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def _tabellen_leeren():
    """Vor jedem Test alle Tabellen leeren, damit Tests sich nicht
    gegenseitig beeinflussen (einfacher als Savepoint-Rollback pro Test).
    config_service hält einen In-Prozess-Cache über app_config – muss nach
    dem Leeren invalidiert werden, sonst sieht der nächste Test veraltete
    (oder inzwischen gelöschte) Werte."""
    from app.services.config_service import config_service

    async with engine.begin() as conn:
        for tabelle in reversed(Base.metadata.sorted_tables):
            await conn.execute(tabelle.delete())
    config_service.invalidate()
    yield


@pytest_asyncio.fixture(autouse=True)
async def _zwei_faktor_pflicht_aus(_tabellen_leeren):
    """2FA-Pflicht ist in Produktion per Default an – für die Testsuite wird sie
    neutralisiert, damit die vielen Endpunkt-Logins weiterhin direkt ein Token
    erhalten (statt einer erzwungenen Einrichtung). Dedizierte Pflicht-Tests
    setzen `zwei_faktor_pflicht` im Test selbst wieder auf True.
    Hängt an `_tabellen_leeren`, läuft also nach dem Leeren der app_config."""
    from app.services.config_service import config_service

    async with AsyncSessionLocal() as session:
        await config_service.set(session, "zwei_faktor_pflicht", False)
    yield


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def _rate_limit_zuruecksetzen():
    """Jeder Test startet mit leerem Rate-Limit-Zähler, sonst würden sich
    Tests, die denselben Endpunkt treffen, gegenseitig blockieren."""
    from app.core.rate_limit import _AUFRUFE

    _AUFRUFE.clear()
    yield
    _AUFRUFE.clear()
