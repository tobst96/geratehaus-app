"""Importiert alle Modelle, damit Alembic-Autogenerate sie über Base.metadata
entdeckt. Reihenfolge spielt keine Rolle, SQLAlchemy löst Foreign Keys über
String-Referenzen ("personen.id" etc.) auf."""

from app.models.app_config import AppConfig
from app.models.barcode_token import BarcodeToken, FahrzeugToken
from app.models.buchung import FahrzeugBuchung
from app.models.dienstbuch import Dienstbuch, DienstbuchPerson
from app.models.dienststunden import Dienststunden
from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.einsatz_ereignis import EinsatzEreignis
from app.models.einsatz_feld import EinsatzFeldDefinition
from app.models.fahrzeug import Fahrzeug
from app.models.funktion import FunktionDienststunden, FunktionEinsatz
from app.models.moderator import Moderator
from app.models.namens_abweichung import NamensAbweichung
from app.models.person import Person
from app.models.push_subscription import PushSubscription

__all__ = [
    "AppConfig",
    "BarcodeToken",
    "Dienstbuch",
    "DienstbuchPerson",
    "Dienststunden",
    "Einsatz",
    "EinsatzEreignis",
    "EinsatzFeldDefinition",
    "EinsatzPerson",
    "Fahrzeug",
    "FahrzeugBuchung",
    "FahrzeugToken",
    "FunktionDienststunden",
    "FunktionEinsatz",
    "Moderator",
    "NamensAbweichung",
    "Person",
    "PushSubscription",
]
