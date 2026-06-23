#!/bin/sh
set -e

echo "Warte auf Datenbank …"
until python -c "
import asyncio
from app.db.session import engine

async def check():
    async with engine.connect():
        pass

asyncio.run(check())
" 2>/dev/null; do
  sleep 1
done

echo "Führe Datenbank-Migrationen aus …"
alembic upgrade head

echo "Starte Gerätehaus.app …"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
