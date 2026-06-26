from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import (
    auth,
    buchung_aktionen,
    buchungen,
    dienstbuch_reservierungen,
    dienstbuecher,
    dienststunden,
    dienststunden_reservierungen,
    divera,
    einsaetze,
    fahrzeugbuchung_reservierungen,
    manifest,
    mitglied_login_reservierungen,
    moderator_barcodes,
    moderator_buchungen,
    moderator_dashboard,
    moderator_einstellungen,
    moderator_listen,
    moderator_punkte,
    moderator_stammdaten,
    moderator_update,
    oeffentlich,
    person_bild_reservierungen,
    push,
    reservierungen,
    setup,
    stammdaten,
)
from app.core.config import settings
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.sentry_setup import init_sentry_wenn_aktiviert
from app.db.session import AsyncSessionLocal
from app.jobs import scheduler
from app.services.config_service import config_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await config_service.ensure_defaults(db)
        init_sentry_wenn_aktiviert(await config_service.get(db, "fehlerberichte_aktiv", False))
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="Gerätehaus.app",
    lifespan=lifespan,
    # Unter /api/v1/..., damit Swagger über die bestehende Nginx-Proxy-Regel
    # für /api/ erreichbar ist (sonst würde der SPA-Fallback /docs abfangen).
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
)

app.add_middleware(SecurityHeadersMiddleware)

if settings.cors_origins_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(setup.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(stammdaten.router, prefix="/api/v1")
app.include_router(einsaetze.router, prefix="/api/v1")
app.include_router(dienstbuecher.router, prefix="/api/v1")
app.include_router(dienstbuch_reservierungen.router, prefix="/api/v1")
app.include_router(dienststunden.router, prefix="/api/v1")
app.include_router(dienststunden_reservierungen.router, prefix="/api/v1")
app.include_router(fahrzeugbuchung_reservierungen.router, prefix="/api/v1")
app.include_router(buchungen.router, prefix="/api/v1")
app.include_router(buchung_aktionen.router, prefix="/api/v1")
app.include_router(moderator_barcodes.router, prefix="/api/v1")
app.include_router(moderator_einstellungen.router, prefix="/api/v1")
app.include_router(moderator_stammdaten.router, prefix="/api/v1")
app.include_router(person_bild_reservierungen.router, prefix="/api/v1")
app.include_router(moderator_dashboard.router, prefix="/api/v1")
app.include_router(moderator_listen.router, prefix="/api/v1")
app.include_router(moderator_punkte.router, prefix="/api/v1")
app.include_router(moderator_buchungen.router, prefix="/api/v1")
app.include_router(push.router, prefix="/api/v1")
app.include_router(divera.router, prefix="/api/v1")
app.include_router(oeffentlich.router, prefix="/api/v1")
app.include_router(reservierungen.router, prefix="/api/v1")
app.include_router(mitglied_login_reservierungen.router, prefix="/api/v1")
app.include_router(manifest.router, prefix="/api/v1")
app.include_router(moderator_update.router, prefix="/api/v1")

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
