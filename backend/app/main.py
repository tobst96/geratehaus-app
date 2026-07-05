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
    formulare,
    manifest,
    mitglied_login_reservierungen,
    moderator_backup,
    moderator_formular,
    moderator_barcodes,
    moderator_minio,
    moderator_berechtigungen,
    moderator_buchungen,
    moderator_dashboard,
    moderator_einstellungen,
    moderator_listen,
    moderator_meta,
    moderator_feature_module,
    moderator_module,
    moderator_person_kanaele,
    moderator_stammdaten,
    moderator_update,
    oeffentlich,
    person_bild_reservierungen,
    pin,
    push,
    reservierungen,
    setup,
    stammdaten,
)
from app.core.config import settings
from app.core.logging_setup import konfiguriere_logging
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.sentry_setup import init_sentry_wenn_aktiviert
from app.db.session import AsyncSessionLocal
from app.jobs import scheduler
from app.services import modul_service, stammdaten_service
from app.services.config_service import config_service

konfiguriere_logging()


async def _barcodes_vorhanden(db) -> bool:
    """True, wenn bereits Personen-Barcodes existieren – dann nutzt die Instanz
    den Barcode-Login und soll ihn behalten."""
    from sqlalchemy import select

    from app.models.barcode_token import BarcodeToken

    result = await db.execute(select(BarcodeToken.id).limit(1))
    return result.first() is not None


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await config_service.ensure_defaults(db)
        await modul_service.ensure_module(db)
        # Einmalige Übernahme: bestehende Divera-Instanzen (divera_aktiv=true) sollen
        # das neue Divera-Feature-Modul aktiv haben, damit die Divera-Unterseite und
        # -Funktionen weiterhin erreichbar bleiben.
        if not await config_service.get(db, "modul_divera_migration_done", False):
            if await config_service.get(db, "divera_aktiv", False):
                await config_service.set(db, "modul_divera_aktiv", True)
            await config_service.set(db, "modul_divera_migration_done", True)
        # Einmalige Übernahme: Instanzen, die den Barcode-Login bereits nutzen (es
        # existieren Barcode-Tokens), behalten ihn (modul_barcode_aktiv=true).
        # Neue Instanzen starten ohne Barcode-Modul (Namenssuche + PIN).
        if not await config_service.get(db, "modul_barcode_migration_done", False):
            if await _barcodes_vorhanden(db):
                await config_service.set(db, "modul_barcode_aktiv", True)
            await config_service.set(db, "modul_barcode_migration_done", True)
        # Einmalige, idempotente Umbenennung alter durchzählbarer Profilbild-Namen
        # (person-<id>.<ext>) auf Zufallstoken, damit Profilbilder nicht per ID
        # öffentlich abgezählt werden können.
        await stammdaten_service.personenbilder_backfill(db)
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
app.include_router(moderator_backup.router, prefix="/api/v1")
app.include_router(moderator_minio.router, prefix="/api/v1")
app.include_router(moderator_einstellungen.router, prefix="/api/v1")
app.include_router(moderator_stammdaten.router, prefix="/api/v1")
app.include_router(person_bild_reservierungen.router, prefix="/api/v1")
app.include_router(moderator_dashboard.router, prefix="/api/v1")
app.include_router(moderator_listen.router, prefix="/api/v1")
app.include_router(moderator_module.router, prefix="/api/v1")
app.include_router(moderator_feature_module.router, prefix="/api/v1")
app.include_router(moderator_meta.router, prefix="/api/v1")
app.include_router(moderator_berechtigungen.router, prefix="/api/v1")
app.include_router(moderator_person_kanaele.router, prefix="/api/v1")
app.include_router(moderator_buchungen.router, prefix="/api/v1")
app.include_router(push.router, prefix="/api/v1")
app.include_router(divera.router, prefix="/api/v1")
app.include_router(oeffentlich.router, prefix="/api/v1")
app.include_router(pin.router, prefix="/api/v1")
app.include_router(reservierungen.router, prefix="/api/v1")
app.include_router(mitglied_login_reservierungen.router, prefix="/api/v1")
app.include_router(formulare.router, prefix="/api/v1")
app.include_router(moderator_formular.router, prefix="/api/v1")
app.include_router(manifest.router, prefix="/api/v1")
app.include_router(moderator_update.router, prefix="/api/v1")

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
