/** Module-Unterseiten (`/moderator/module/<key>`), die granular an Gruppenführer
 * freigebbar sind: Route-Segment `key` → Berechtigungs-Key `perm`. Nicht
 * gelistete Unterseiten (backup/minio/formular/einsatztagebuch-Einstellungen …)
 * bleiben admin-/`einstellungen`-gebunden. */
export interface GrantbareModulUnterseite {
  key: string;
  titel: string;
  icon: string;
  perm: string;
}

export const GRANTBARE_MODUL_UNTERSEITEN: GrantbareModulUnterseite[] = [
  { key: "personal", titel: "Personal", icon: "personal", perm: "personal" },
  { key: "fahrzeuge", titel: "Stammdaten", icon: "fahrzeug", perm: "stammdaten" },
  { key: "barcode", titel: "Barcodes", icon: "barcodes", perm: "barcodes" },
  { key: "kiosk", titel: "Kiosk-Geräte", icon: "kiosk", perm: "kiosk-geraete" },
];

/** Berechtigungs-Key für eine grantbare Modul-Unterseite, sonst null. */
export function permFuerModulUnterseite(key: string | undefined): string | null {
  if (!key) return null;
  return GRANTBARE_MODUL_UNTERSEITEN.find((m) => m.key === key)?.perm ?? null;
}
