import type { BuchungOut, ExternerTermin } from "../api/types";

/** Aktive Buchungsstatus, die eine Überschneidung darstellen können – deckungsgleich
 * mit AKTIVE_STATUS in backend/app/services/buchung_service.py. */
const AKTIVE_STATUS = new Set<BuchungOut["status"]>(["ausstehend", "genehmigt"]);

function ueberlappt(aVon: string, aBis: string, vonMs: number, bisMs: number): boolean {
  const aVonMs = new Date(aVon).getTime();
  const aBisMs = new Date(aBis).getTime();
  return aVonMs < bisMs && aBisMs > vonMs;
}

export interface KollisionsVorschau {
  buchungenKonflikt: BuchungOut[];
  externKonflikt: ExternerTermin[];
}

/** Live-Kollisionsvorschau VOR dem Absenden einer Buchungsanfrage – dieselbe
 * Überlappungsregel wie `buchung_service.hat_konflikt`, aber rein clientseitig
 * aus bereits geladenen Daten berechnet (kein Request). `null`, wenn der
 * Zeitraum ungültig ist oder keine Überschneidung vorliegt. */
export function berechneKollisionsVorschau(
  fahrzeugId: number,
  von: string,
  bis: string,
  buchungen: BuchungOut[],
  externeTermine: ExternerTermin[]
): KollisionsVorschau | null {
  const vonMs = new Date(von).getTime();
  const bisMs = new Date(bis).getTime();
  if (!(bisMs > vonMs) || Number.isNaN(vonMs) || Number.isNaN(bisMs)) return null;

  const buchungenKonflikt = buchungen.filter(
    (b) => b.fahrzeug_id === fahrzeugId && AKTIVE_STATUS.has(b.status) && ueberlappt(b.von, b.bis, vonMs, bisMs)
  );
  const externKonflikt = externeTermine.filter((t) => ueberlappt(t.von, t.bis, vonMs, bisMs));

  if (buchungenKonflikt.length === 0 && externKonflikt.length === 0) return null;
  return { buchungenKonflikt, externKonflikt };
}
