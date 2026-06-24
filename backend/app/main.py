from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import (
    auth,
    buchungen,
    dienstbuecher,
    dienststunden,
    divera,
    einsaetze,
    manifest,
    moderator_barcodes,
    moderator_buchungen,
    moderator_dashboard,
    moderator_einstellungen,
    moderator_listen,
    moderator_stammdaten,
    oeffentlich,
    push,
    reservierungen,
    setup,
    stammdaten,
)
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.jobs import scheduler
from app.services.config_service import config_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await config_service.ensure_defaults(db)
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Gerätehaus.app", lifespan=lifespan)

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
app.include_router(dienststunden.router, prefix="/api/v1")
app.include_router(buchungen.router, prefix="/api/v1")
app.include_router(moderator_barcodes.router, prefix="/api/v1")
app.include_router(moderator_einstellungen.router, prefix="/api/v1")
app.include_router(moderator_stammdaten.router, prefix="/api/v1")
app.include_router(moderator_dashboard.router, prefix="/api/v1")
app.include_router(moderator_listen.router, prefix="/api/v1")
app.include_router(moderator_buchungen.router, prefix="/api/v1")
app.include_router(push.router, prefix="/api/v1")
app.include_router(divera.router, prefix="/api/v1")
app.include_router(oeffentlich.router, prefix="/api/v1")
app.include_router(reservierungen.router, prefix="/api/v1")
app.include_router(manifest.router, prefix="/api/v1")

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
