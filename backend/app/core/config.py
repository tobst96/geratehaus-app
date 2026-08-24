"""Technische Settings aus der .env – NIEMALS fachliche Werte hier ablegen.

Fachliche/betriebliche Konfiguration (Organisationsname, Farben, Geofence,
Module, Schwellenwerte ...) lebt ausschließlich in der `app_config`-Tabelle
und wird über app.services.config_service bereitgestellt.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Datenbank
    postgres_user: str = "geratehaus"
    postgres_password: str = "change-me-please"
    postgres_db: str = "geratehaus"
    postgres_host: str = "db"
    postgres_port: int = 5432
    database_url: str | None = None

    # Sicherheit / JWT
    jwt_secret_key: str = "change-me-to-a-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    cookie_secret_key: str = "change-me-to-another-random-secret"

    # Gültigkeit der signierten Freischalt-Token für geschützte Upload-Dateien
    # (Profilbilder, `/uploads/personen/…`). Technischer Parameter: lang genug,
    # dass eine Kiosk-Ansicht nicht mitten in der Nutzung ausläuft; kurz genug,
    # dass ein geleakter Link nicht ewig gilt.
    datei_token_max_age_stunden: int = 24 * 7

    # Allgemein
    environment: str = "production"
    public_base_url: str = "http://localhost:8000"
    cors_origins: str = ""
    upload_dir: str = "/app/uploads"

    # Explizites Opt-in fürs secure-Flag auf den langlebigen Session-Cookies
    # (Namens-Cookie, Trusted-Device). BEWUSST NICHT an `environment` gekoppelt:
    # "production" heißt nur "kein Test-/Dev-Lauf", nicht "läuft nachweislich
    # hinter einem HTTPS-Reverse-Proxy" - reale Instanzen laufen z. B. rein im
    # Gerätehaus-LAN oder noch ohne eingerichteten Proxy trotz environment=
    # production. Ein Secure-Cookie über eine solche HTTP-Verbindung würde vom
    # Browser nie gesetzt/gesendet und den Login lahmlegen (siehe Backlog
    # Etappe AI - genau das ist einer laufenden Instanz passiert). Default
    # deshalb aus; erst nach eingerichtetem Reverse-Proxy (README, Abschnitt
    # "Externer Zugriff & HTTPS") bewusst auf true stellen.
    cookies_secure: bool = False

    # Verzeichnis für das Update-Signal: Schreibt der Admin über die Update-Seite
    # eine Update-Anforderung, landet hier eine Markerdatei. Ein host-seitiges
    # Skript (scripts/updater.sh, per cron/systemd) beobachtet diesen – über einen
    # Bind-Mount geteilten – Ordner und führt dann git pull + docker compose
    # up -d --build aus. Der Container selbst bleibt bewusst ohne Host-Zugriff.
    update_signal_dir: str = "/app/update-signal"

    # Fehlerberichte (Sentry): die eigentliche DSN ist eine feste Konstante
    # im Code (app/core/sentry_setup.PROJECT_DSN), damit alle Installationen
    # dieses Open-Source-Repos an dasselbe zentrale Sentry-Projekt berichten
    # können – nicht jede Instanz an ihr eigenes. `None` (Default) bedeutet
    # "Code-Konstante verwenden"; nur explizit gesetzt (auch auf "") wird sie
    # überschrieben, z. B. für lokale Entwicklung. Ob überhaupt gesendet
    # wird, ist eine separate Zustimmungs-Entscheidung pro Instanz
    # (app_config-Key "fehlerberichte_aktiv") – siehe app/core/sentry_setup.py.
    sentry_dsn: str | None = None

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def unsichere_default_secrets(self) -> list[str]:
        """Namen der sicherheitsrelevanten Settings, die noch den Platzhalter aus
        .env.example tragen – mit diesem (jedem im Repo bekannten) Wert signierte
        JWTs/Mitglieder-Session-Cookies ließen sich fälschen. Nur in production
        relevant; siehe Startup-Check in main.py."""
        unsicher = []
        if self.jwt_secret_key == "change-me-to-a-random-secret":
            unsicher.append("JWT_SECRET_KEY")
        if self.cookie_secret_key == "change-me-to-another-random-secret":
            unsicher.append("COOKIE_SECRET_KEY")
        return unsicher


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
