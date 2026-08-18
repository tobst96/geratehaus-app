import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({ useParams: () => ({ token: "abc" }) }));

const holeReservierung = vi.fn();
const holeReservierungPersonen = vi.fn();
const reservierungVorschauSetzen = vi.fn();
const reservierungEinloesen = vi.fn();
vi.mock("../api/reservierungen", () => ({
  holeReservierung: (...a: unknown[]) => holeReservierung(...a),
  holeReservierungPersonen: (...a: unknown[]) => holeReservierungPersonen(...a),
  reservierungVorschauSetzen: (...a: unknown[]) => reservierungVorschauSetzen(...a),
  reservierungEinloesen: (...a: unknown[]) => reservierungEinloesen(...a),
}));
vi.mock("../utils/eintragungssperre", () => ({
  eintragungGesperrtMinuten: () => null,
  eintragungVermerken: vi.fn(),
}));

import { ManuelleEintragung } from "./ManuelleEintragung";

const INFO = {
  bezeichnung: "Platz 1",
  einsatz_titel: "Testeinsatz",
  fahrzeug_name: null,
  abgelaufen: false,
  bereits_eingeloest: false,
  nur_geraetehaus: false,
  auf_anfahrt: false,
};

describe("ManuelleEintragung (Ohne Barcode eintragen)", () => {
  beforeEach(() => {
    holeReservierung.mockReset().mockResolvedValue(INFO);
    holeReservierungPersonen.mockReset().mockResolvedValue([{ id: 5, name: "Max Muster", pin_gesetzt: true }]);
    reservierungVorschauSetzen.mockReset().mockResolvedValue(undefined);
    reservierungEinloesen.mockReset().mockResolvedValue({});
  });

  it("trägt eine Person nach Name+PIN ein und zeigt die Bestätigung", async () => {
    const user = userEvent.setup();
    render(<ManuelleEintragung />);
    await screen.findByText("Ohne Barcode eintragen");

    await user.type(screen.getByLabelText("Wer bist du?"), "Max");
    await user.click(await screen.findByRole("button", { name: "Max Muster" }));
    await user.type(screen.getByLabelText("Dein PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "Eintragen" }));

    expect(await screen.findByText("Eingetragen!")).toBeInTheDocument();
    expect(reservierungEinloesen).toHaveBeenCalledWith(
      "abc",
      expect.objectContaining({ person_id: 5 })
    );
  });

  it("trägt Personen ohne gesetzten PIN trotzdem ein (nur gekennzeichnet)", async () => {
    holeReservierungPersonen.mockResolvedValue([{ id: 6, name: "Ohne Pin", pin_gesetzt: false }]);
    const user = userEvent.setup();
    render(<ManuelleEintragung />);
    await screen.findByText("Ohne Barcode eintragen");

    await user.type(screen.getByLabelText("Wer bist du?"), "Ohne");
    await user.click(await screen.findByRole("button", { name: "Ohne Pin" }));

    expect(screen.getByText(/kein PIN hinterlegt/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Dein PIN")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eintragen" }));

    expect(await screen.findByText("Eingetragen!")).toBeInTheDocument();
    expect(reservierungVorschauSetzen).toHaveBeenCalledWith("abc", 6, "");
    expect(reservierungEinloesen).toHaveBeenCalledWith(
      "abc",
      expect.objectContaining({ person_id: 6 })
    );
  });
});
