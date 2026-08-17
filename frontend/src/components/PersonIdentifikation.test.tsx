import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("../api/auth", () => ({
  barcodeVorschau: vi.fn(),
  namePinPruefen: vi.fn(),
  personenAuswahl: vi.fn(),
  pinAnfordern: vi.fn(),
}));

vi.mock("./BarcodeEingabe", () => ({
  BarcodeEingabe: ({ id }: { id?: string }) => <input id={id} />,
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
});
