import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

let barcodeAktiv = true;
vi.mock("../context/ConfigContext", () => ({
  useConfig: () => ({ config: { modul_barcode_aktiv: barcodeAktiv } }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    barcodeEinscannenEinmalig: vi.fn(),
    nameLoginEinmalig: vi.fn(),
  }),
}));

vi.mock("../hooks/useBarcodeSound", () => ({
  useBarcodeSound: () => ({ spieleErkannt: vi.fn(), spieleFehler: vi.fn() }),
}));

const barcodeVorschau = vi.fn();
vi.mock("../api/auth", () => ({
  barcodeVorschau: (...a: unknown[]) => barcodeVorschau(...a),
  namePinPruefen: vi.fn(),
  personenAuswahl: vi.fn(),
  pinAnfordern: vi.fn(),
}));

vi.mock("./BarcodeEingabe", () => ({
  BarcodeEingabe: ({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) => (
    <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { ApiError } from "../api/client";
import { PersonIdentifikation, type PersonIdentifikationHandle } from "./PersonIdentifikation";

function rendern() {
  const ref = createRef<PersonIdentifikationHandle>();
  render(
    <MemoryRouter>
      <PersonIdentifikation ref={ref} />
    </MemoryRouter>
  );
  return ref;
}

describe("PersonIdentifikation", () => {
  beforeEach(() => {
    localStorage.clear();
    barcodeAktiv = true;
  });

  it("zeigt die Barcode-Eingabe, wenn das Barcode-Modul aktiv ist (unabhängig vom Kiosk-Status)", () => {
    barcodeAktiv = true;
    rendern();
    expect(screen.getByLabelText("Barcode einscannen")).toBeInTheDocument();
  });

  it("zeigt Name+PIN, wenn das Barcode-Modul aus ist und ein Kiosk-Token gesetzt ist", () => {
    barcodeAktiv = false;
    localStorage.setItem("kiosk_token", "abc");
    rendern();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("zeigt Name+PIN NICHT außerhalb des Kiosks – stattdessen einen Hinweis mit Link zum Login", () => {
    barcodeAktiv = false;
    rendern();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "persönlichen Login" })).toHaveAttribute(
      "href",
      "/mitglied/login"
    );
  });

  it("identifiziere() wirft außerhalb des Kiosks einen sprechenden Fehler statt still durchzulaufen", async () => {
    barcodeAktiv = false;
    const ref = rendern();
    await expect(ref.current!.identifiziere()).rejects.toBeInstanceOf(ApiError);
  });

  describe("Bestätigungsfoto bleibt mind. 5s stehen", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      barcodeVorschau.mockReset().mockResolvedValue({
        name: "Max Muster",
        bild_url: "https://example.org/max.png",
        funktion_id: null,
        gruppe_id: null,
      });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("verschwindet nicht sofort bei zuruecksetzen(), aber nach 5s", async () => {
      barcodeAktiv = true;
      const ref = rendern();

      fireEvent.change(screen.getByLabelText("Barcode einscannen"), { target: { value: "12345" } });
      // Debounce (250ms) + API-Antwort abwarten.
      await vi.advanceTimersByTimeAsync(300);
      expect(screen.getByText("Max Muster")).toBeInTheDocument();

      // Formular-Reset (z. B. nach erfolgreicher Eintragung) löscht die
      // Eingabe, das Bestätigungsfoto bleibt aber zunächst stehen.
      ref.current!.zuruecksetzen();
      expect(screen.getByText("Max Muster")).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(4000);
      expect(screen.getByText("Max Muster")).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(1500);
      expect(screen.queryByText("Max Muster")).not.toBeInTheDocument();
    });
  });
});
