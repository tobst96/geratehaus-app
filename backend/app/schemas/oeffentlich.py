from pydantic import BaseModel


class OeffentlicheKonfiguration(BaseModel):
    """Die einzigen app_config-Werte, die ungeschützt an alle Besucher
    ausgeliefert werden – nötig fürs Theming und die Modul-Sichtbarkeit
    vor jedem Login/Standort-Check. Geofence-Koordinaten und Schwellenwerte
    bleiben bewusst innen."""

    organisation_name: str
    oeffentliche_basis_url: str
    logo_url: str
    logo_url_dark: str
    farbe_primaer: str
    farbe_akzent: str
    einsatz_countdown_minuten: int
    einsatz_alle_eingetragen_minuten: int
    modul_einsatztagebuch_aktiv: bool
    modul_dienstbuch_aktiv: bool
    modul_dienststunden_aktiv: bool
    modul_fahrzeugbuchung_aktiv: bool
    modul_formular_aktiv: bool
    # Barcode-Login aktiv? Wenn false, identifiziert sich der Kiosk per Namen+PIN.
    modul_barcode_aktiv: bool
    modul_einsatztagebuch_startseite: bool
    modul_dienstbuch_startseite: bool
    modul_dienststunden_startseite: bool
    modul_fahrzeugbuchung_startseite: bool
    modul_formular_startseite: bool
    modul_einsatztagebuch_aussenzugriff: bool
    modul_dienstbuch_aussenzugriff: bool
    modul_dienststunden_aussenzugriff: bool
    modul_fahrzeugbuchung_aussenzugriff: bool
    modul_formular_aussenzugriff: bool
    # Fehler-Monitoring (Sentry) im Frontend: nur senden, wenn die Instanz
    # zugestimmt hat. `sentry_dsn` ist leer, solange die Zustimmung fehlt.
    # `sentry_environment` (beta/production) steuert u. a. das Session Replay
    # (nur in der Beta aktiv).
    fehlerberichte_aktiv: bool = False
    sentry_dsn: str = ""
    sentry_environment: str = "production"
