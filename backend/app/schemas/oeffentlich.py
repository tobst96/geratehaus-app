from pydantic import BaseModel


class OeffentlicheKonfiguration(BaseModel):
    """Die einzigen app_config-Werte, die ungeschützt an alle Besucher
    ausgeliefert werden – nötig fürs Theming und die Modul-Sichtbarkeit
    vor jedem Login/Standort-Check. Geofence-Koordinaten und Schwellenwerte
    bleiben bewusst innen."""

    organisation_name: str
    logo_url: str
    farbe_primaer: str
    farbe_akzent: str
    pin_laenge: int
    modul_einsatztagebuch_aktiv: bool
    modul_dienstbuch_aktiv: bool
    modul_dienststunden_aktiv: bool
    modul_fahrzeugbuchung_aktiv: bool
