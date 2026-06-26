"""Test-Setup: eigene Postgres-Testdatenbank (kein SQLite, da JSONB und
Postgres-Upsert (`ON CONFLICT`) in mehreren Modellen/Services verwendet
werden). Erwartet eine lokal erreichbare Datenbank `geratehaus_test`
(`createdb geratehaus_test`, peer-auth reicht lokal aus). In CI: per
DATABASE_URL überschreibbar.

Env-Variablen werden VOR jedem App-Import gesetzt, da Settings (.env) sonst
production-nahe Werte laden und main.py beim Import bereits UPLOAD_DIR
anlegt."""

import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://localhost:5432/geratehaus_test"
)
os.environ.setdefault("UPLOAD_DIR", "/tmp/geratehaus_test_uploads")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
os.environ.setdefault("COOKIE_SECRET_KEY", "test-cookie-secret")
os.environ.setdefault("ENVIRONMENT", "test")

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
