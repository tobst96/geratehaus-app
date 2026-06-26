from pydantic import BaseModel


class EinsaetzeProMonat(BaseModel):
    monat: str  # "YYYY-MM"
    anzahl: int


class PunkteRangliste(BaseModel):
    person_id: int
    person_name: str
    punkte: int


class SchwellenwertUeberschreitung(BaseModel):
    person_id: int
    person_name: str
    funktion_id: int
    funktion_name: str
    summe_stunden: float
    schwellenwert_stunden: float


class DashboardOut(BaseModel):
    einsaetze_pro_monat: list[EinsaetzeProMonat]
    punkte_rangliste: list[PunkteRangliste]
    vab_faelle_anzahl: int
    offene_buchungen_anzahl: int
    schwellenwert_ueberschreitungen: list[SchwellenwertUeberschreitung]
