from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_secret
from app.models.fahrzeug import Fahrzeug
from app.models.person import Person
from app.schemas.setup import SetupRequest
from app.schemas.stammdaten import FahrzeugCreate
from app.services import feature_modul_service, stammdaten_service
from app.services.config_service import config_service
from app.services.notifier.webpush import generiere_vapid_schluessel


async def ist_eingerichtet(db: AsyncSession) -> bool:
    """Eingerichtet, sobald der Setup-Wizard durchlief (`setup_abgeschlossen`).
    Bewusst am Config-Flag statt an einer Konto-Tabelle festgemacht – so bleibt der
    Wizard bei bestehenden Instanzen aus, auch während der Umstellung auf das
    Person-Konto (bevor der Admin migriert ist)."""
    return bool(await config_service.get(db, "setup_abgeschlossen", False))


async def setup_durchfuehren(db: AsyncSession, daten: SetupRequest) -> None:
    """Legt die **initiale Admin-Person** an (Name = `admin_username`, mit Passwort)
    und befüllt app_config. First-Run oder erneut über den authentifizierten
    Gruppenführer-Bereich."""
    await config_service.ensure_defaults(db)
    await config_service.set_many(
        db,
        {
            "organisation_name": daten.organisation_name,
            "farbe_primaer": daten.farbe_primaer,
            "farbe_akzent": daten.farbe_akzent,
            "fehlerberichte_aktiv": daten.fehlerberichte_aktiv,
            "setup_abgeschlossen": True,
        },
    )

    name = settings.admin_username
    person = (
        await db.execute(select(Person).where(Person.name == name))
    ).scalar_one_or_none()
    if person is None:
        person = Person(
            name=name,
            gruppenfuehrer_rolle="admin",
            passwort_hash=hash_secret(daten.admin_passwort),
        )
        db.add(person)
    else:
        person.gruppenfuehrer_rolle = "admin"
        person.passwort_hash = hash_secret(daten.admin_passwort)
    await db.commit()

    await _fahrzeuge_anlegen(db, daten)
    for key, aktiv in daten.module_aktiv.items():
        await feature_modul_service.set_flag(db, key, "aktiv", aktiv)
    await _notifier_konfigurieren(db, daten)


async def _fahrzeuge_anlegen(db: AsyncSession, daten: SetupRequest) -> None:
    """Legt die im Wizard erfassten Fahrzeuge an. Nur per Name auf Duplikate
    geprüft, damit ein erneutes Ausführen des Setups (/setup/erneut-ausfuehren)
    keine doppelten Fahrzeuge erzeugt."""
    if not daten.fahrzeuge:
        return
    vorhandene_namen = set(
        (await db.execute(select(Fahrzeug.name))).scalars().all()
    )
    for fahrzeug in daten.fahrzeuge:
        if fahrzeug.name in vorhandene_namen:
            continue
        await stammdaten_service.fahrzeug_anlegen(db, FahrzeugCreate(name=fahrzeug.name))
        vorhandene_namen.add(fahrzeug.name)


async def _notifier_konfigurieren(db: AsyncSession, daten: SetupRequest) -> None:
    """Schreibt die im Wizard gewählte Basis-Benachrichtigungskonfiguration.
    VAPID-Schlüssel werden nur erzeugt, wenn noch keine existieren – ein
    erneutes Ausführen des Setups darf aktive Push-Abonnements nicht durch
    einen Schlüsseltausch invalidieren."""
    if daten.notifier is None:
        return
    werte: dict[str, object] = {}
    if daten.notifier.email_aktiv:
        werte.update(
            {
                "notifier_email_aktiv": True,
                "notifier_email_smtp_host": daten.notifier.email_smtp_host,
                "notifier_email_smtp_port": daten.notifier.email_smtp_port,
                "notifier_email_smtp_user": daten.notifier.email_smtp_user,
                "notifier_email_smtp_password": daten.notifier.email_smtp_password,
                "notifier_email_smtp_use_tls": daten.notifier.email_smtp_use_tls,
                "notifier_email_from": daten.notifier.email_from,
                "notifier_email_recipients": daten.notifier.email_recipients,
            }
        )
    if daten.notifier.push_aktiv:
        bestehender_public_key = await config_service.get(
            db, "notifier_webpush_vapid_public_key", ""
        )
        if not bestehender_public_key:
            public_key, private_key = generiere_vapid_schluessel()
            werte["notifier_webpush_vapid_public_key"] = public_key
            werte["notifier_webpush_vapid_private_key"] = private_key
        werte["notifier_webpush_aktiv"] = True
    if werte:
        await config_service.set_many(db, werte)
