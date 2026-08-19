import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({ useParams: () => ({ token: "tok123" }) }));

const holePersonBildReservierung = vi.fn();
const personBildReservierungEinloesen = vi.fn();
vi.mock("../api/personBildReservierungen", () => ({
  holePersonBildReservierung: (...a: unknown[]) => holePersonBildReservierung(...a),
  personBildReservierungEinloesen: (...a: unknown[]) => personBildReservierungEinloesen(...a),
}));

import { PersonBildHochladen } from "./PersonBildHochladen";

describe("PersonBildHochladen (öffentliche QR-Upload-Seite)", () => {
  beforeEach(() => {
    holePersonBildReservierung.mockReset();
    personBildReservierungEinloesen.mockReset();
  });

  it("erzwingt nicht die Kamera - die Dateiauswahl erlaubt auch die Galerie", async () => {
    holePersonBildReservierung.mockResolvedValue({
      abgelaufen: false,
      bereits_eingeloest: false,
      person_name: "Max Muster",
      person_bild_url: null,
    });
    render(<PersonBildHochladen />);
    await screen.findByRole("button", { name: /foto aufnehmen oder auswählen/i });
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input?.hasAttribute("capture")).toBe(false);
  });
});
