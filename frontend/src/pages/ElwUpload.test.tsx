import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({ useParams: () => ({ token: "tok123" }) }));

const holeElwEinsatz = vi.fn();
const elwDateiHochladen = vi.fn();
vi.mock("../api/elw", () => ({
  holeElwEinsatz: (...a: unknown[]) => holeElwEinsatz(...a),
  elwDateiHochladen: (...a: unknown[]) => elwDateiHochladen(...a),
}));

import { ElwUpload } from "./ElwUpload";
import { ApiError } from "../api/client";

describe("ElwUpload (öffentliche ELW-Upload-Seite)", () => {
  beforeEach(() => {
    holeElwEinsatz.mockReset();
    elwDateiHochladen.mockReset();
  });

  it("zeigt Einsatz + Upload-Formular bei gültigem Token", async () => {
    holeElwEinsatz.mockResolvedValue({ einsatz_id: 7, titel: "B2 Zimmerbrand", zeitpunkt: null });
    render(<ElwUpload />);
    expect(await screen.findByText("ELW-Upload")).toBeInTheDocument();
    expect(screen.getByText("B2 Zimmerbrand")).toBeInTheDocument();
  });

  it("zeigt 'Einsatz abgeschlossen' bei 410 (Link gesperrt)", async () => {
    holeElwEinsatz.mockRejectedValue(new ApiError(410, "geschlossen"));
    render(<ElwUpload />);
    expect(await screen.findByText("Einsatz abgeschlossen")).toBeInTheDocument();
  });

  it("zeigt 'Link ungültig' bei 403 (gefälschtes/abgelaufenes Token)", async () => {
    holeElwEinsatz.mockRejectedValue(new ApiError(403, "ungültig"));
    render(<ElwUpload />);
    expect(await screen.findByText("Link ungültig")).toBeInTheDocument();
  });

  it("lädt eine ausgewählte Datei hoch und zeigt die Bestätigung", async () => {
    holeElwEinsatz.mockResolvedValue({ einsatz_id: 7, titel: "B2", zeitpunkt: null });
    elwDateiHochladen.mockResolvedValue({ ok: true, dateiname: "bericht.png" });
    const user = userEvent.setup();
    render(<ElwUpload />);
    await screen.findByText("ELW-Upload");

    const datei = new File(["x"], "bericht.png", { type: "image/png" });
    const eingabe = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(eingabe, datei);
    await user.click(screen.getByRole("button", { name: "Hochladen" }));

    expect(await screen.findByText(/Hochgeladen:/)).toBeInTheDocument();
    expect(elwDateiHochladen).toHaveBeenCalledWith("tok123", datei);
  });
});
