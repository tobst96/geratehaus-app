import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Fahrzeug } from "../../api/types";

vi.mock("../../api/gruppenfuehrer", () => ({
  fahrzeugAktualisieren: vi.fn(),
}));

import { SitzplatzEditor } from "./SitzplatzEditor";

const FAHRZEUG: Fahrzeug = {
  id: 1,
  name: "LF 20",
  aktiv: true,
  buchbar: true,
  issi: null,
  sitzplaetze: [],
};

function renderEditor() {
  render(
    <SitzplatzEditor fahrzeug={FAHRZEUG} funktionen={[]} onClose={() => {}} onGespeichert={() => {}} />
  );
  // Die anklickbare Sitzplatz-Fläche ist der zweite direkte Div-Nachfahre der
  // Karte (kein stabiles Test-Attribut vorhanden; jsdom serialisiert die
  // touchAction-Inline-Style nicht zuverlässig für Attribut-Selektoren).
  return document.querySelectorAll(".karte > div")[1] as HTMLElement;
}

describe("SitzplatzEditor (Raster-Snap)", () => {
  beforeEach(() => {
    // Feste, einfache Box-Geometrie (200x100 bei 0/0), damit sich die
    // Prozent-Umrechnung der Klickposition vorhersagbar prüfen lässt.
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100,
      toJSON: () => {},
    })) as unknown as typeof Element.prototype.getBoundingClientRect;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("platziert einen neuen Sitzplatz ohne Raster an der exakten Klickposition", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("Melder");
    const flaeche = renderEditor();

    // Klick bei clientX=37, clientY=23 auf einer 200x100-Box → 18.5% / 23%.
    fireEvent.click(flaeche, { clientX: 37, clientY: 23 });

    const sitz = await screen.findByTitle("Melder");
    expect(sitz.style.left).toBe("18.5%");
    expect(sitz.style.top).toBe("23%");
  });

  it("richtet einen neuen Sitzplatz bei aktivem Raster auf das 5%-Raster aus", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "prompt").mockReturnValue("Melder");
    const flaeche = renderEditor();

    await user.click(screen.getByLabelText("Am Raster ausrichten"));

    // Gleiche Klickposition wie oben (18.5% / 23%) - soll jetzt auf 20% / 25% snappen.
    fireEvent.click(flaeche, { clientX: 37, clientY: 23 });

    const sitz = await screen.findByTitle("Melder");
    expect(sitz.style.left).toBe("20%");
    expect(sitz.style.top).toBe("25%");
  });
});
