import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "./client";

export interface MinioEinstellungen {
  endpoint: string;
  console_url: string;
  region: string;
  access_key: string;
  secret_gesetzt: boolean;
  bucket_backups: string;
  bucket_einsaetze: string;
  bucket_dienstbuecher: string;
}

export type MinioEinstellungenUpdate = Partial<{
  endpoint: string;
  console_url: string;
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

export interface MinioObjekt {
  key: string;
  groesse: number;
  geaendert: string;
}

export interface MinioBrowse {
  ordner: string[];
  dateien: MinioObjekt[];
}

export const holeMinioEinstellungen = () => apiGet<MinioEinstellungen>("/gruppenfuehrer/minio/einstellungen");
export const setzeMinioEinstellungen = (d: MinioEinstellungenUpdate) =>
  apiPatch<MinioEinstellungen>("/gruppenfuehrer/minio/einstellungen", d);
export const testeMinioVerbindung = () => apiPost<MinioTestErgebnis>("/gruppenfuehrer/minio/test");

export const holeMinioBuckets = () => apiGet<string[]>("/gruppenfuehrer/minio/buckets");
export const browseMinio = (bucket: string, prefix: string) =>
  apiGet<MinioBrowse>(
    `/gruppenfuehrer/minio/browse?bucket=${encodeURIComponent(bucket)}&prefix=${encodeURIComponent(prefix)}`,
  );
export const loescheMinioObjekt = (bucket: string, key: string) =>
  apiDelete<void>(`/gruppenfuehrer/minio/object?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`);

export const uploadMinioObjekt = (bucket: string, prefix: string, datei: File) =>
  apiUpload<{ key: string }>("/gruppenfuehrer/minio/upload", datei, "datei", { bucket, prefix });

export async function ladeMinioObjekt(bucket: string, key: string): Promise<void> {
  const blob = await apiGet<Blob>(
    `/gruppenfuehrer/minio/download?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = key.replace(/\/+$/, "").split("/").pop() || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
