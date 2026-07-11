import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const holeEinstellungen = vi.fn();
const schreibeEinstellungen = vi.fn();
vi.mock("../../../api/gruppenfuehrer", () => ({
  holeEinstellungen: (...a: unknown[]) => holeEinstellungen(...a),
  schreibeEinstellungen: (...a: unknown[]) => schreibeEinstellungen(...a),
}));

import { ElwModul } from "./ElwModul";

function renderModul() {
  return render(
    <MemoryRouter>
      <ElwModul />
    </MemoryRouter>,
  );
}

describe("ElwModul (Admin-Einstellungen)", () => {
  beforeEach(() => {
    holeEinstellungen.mockReset().mockResolvedValue({ elw_email: "" });
    schreibeEinstellungen.mockReset().mockResolvedValue({});
  });

  it("lädt die hinterlegte ELW-Adresse", async () => {
    holeEinstellungen.mockResolvedValue({ elw_email: "elw@fw.example" });
    renderModul();
    expect(await screen.findByDisplayValue("elw@fw.example")).toBeInTheDocument();
  });

  it("speichert die eingegebene Adresse (getrimmt)", async () => {
    const user = userEvent.setup();
    renderModul();
    const feld = await screen.findByLabelText("E-Mail-Adresse des ELW");
    await user.type(feld, "  neu@fw.example  ");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(schreibeEinstellungen).toHaveBeenCalledWith({ elw_email: "neu@fw.example" });
    expect(await screen.findByText("✓ gespeichert")).toBeInTheDocument();
  });
});
