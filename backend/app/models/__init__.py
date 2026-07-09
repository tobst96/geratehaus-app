"""Importiert alle Modelle, damit Alembic-Autogenerate sie über Base.metadata
entdeckt. Reihenfolge spielt keine Rolle, SQLAlchemy löst Foreign Keys über
String-Referenzen ("personen.id" etc.) auf."""

from app.models.app_config import AppConfig
from app.models.audit_log import AuditLog
from app.models.backup import Backup
from app.models.barcode_token import BarcodeToken, FahrzeugToken
from app.models.benachrichtigungskanal import Benachrichtigungskanal
from app.models.berechtigung import Berechtigung
from app.models.buchung import FahrzeugBuchung
from app.models.buchung_aktion_token import BuchungAktionToken
from app.models.dienstbuch import Dienstbuch, DienstbuchPerson
from app.models.dienstbuch_reservierung import DienstbuchReservierung
from app.models.dienststunden import Dienststunden
from app.models.dienststunden_reservierung import DienststundenReservierung
from app.models.dienststunden_uebernahme import DienststundenUebernahme
from app.models.divera_vorschlag import DiveraVorschlag
from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.einsatz_ereignis import EinsatzEreignis
from app.models.einsatz_feld import EinsatzFeldDefinition
from app.models.fahrzeug import Fahrzeug
from app.models.formular import Formular, FormularEinreichung, FormularFeld
from app.models.fahrzeugbuchung_reservierung import FahrzeugbuchungReservierung
from app.models.funktion import FunktionDienststunden, FunktionEinsatz
from app.models.gruppe import Gruppe
from app.models.kiosk_token import KioskToken
from app.models.mitglied_login_reservierung import MitgliedLoginReservierung
from app.models.gruppenfuehrer import GruppenfuehrerRecoveryCode, GruppenfuehrerTrustedDevice
from app.models.modul import Modul
from app.models.namens_abweichung import NamensAbweichung
from app.models.person import Person
from app.models.person_bild_reservierung import PersonBildReservierung
from app.models.person_ereignis import PersonEreignis
from app.models.person_ereignis_abo import PersonEreignisAbo
from app.models.pin_token import PersonFreigabeToken, PinSetzenToken
from app.models.push_subscription import PushSubscription
from app.models.reservierung import SitzplatzReservierung

__all__ = [
    "AppConfig",
    "Backup",
    "BarcodeToken",
    "Benachrichtigungskanal",
    "Berechtigung",
    "BuchungAktionToken",
    "Dienstbuch",
    "DienstbuchPerson",
    "DienstbuchReservierung",
    "Dienststunden",
    "DienststundenReservierung",
    "DienststundenUebernahme",
    "DiveraVorschlag",
    "Einsatz",
    "EinsatzEreignis",
    "EinsatzFeldDefinition",
    "EinsatzPerson",
    "Fahrzeug",
    "FahrzeugBuchung",
    "FahrzeugbuchungReservierung",
    "FahrzeugToken",
    "Formular",
    "FormularEinreichung",
    "FormularFeld",
    "FunktionDienststunden",
    "FunktionEinsatz",
    "Gruppe",
    "KioskToken",
    "MitgliedLoginReservierung",
    "GruppenfuehrerRecoveryCode",
    "GruppenfuehrerTrustedDevice",
    "Modul",
    "NamensAbweichung",
    "Person",
    "PersonBildReservierung",
    "AuditLog",
    "PersonEreignis",
    "PersonEreignisAbo",
    "PersonFreigabeToken",
    "PinSetzenToken",
    "PushSubscription",
    "SitzplatzReservierung",
]
