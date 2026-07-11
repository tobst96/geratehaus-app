import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const holeEinstellungen = vi.fn();
const holeAlleEinsatzFelder = vi.fn();
const schreibeEinstellungen = vi.fn();
vi.mock("../../../api/gruppenfuehrer", () => ({
  holeEinstellungen: (...a: unknown[]) => holeEinstellungen(...a),
  holeAlleEinsatzFelder: (...a: unknown[]) => holeAlleEinsatzFelder(...a),
  schreibeEinstellungen: (...a: unknown[]) => schreibeEinstellungen(...a),
}));

import { PresseberichtModul } from "./PresseberichtModul";

function renderModul() {
  return render(
    <MemoryRouter>
      <PresseberichtModul />
    </MemoryRouter>,
  );
}

describe("PresseberichtModul (Admin-Einstellungen)", () => {
  beforeEach(() => {
    holeEinstellungen.mockReset().mockResolvedValue({});
    holeAlleEinsatzFelder.mockReset().mockResolvedValue([]);
    schreibeEinstellungen.mockReset().mockResolvedValue({});
  });

  it("lädt die Einstellungen; Standard-Versandmodus zeigt kein Stunden-/Uhrzeit-Feld", async () => {
    renderModul();
    expect(await screen.findByRole("heading", { name: "Pressebericht" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Stunden nach Abschluss")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Uhrzeit")).not.toBeInTheDocument();
  });

  it("zeigt das Stunden-Feld, wenn Versandmodus 'Stunden' gewählt wird", async () => {
    renderModul();
    const modus = await screen.findByLabelText("Wann wird der Pressebericht versendet?");
    const user = userEvent.setup();
    await user.selectOptions(modus, "stunden");
    expect(await screen.findByLabelText("Stunden nach Abschluss")).toBeInTheDocument();
  });

  it("speichert die Einstellungen mit dem gewählten Versandmodus", async () => {
    renderModul();
    const modus = await screen.findByLabelText("Wann wird der Pressebericht versendet?");
    const user = userEvent.setup();
    await user.selectOptions(modus, "uhrzeit");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(schreibeEinstellungen).toHaveBeenCalledWith(
      expect.objectContaining({ pressebericht_versand_modus: "uhrzeit" }),
    );
    expect(await screen.findByText("✓ gespeichert")).toBeInTheDocument();
  });
});
