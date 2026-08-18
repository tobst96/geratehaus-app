import { apiGet, apiPost, apiUpload } from "./client";
import type { SetupStatus } from "./types";

export interface SetupFahrzeug {
  name: string;
}

export interface SetupNotifier {
  email_aktiv: boolean;
  email_smtp_host: string;
  email_smtp_port: number;
  email_smtp_user: string;
  email_smtp_password: string;
  email_smtp_use_tls: boolean;
  email_from: string;
  email_recipients: string;
  push_aktiv: boolean;
}

export interface SetupModul {
  key: string;
  name: string;
  aktiv: boolean;
}

export interface SetupBasis {
  organisation_name: string;
  farbe_primaer: string;
  farbe_akzent: string;
  fehlerberichte_aktiv?: boolean;
  fahrzeuge?: SetupFahrzeug[];
  module_aktiv?: Record<string, boolean>;
  notifier?: SetupNotifier;
}

/** Nur für den First-Run (POST /setup) – legt zusätzlich die erste Person als
 * Admin an. „Setup erneut ausführen" nutzt SetupBasis ohne diese Felder;
 * Zugangsverwaltung (Passwort ändern etc.) läuft danach nur noch über
 * „Erhöhter Zugang" in Personal. */
export interface SetupRequest extends SetupBasis {
  admin_vorname: string;
  admin_nachname: string;
  admin_email: string;
  admin_passwort: string;
}

export const holeSetupStatus = () => apiGet<SetupStatus>("/setup/status");

export const holeSetupModule = () => apiGet<SetupModul[]>("/setup/module");

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

export const setupErneutAusfuehren = (daten: SetupBasis) =>
  apiPost<void>("/setup/erneut-ausfuehren", daten);
