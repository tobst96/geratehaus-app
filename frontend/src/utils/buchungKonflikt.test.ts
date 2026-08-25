import { describe, expect, it } from "vitest";
import { berechneKollisionsVorschau } from "./buchungKonflikt";
import type { BuchungOut, ExternerTermin } from "../api/types";

function buchung(overrides: Partial<BuchungOut> = {}): BuchungOut {
  return {
    id: 1,
    fahrzeug_id: 1,
    fahrzeug_name: "LF 20",
    von: "2026-09-01T08:00:00Z",
    bis: "2026-09-01T10:00:00Z",
    zweck: "Übung",
    verantwortliche_person_id: 1,
    verantwortliche_person_name: "Max Mustermann",
    status: "genehmigt",
    ablehnungsgrund: null,
    hat_konflikt: false,
    ohne_pin: false,
    ...overrides,
  };
}

describe("berechneKollisionsVorschau", () => {
  it("meldet eine Kollision bei überlappender aktiver Buchung desselben Fahrzeugs", () => {
    const ergebnis = berechneKollisionsVorschau(
      1,
      "2026-09-01T09:00:00Z",
      "2026-09-01T11:00:00Z",
      [buchung()],
      []
    );
    expect(ergebnis).not.toBeNull();
    expect(ergebnis!.buchungenKonflikt).toHaveLength(1);
    expect(ergebnis!.buchungenKonflikt[0].verantwortliche_person_name).toBe("Max Mustermann");
  });

  it("ignoriert Buchungen eines anderen Fahrzeugs", () => {
    const ergebnis = berechneKollisionsVorschau(
      2,
      "2026-09-01T09:00:00Z",
      "2026-09-01T11:00:00Z",
      [buchung({ fahrzeug_id: 1 })],
      []
    );
    expect(ergebnis).toBeNull();
  });

  it("ignoriert abgelehnte/zurückgezogene Buchungen (keine aktiven Status)", () => {
    const ergebnis = berechneKollisionsVorschau(
      1,
      "2026-09-01T09:00:00Z",
      "2026-09-01T11:00:00Z",
      [buchung({ status: "abgelehnt" }), buchung({ status: "zurueckgezogen" })],
      []
    );
    expect(ergebnis).toBeNull();
  });

  it("ignoriert nicht überlappende Zeiträume", () => {
    const ergebnis = berechneKollisionsVorschau(
      1,
      "2026-09-01T10:00:00Z",
      "2026-09-01T12:00:00Z",
      [buchung({ von: "2026-09-01T08:00:00Z", bis: "2026-09-01T10:00:00Z" })],
      []
    );
    expect(ergebnis).toBeNull();
  });

  it("meldet eine Kollision mit einem externen (iCal-)Termin unabhängig vom Fahrzeug", () => {
    const extern: ExternerTermin[] = [
      { titel: "Feuerwehrfest", von: "2026-09-01T09:00:00Z", bis: "2026-09-01T11:00:00Z" },
    ];
    const ergebnis = berechneKollisionsVorschau(1, "2026-09-01T09:30:00Z", "2026-09-01T10:00:00Z", [], extern);
    expect(ergebnis).not.toBeNull();
    expect(ergebnis!.externKonflikt).toHaveLength(1);
    expect(ergebnis!.externKonflikt[0].titel).toBe("Feuerwehrfest");
  });

  it("liefert null bei ungültigem Zeitraum (Ende vor/gleich Beginn)", () => {
    expect(berechneKollisionsVorschau(1, "2026-09-01T10:00:00Z", "2026-09-01T10:00:00Z", [buchung()], []))
      .toBeNull();
    expect(berechneKollisionsVorschau(1, "2026-09-01T11:00:00Z", "2026-09-01T10:00:00Z", [buchung()], []))
      .toBeNull();
  });
});
