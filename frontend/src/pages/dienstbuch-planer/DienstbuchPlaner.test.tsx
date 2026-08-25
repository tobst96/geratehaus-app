import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const holeTermine = vi.fn();
const holeKategorien = vi.fn();
const holeUeberfaelligeVorlagen = vi.fn();
const holeFeiertage = vi.fn();
vi.mock("../../api/dienstbuchPlaner", () => ({
  holeTermine: (...a: unknown[]) => holeTermine(...a),
  holeKategorien: (...a: unknown[]) => holeKategorien(...a),
  holeUeberfaelligeVorlagen: (...a: unknown[]) => holeUeberfaelligeVorlagen(...a),
  holeFeiertage: (...a: unknown[]) => holeFeiertage(...a),
  legePlatzhalterAn: vi.fn(),
  legeTerminAn: vi.fn(),
  stelleJahrSicher: vi.fn(),
  aktualisiereTermin: vi.fn(),
  importiereJahr: vi.fn(),
  ladeJahresExport: vi.fn(),
  uebertrageAnDivera: vi.fn(),
}));

import { DienstbuchPlaner } from "./DienstbuchPlaner";

// Kalender zeigt initial den aktuellen Monat - Termin dort platzieren, damit
// er im gerenderten Ausschnitt sichtbar ist.
function heuteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("DienstbuchPlaner (Kalenderseite)", () => {
  beforeEach(() => {
    holeTermine.mockReset().mockResolvedValue([
      {
        id: 1,
        vorlage_id: null,
        vorlage_titel: null,
        jahr: new Date().getFullYear(),
        titel: "Unterweisung UVV",
        beschreibung: null,
        zieldatum: heuteIso(),
        uhrzeit: "19:00:00",
        endzeit: null,
        ist_platzhalter: false,
        status: "entwurf",
        dienstbuch_id: null,
        dienstbuch_erzeugt_am: null,
        kategorien: [],
      },
      {
        id: 2,
        vorlage_id: null,
        vorlage_titel: null,
        jahr: new Date().getFullYear(),
        titel: "Sommerfest",
        beschreibung: null,
        zieldatum: null,
        uhrzeit: null,
        endzeit: null,
        ist_platzhalter: true,
        status: "entwurf",
        dienstbuch_id: null,
        dienstbuch_erzeugt_am: null,
        kategorien: [],
      },
    ]);
    holeKategorien.mockReset().mockResolvedValue([]);
    holeUeberfaelligeVorlagen.mockReset().mockResolvedValue([]);
    holeFeiertage.mockReset().mockResolvedValue([]);
  });

  it("rendert Kalender, Termin und Platzhalter ohne Absturz", async () => {
    render(
      <MemoryRouter>
        <DienstbuchPlaner />
      </MemoryRouter>,
    );
    // Termin erscheint mehrfach (Kalender + Divera-Auswahlliste).
    expect((await screen.findAllByText(/Unterweisung UVV/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sommerfest/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dienstbuch Planer" })).toBeInTheDocument();
  });
});
