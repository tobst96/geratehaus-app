from pydantic import BaseModel


class EinsaetzeProMonat(BaseModel):
    monat: str  # "YYYY-MM"
    anzahl: int


class SchwellenwertUeberschreitung(BaseModel):
    person_id: int
    person_name: str
    funktion_id: int
    funktion_name: str
    summe_stunden: float
    schwellenwert_stunden: float


class DashboardOut(BaseModel):
    einsaetze_pro_monat: list[EinsaetzeProMonat]
    vab_faelle_anzahl: int
    offene_buchungen_anzahl: int
    schwellenwert_ueberschreitungen: list[SchwellenwertUeberschreitung]
    # True nur für den eingeloggten erhöhten Zugang, wenn dort noch kein Vorname
    # gepflegt ist (Alt-Instanzen mit dem anonymen Platzhalter-Admin aus
    # früheren Setup-Wizard-Versionen) – Signal für den Migrations-Hinweis.
    migration_hinweis: bool = False
