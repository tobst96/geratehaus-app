import { apiGet, apiPatch, apiPost } from "./client";

export interface MinioEinstellungen {
  endpoint: string;
  region: string;
  access_key: string;
  secret_gesetzt: boolean;
  bucket_backups: string;
  bucket_einsaetze: string;
  bucket_dienstbuecher: string;
}

export type MinioEinstellungenUpdate = Partial<{
  endpoint: string;
  region: string;
  access_key: string;
  secret_key: string;
  bucket_backups: string;
  bucket_einsaetze: string;
  bucket_dienstbuecher: string;
}>;

export interface MinioTestErgebnis {
  ok: boolean;
  meldung: string;
}

export const holeMinioEinstellungen = () => apiGet<MinioEinstellungen>("/moderator/minio/einstellungen");
export const setzeMinioEinstellungen = (d: MinioEinstellungenUpdate) =>
  apiPatch<MinioEinstellungen>("/moderator/minio/einstellungen", d);
export const testeMinioVerbindung = () => apiPost<MinioTestErgebnis>("/moderator/minio/test");
