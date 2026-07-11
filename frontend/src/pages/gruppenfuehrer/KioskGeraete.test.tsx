import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KioskTokenOut } from "../../api/gruppenfuehrer";

const holeKioskTokens = vi.fn();
const setzeKioskStartseiteModule = vi.fn();
vi.mock("../../api/gruppenfuehrer", () => ({
  holeKioskTokens: (...a: unknown[]) => holeKioskTokens(...a),
  kioskTokenAnlegen: vi.fn(),
  kioskTokenLoeschen: vi.fn(),
  ladeKioskPdf: vi.fn(),
  schreibeEinstellungen: vi.fn(() => Promise.resolve()),
  setzeKioskStartseiteModule: (...a: unknown[]) => setzeKioskStartseiteModule(...a),
}));

// Globale Startseiten-Defaults: nur Einsatztagebuch aktiv.
vi.mock("../../context/ConfigContext", () => ({
  useConfig: () => ({
    config: { kiosk_autolock_sekunden: 0, modul_einsatztagebuch_startseite: true },
    neuLaden: vi.fn(),
  }),
}));

import { KioskGeraete } from "./KioskGeraete";

function geraet(over: Partial<KioskTokenOut>): KioskTokenOut {
  return { id: 1, bezeichnung: "Tablet Garage", token: "t1", startseite_module: null, ...over };
}

describe("KioskGeraete (pro-Gerät Kiosk-Anzeige)", () => {
  beforeEach(() => {
    holeKioskTokens.mockReset();
    setzeKioskStartseiteModule.mockReset().mockResolvedValue(geraet({}));
  });

  it("schaltet ein Gerät auf individuelle Auswahl und übernimmt die globalen Defaults", async () => {
    holeKioskTokens.mockResolvedValue([geraet({ startseite_module: null })]);
    const user = userEvent.setup();
    render(<KioskGeraete />);

    const individuell = await screen.findByLabelText("Auf Kiosk anzeigen individuell festlegen");
    expect(individuell).not.toBeChecked();
    await user.click(individuell);

    // Einschalten übernimmt die globalen Defaults (hier: nur einsatztagebuch).
    expect(setzeKioskStartseiteModule).toHaveBeenCalledWith(1, ["einsatztagebuch"]);
  });

  it("schaltet ein einzelnes Modul für ein individuelles Gerät um", async () => {
    holeKioskTokens.mockResolvedValue([geraet({ startseite_module: [] })]);
    const user = userEvent.setup();
    render(<KioskGeraete />);

    // Bei individuellem Gerät erscheinen die Modul-Checkboxen.
    const dienstbuch = await screen.findByLabelText("Dienstbuch");
    await user.click(dienstbuch);

    expect(setzeKioskStartseiteModule).toHaveBeenCalledWith(1, ["dienstbuch"]);
  });
});
