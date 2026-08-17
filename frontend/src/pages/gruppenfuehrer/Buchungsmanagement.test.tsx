import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BuchungOut } from "../../api/types";

const holeBuchungenListe = vi.fn();
const holeKonfliktvergleich = vi.fn();
const buchungGenehmigen = vi.fn();
const buchungAblehnen = vi.fn();
vi.mock("../../api/gruppenfuehrer", () => ({
  holeBuchungenListe: (...a: unknown[]) => holeBuchungenListe(...a),
  holeKonfliktvergleich: (...a: unknown[]) => holeKonfliktvergleich(...a),
  buchungGenehmigen: (...a: unknown[]) => buchungGenehmigen(...a),
  buchungAblehnen: (...a: unknown[]) => buchungAblehnen(...a),
}));

import { Buchungsmanagement } from "./Buchungsmanagement";

const BUCHUNG: BuchungOut = {
  id: 8,
  fahrzeug_id: 1,
  fahrzeug_name: "LF 20",
  von: "2026-07-02T08:00:00Z",
  bis: "2026-07-02T12:00:00Z",
  zweck: "Übung",
  verantwortliche_person_id: 3,
  verantwortliche_person_name: "Max Muster",
  status: "ausstehend",
  ablehnungsgrund: null,
  hat_konflikt: false,
};

describe("Buchungsmanagement (Anfragen genehmigen/ablehnen)", () => {
  beforeEach(() => {
    holeBuchungenListe.mockReset().mockResolvedValue([BUCHUNG]);
    holeKonfliktvergleich.mockReset().mockResolvedValue([]);
    buchungGenehmigen.mockReset().mockResolvedValue(undefined);
    buchungAblehnen.mockReset().mockResolvedValue(undefined);
  });

  it("genehmigt eine ausstehende Anfrage", async () => {
    const user = userEvent.setup();
    render(<Buchungsmanagement />);
    await screen.findByText("LF 20");

    await user.click(screen.getByRole("button", { name: "Genehmigen" }));
    expect(buchungGenehmigen).toHaveBeenCalledWith(8);
  });

  it("lehnt eine Anfrage mit Begründung ab", async () => {
    const user = userEvent.setup();
    render(<Buchungsmanagement />);
    await screen.findByText("LF 20");

    await user.type(screen.getByPlaceholderText("Ablehnungsgrund (optional)"), "Fahrzeug belegt");
    await user.click(screen.getByRole("button", { name: "Ablehnen" }));
    expect(buchungAblehnen).toHaveBeenCalledWith(8, "Fahrzeug belegt");
  });
});
