import { apiGet, apiPatch, apiPost, apiDelete, apiUpload } from "./client";

export interface BackupEinstellungen {
  zeit_stunde: number;
  zeit_minute: number;
  wochentage: number[];
  max_anzahl: number;
  passphrase_gesetzt: boolean;
  lokal_aktiv: boolean;
  lokal_pfad: string;
  webdav_aktiv: boolean;
  webdav_url: string;
  webdav_user: string;
  webdav_passwort_gesetzt: boolean;
  webdav_pfad: string;
  fehler_mail_aktiv: boolean;
}

export type BackupEinstellungenUpdate = Partial<{
  zeit_stunde: number;
  zeit_minute: number;
  wochentage: number[];
  max_anzahl: number;
  passphrase: string;
  lokal_aktiv: boolean;
  lokal_pfad: string;
  webdav_aktiv: boolean;
  webdav_url: string;
  webdav_user: string;
  webdav_passwort: string;
  webdav_pfad: string;
  fehler_mail_aktiv: boolean;
}>;

export interface BackupOut {
  id: number;
  dateiname: string;
  groesse_bytes: number;
  ziele: string;
  ausloeser: string;
  status: string;
  fehlermeldung: string | null;
  verschluesselt: boolean;
  zusammenfassung: {
    app_version?: string;
    datei_anzahl?: number;
    datensaetze_gesamt?: number;
    tabellen?: { name: string; anzahl: number }[];
  };
  erstellt_am: string;
  datei_vorhanden: boolean;
}

export interface BackupKategorie {
  key: string;
  label: string;
  anzahl: number;
}

export interface BackupAnalyse {
  token: string;
  erstellt_am: string | null;
  app_version: string | null;
  kategorien: BackupKategorie[];
}

export interface BackupImportErgebnis {
  importierte_kategorien: string[];
  importierte_datensaetze: number;
  importierte_dateien: number;
}

export const holeBackupEinstellungen = () => apiGet<BackupEinstellungen>("/moderator/backup/einstellungen");
export const setzeBackupEinstellungen = (d: BackupEinstellungenUpdate) =>
  apiPatch<BackupEinstellungen>("/moderator/backup/einstellungen", d);
export const holeBackups = () => apiGet<BackupOut[]>("/moderator/backup/liste");
export const jetztSichern = () => apiPost<BackupOut>("/moderator/backup/jetzt");
export const loescheBackup = (id: number) => apiDelete<void>(`/moderator/backup/${id}`);
export const analysiereBackup = (datei: File, passphrase?: string) =>
  apiUpload<BackupAnalyse>(
    "/moderator/backup/analysieren",
    datei,
    "datei",
    passphrase ? { passphrase } : undefined,
  );
export const importiereBackup = (token: string, kategorien: string[], modus: "ersetzen" | "zusammenfuehren") =>
  apiPost<BackupImportErgebnis>("/moderator/backup/importieren", { token, kategorien, modus });

/** Lädt die Backup-Datei (authentifiziert) als Blob und stößt den Browser-Download
 * an. */
export async function ladeBackupHerunter(id: number, dateiname: string): Promise<void> {
  const blob = await apiGet<Blob>(`/moderator/backup/${id}/download`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
