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

export interface SetupRequest {
  organisation_name: string;
  farbe_primaer: string;
  farbe_akzent: string;
  admin_passwort: string;
  fehlerberichte_aktiv?: boolean;
  fahrzeuge?: SetupFahrzeug[];
  module_aktiv?: Record<string, boolean>;
  notifier?: SetupNotifier;
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

export const setupErneutAusfuehren = (daten: SetupRequest) =>
  apiPost<void>("/setup/erneut-ausfuehren", daten);
