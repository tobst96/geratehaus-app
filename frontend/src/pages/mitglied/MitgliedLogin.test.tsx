import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- API-Mocks (QR-Reservierungs-Login) ---------------------------------
const mitgliedLoginReservierungAnlegen = vi.fn();
const holeMitgliedLoginReservierung = vi.fn();
const mitgliedLoginEinloesen = vi.fn();
vi.mock("../../api/mitgliedLoginReservierungen", () => ({
  mitgliedLoginReservierungAnlegen: (...a: unknown[]) => mitgliedLoginReservierungAnlegen(...a),
  holeMitgliedLoginReservierung: (...a: unknown[]) => holeMitgliedLoginReservierung(...a),
  mitgliedLoginEinloesen: (...a: unknown[]) => mitgliedLoginEinloesen(...a),
}));

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,x") } }));

vi.mock("../../context/ConfigContext", () => ({
  useConfig: () => ({ config: { modul_barcode_aktiv: true } }),
}));

// useAuth mocken, damit wir das Persistieren der Identität direkt beobachten.
const identitaetSpeichern = vi.fn();
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ barcodeEinscannen: vi.fn(), identitaetSpeichern }),
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

vi.mock("../../hooks/useBarcodeSound", () => ({
  useBarcodeSound: () => ({ spieleErkannt: vi.fn(), spieleFehler: vi.fn() }),
}));

// Schwergewichtige Kind-Komponenten neutralisieren (Refs/Fokus/Scanner-Logik).
vi.mock("../../components/BarcodeEingabe", () => ({ BarcodeEingabe: () => <input aria-label="barcode" /> }));
vi.mock("../../components/PersonIdentifikation", () => ({ PersonIdentifikation: () => null }));

const mitgliedPasswortLogin = vi.fn();
vi.mock("../../api/auth", () => ({
  barcodeVorschau: vi.fn(),
  mitgliedPasswortLogin: (...a: unknown[]) => mitgliedPasswortLogin(...a),
  passwortAnfordern: vi.fn().mockResolvedValue({ status: "ok" }),
}));

import { MitgliedLogin } from "./MitgliedLogin";

describe("MitgliedLogin – QR-Reservierungs-Login", () => {
  beforeEach(() => {
    identitaetSpeichern.mockReset();
    navigate.mockReset();
    mitgliedLoginReservierungAnlegen.mockReset().mockResolvedValue({ token: "tok", ablauf_am: "2026-07-12T12:00:00Z" });
    mitgliedLoginEinloesen.mockReset().mockResolvedValue({ name: "Max Muster" });
    // Erste Abfrage: bereits bestätigt, noch nicht eingelöst.
    holeMitgliedLoginReservierung
      .mockReset()
      .mockResolvedValue({ abgelaufen: false, bestaetigt: true, eingeloest: false, person_name: "Max Muster", person_bild_url: null });
  });

  it("persistiert die Identität nach dem Einlösen, damit das Logo zur Mitglied-Startseite führt", async () => {
    render(<MitgliedLogin />);

    // QR-Flow starten ("Barcode vergessen") → QR-Ansicht + Polling-Intervall (1500 ms).
    fireEvent.click(screen.getByRole("button", { name: "Barcode vergessen" }));
    await screen.findByAltText("QR-Code für Login ohne Barcode");

    // Das Polling holt "bestätigt" und löst ein (Intervall = 1500 ms).
    await waitFor(() => expect(mitgliedLoginEinloesen).toHaveBeenCalledWith("tok"), { timeout: 4000 });
    // Kern der Regression: die Identität muss lokal gespeichert werden.
    expect(identitaetSpeichern).toHaveBeenCalledWith("Max Muster");
    expect(navigate).toHaveBeenCalledWith("/mitglied");
  });
});

describe("MitgliedLogin – Passwort-Login", () => {
  beforeEach(() => {
    identitaetSpeichern.mockReset();
    navigate.mockReset();
    mitgliedPasswortLogin.mockReset().mockResolvedValue({ name: "Max Muster" });
  });

  it("meldet per Name + Passwort an, merkt die Identität und navigiert zum Hub", async () => {
    const user = userEvent.setup();
    render(<MitgliedLogin />);

    await user.type(screen.getByLabelText("Name"), "Max Muster");
    await user.type(screen.getByLabelText("Passwort"), "geheim123");
    // Der Passwort-Login-Button ist die erste „Anmelden"-Schaltfläche (Karte oben).
    await user.click(screen.getAllByRole("button", { name: "Anmelden" })[0]);

    expect(mitgliedPasswortLogin).toHaveBeenCalledWith("Max Muster", "geheim123");
    await waitFor(() => expect(identitaetSpeichern).toHaveBeenCalledWith("Max Muster"));
    expect(navigate).toHaveBeenCalledWith("/mitglied");
  });
});
