import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ angezeigterName: "Max Muster", mitgliedAbmelden: vi.fn() }),
}));
vi.mock("../../context/ConfigContext", () => ({ useConfig: () => ({ config: {} }) }));
const navigate = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("../../components/PushAktivierung", () => ({ PushAktivierung: () => null }));
vi.mock("../../components/InstallPrompt", () => ({ InstallPrompt: () => null }));

const holeMeinProfil = vi.fn();
vi.mock("../../api/auth", () => ({
  holeMeinProfil: (...a: unknown[]) => holeMeinProfil(...a),
  aktualisiereMeinProfil: vi.fn(),
  setzeMeinPasswort: vi.fn(),
}));

const holeMitgliedUebersicht = vi.fn();
vi.mock("../../api/mitglied", () => ({
  holeMitgliedUebersicht: (...a: unknown[]) => holeMitgliedUebersicht(...a),
}));

import { MitgliedHub } from "./MitgliedHub";

describe("MitgliedHub – Dashboard", () => {
  beforeEach(() => {
    navigate.mockReset();
    holeMeinProfil.mockReset().mockResolvedValue({
      name: "Max Muster",
      bild_url: null,
      gruppe_id: null,
      funktion_id: null,
      email: "m@example.org",
      benachrichtigungen_aktiv: false,
      passwort_gesetzt: true,
      gruppenfuehrer_rolle: null,
    });
    holeMitgliedUebersicht.mockReset().mockResolvedValue({
      einsaetze_jahr: 7,
      dienste_jahr: 3,
      dienststunden: [
        { funktion_id: 1, funktion_name: "Aktiv", summe_stunden: 10, schwellenwert_stunden: 20, schwellenwert_ueberschritten: false },
      ],
      letzte_einsaetze: [{ id: 1, titel: "B2 Zimmerbrand", zeitpunkt: "2026-06-01T10:00:00Z" }],
    });
  });

  it("zeigt eigene Kennzahlen, Dienststunden, letzte Einsätze und Profil", async () => {
    render(<MitgliedHub />);
    expect(await screen.findByText("7")).toBeInTheDocument(); // Einsätze dieses Jahr
    expect(screen.getByText("3")).toBeInTheDocument(); // Dienste dieses Jahr
    expect(screen.getByText("Meine Dienststunden")).toBeInTheDocument();
    expect(screen.getByText("B2 Zimmerbrand")).toBeInTheDocument();
    expect(screen.getByText("Mein Profil")).toBeInTheDocument();
  });

  it("zeigt nur Funktionen mit Stunden > 0 unter 'Meine Dienststunden'", async () => {
    holeMitgliedUebersicht.mockResolvedValue({
      einsaetze_jahr: 7,
      dienste_jahr: 3,
      dienststunden: [
        { funktion_id: 1, funktion_name: "Aktiv", summe_stunden: 10, schwellenwert_stunden: 20, schwellenwert_ueberschritten: false },
        { funktion_id: 2, funktion_name: "Jugendfeuerwehr", summe_stunden: 0, schwellenwert_stunden: 20, schwellenwert_ueberschritten: false },
      ],
      letzte_einsaetze: [],
    });
    render(<MitgliedHub />);
    expect(await screen.findByText("Aktiv")).toBeInTheDocument();
    expect(screen.queryByText("Jugendfeuerwehr")).not.toBeInTheDocument();
  });

  it("blendet 'Meine Dienststunden' ganz aus, wenn alle Funktionen 0 Stunden haben", async () => {
    holeMitgliedUebersicht.mockResolvedValue({
      einsaetze_jahr: 7,
      dienste_jahr: 3,
      dienststunden: [
        { funktion_id: 1, funktion_name: "Aktiv", summe_stunden: 0, schwellenwert_stunden: 20, schwellenwert_ueberschritten: false },
      ],
      letzte_einsaetze: [],
    });
    render(<MitgliedHub />);
    await screen.findByText("Mein Profil");
    expect(screen.queryByText("Meine Dienststunden")).not.toBeInTheDocument();
  });

  it("zeigt KEINEN Bereichswechsel-Button ohne gruppenfuehrer_rolle", async () => {
    render(<MitgliedHub />);
    await screen.findByText("Mein Profil");
    expect(screen.queryByRole("button", { name: /Gruppenführer-Bereich|Admin-Bereich/ })).not.toBeInTheDocument();
  });

  it("zeigt einen Bereichswechsel-Button zum Gruppenführer-Bereich und navigiert dorthin", async () => {
    holeMeinProfil.mockResolvedValue({
      name: "Max Muster",
      bild_url: null,
      gruppe_id: null,
      funktion_id: null,
      email: "m@example.org",
      benachrichtigungen_aktiv: false,
      passwort_gesetzt: true,
      gruppenfuehrer_rolle: "gruppenfuehrer",
    });
    const user = userEvent.setup();
    render(<MitgliedHub />);
    const button = await screen.findByRole("button", { name: "Zum Gruppenführer-Bereich" });
    await user.click(button);
    expect(navigate).toHaveBeenCalledWith("/gruppenfuehrer");
  });

  it("zeigt 'Zum Admin-Bereich' für Personen mit Admin-Rolle", async () => {
    holeMeinProfil.mockResolvedValue({
      name: "Max Muster",
      bild_url: null,
      gruppe_id: null,
      funktion_id: null,
      email: "m@example.org",
      benachrichtigungen_aktiv: false,
      passwort_gesetzt: true,
      gruppenfuehrer_rolle: "admin",
    });
    render(<MitgliedHub />);
    expect(await screen.findByRole("button", { name: "Zum Admin-Bereich" })).toBeInTheDocument();
  });
});
