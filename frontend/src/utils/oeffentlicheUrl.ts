import type { OeffentlicheKonfiguration } from "../api/types";

/** Basis-URL für alle QR-Code-Links (Barcode vergessen, Profilbild-Upload
 * usw.) – aus den Einstellungen konfigurierbar, damit QR-Codes auch dann
 * funktionieren, wenn das Gerätehaus-Tablet über eine andere Adresse (z. B.
 * lokale IP) erreicht wird als das Internet. Fällt auf die aktuelle
 * Browser-Adresse zurück, solange nichts konfiguriert ist. */
export function oeffentlicheBasisUrl(config: OeffentlicheKonfiguration | null): string {
  const konfiguriert = config?.oeffentliche_basis_url?.trim();
  return konfiguriert ? konfiguriert.replace(/\/+$/, "") : window.location.origin;
}
