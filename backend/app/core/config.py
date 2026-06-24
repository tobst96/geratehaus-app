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
    admin_username: str = "admin"

    # Allgemein
    environment: str = "production"
    public_base_url: str = "http://localhost:8000"
    cors_origins: str = ""
    upload_dir: str = "/app/uploads"

    # Notifier: Telegram
    notifier_telegram_enabled: bool = False
    notifier_telegram_bot_token: str = ""
    notifier_telegram_chat_ids: str = ""

    # Notifier: E-Mail
    notifier_email_enabled: bool = False
    notifier_email_smtp_host: str = ""
    notifier_email_smtp_port: int = 587
    notifier_email_smtp_user: str = ""
    notifier_email_smtp_password: str = ""
    notifier_email_smtp_use_tls: bool = True
    notifier_email_from: str = "geratehaus@example.org"
    notifier_email_recipients: str = ""

    # Notifier: Web Push
    notifier_webpush_enabled: bool = False
    notifier_webpush_vapid_public_key: str = ""
    notifier_webpush_vapid_private_key: str = ""
    notifier_webpush_vapid_subject: str = "mailto:admin@example.org"

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
    def notifier_telegram_chat_ids_list(self) -> list[str]:
        return [c.strip() for c in self.notifier_telegram_chat_ids.split(",") if c.strip()]

    @property
    def notifier_email_recipients_list(self) -> list[str]:
        return [e.strip() for e in self.notifier_email_recipients.split(",") if e.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
