import { apiGet, apiPost, apiUpload } from "./client";
import type { SetupStatus } from "./types";

export interface SetupRequest {
  organisation_name: string;
  farbe_primaer: string;
  farbe_akzent: string;
  geofence_lat: number;
  geofence_lon: number;
  geofence_radius_meter: number;
  admin_passwort: string;
}

export const holeSetupStatus = () => apiGet<SetupStatus>("/setup/status");

/** Synchroner Merker, dass das Setup soeben erfolgreich abgeschlossen wurde.
 * Nötig, weil SetupWizard direkt nach Abschluss zu "/" navigiert, bevor ein
 * erneuter GET /setup/status zurückkommen könnte – ohne dieses Signal würde
 * SetupGate mit dem noch veralteten Status sofort wieder zu /setup zurückleiten. */
let kuerzlichEingerichtet = false;

export function markiereAlsEingerichtet(): void {
  kuerzlichEingerichtet = true;
}

export function wurdeKuerzlichEingerichtet(): boolean {
  return kuerzlichEingerichtet;
}

export const setupAusfuehren = (daten: SetupRequest) => apiPost<void>("/setup", daten);

export const setupLogoHochladen = (datei: File) =>
  apiUpload<{ logo_url: string }>("/setup/logo", datei, "datei");

export const setupErneutAusfuehren = (daten: SetupRequest) =>
  apiPost<void>("/setup/erneut-ausfuehren", daten);
