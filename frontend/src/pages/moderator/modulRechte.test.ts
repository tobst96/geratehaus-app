import { describe, expect, it } from "vitest";
import { GRANTBARE_MODUL_UNTERSEITEN, permFuerModulUnterseite } from "./modulRechte";

describe("permFuerModulUnterseite", () => {
  it("mappt grantbare Modul-Unterseiten auf ihren Berechtigungs-Key", () => {
    expect(permFuerModulUnterseite("personal")).toBe("personal");
    expect(permFuerModulUnterseite("fahrzeuge")).toBe("stammdaten");
    expect(permFuerModulUnterseite("barcode")).toBe("barcodes");
    expect(permFuerModulUnterseite("kiosk")).toBe("kiosk-geraete");
  });

  it("gibt null für nicht-grantbare/unbekannte Unterseiten zurück", () => {
    expect(permFuerModulUnterseite("backup")).toBeNull();
    expect(permFuerModulUnterseite("minio")).toBeNull();
    expect(permFuerModulUnterseite("gibt-es-nicht")).toBeNull();
    expect(permFuerModulUnterseite(undefined)).toBeNull();
  });

  it("hat für jede grantbare Unterseite key/titel/icon/perm", () => {
    for (const m of GRANTBARE_MODUL_UNTERSEITEN) {
      expect(m.key && m.titel && m.icon && m.perm).toBeTruthy();
    }
  });
});
