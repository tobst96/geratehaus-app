import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EinsatzOut } from "../../api/types";

const holeEinsatz = vi.fn();
const holeEinsatzFelder = vi.fn();
const holeEinsatzTimeline = vi.fn();
const einsatzAbschliessen = vi.fn();
const einsatzWiederOeffnen = vi.fn();
const einsatzLoeschen = vi.fn();
vi.mock("../../api/einsaetze", () => ({
  holeEinsatz: (...a: unknown[]) => holeEinsatz(...a),
  holeEinsatzFelder: (...a: unknown[]) => holeEinsatzFelder(...a),
  holeEinsatzTimeline: (...a: unknown[]) => holeEinsatzTimeline(...a),
  einsatzAbschliessen: (...a: unknown[]) => einsatzAbschliessen(...a),
  einsatzWiederOeffnen: (...a: unknown[]) => einsatzWiederOeffnen(...a),
  einsatzLoeschen: (...a: unknown[]) => einsatzLoeschen(...a),
  einsatzPdfUrl: (id: number) => `/pdf/${id}`,
}));
const holeFahrzeuge = vi.fn();
vi.mock("../../api/stammdaten", () => ({ holeFahrzeuge: (...a: unknown[]) => holeFahrzeuge(...a) }));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useParams: () => ({ id: "5" }),
}));

import { EinsatzDetailGruppenfuehrer } from "./EinsatzDetailGruppenfuehrer";

const EINSATZ: EinsatzOut = {
  id: 5,
  titel: "B2 Zimmerbrand",
  quelle: "manuell",
  divera_id: null,
  zeitpunkt: "2026-07-01T12:00:00Z",
  adresse: null,
  meldung: null,
  einsatznummer: null,
  status: "offen",
  archiviert: false,
  geplanter_abschluss_am: null,
  zusatzfelder: {},
  teilnahmen: [],
};

function renderDetail() {
  return render(
    <MemoryRouter>
      <EinsatzDetailGruppenfuehrer />
    </MemoryRouter>,
  );
}

describe("EinsatzDetailGruppenfuehrer", () => {
  beforeEach(() => {
    holeEinsatz.mockReset().mockResolvedValue(EINSATZ);
    holeEinsatzFelder.mockReset().mockResolvedValue([]);
    holeEinsatzTimeline.mockReset().mockResolvedValue([]);
    holeFahrzeuge.mockReset().mockResolvedValue([]);
    einsatzAbschliessen.mockReset().mockResolvedValue({});
    einsatzWiederOeffnen.mockReset().mockResolvedValue({});
    einsatzLoeschen.mockReset().mockResolvedValue({});
  });

  afterEach(() => vi.restoreAllMocks());

  it("zeigt den Einsatz und schließt ihn ab", async () => {
    const user = userEvent.setup();
    renderDetail();
    expect(await screen.findByRole("heading", { name: "B2 Zimmerbrand" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Einsatz abschließen" }));
    expect(einsatzAbschliessen).toHaveBeenCalledWith(5);
  });

  it("löscht den Einsatz nur nach Bestätigung", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "B2 Zimmerbrand" });

    await user.click(screen.getByRole("button", { name: "Einsatz löschen" }));
    expect(einsatzLoeschen).toHaveBeenCalledWith(5);
  });

  it("löscht NICHT, wenn die Bestätigung abgelehnt wird", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "B2 Zimmerbrand" });

    await user.click(screen.getByRole("button", { name: "Einsatz löschen" }));
    expect(einsatzLoeschen).not.toHaveBeenCalled();
  });
});
