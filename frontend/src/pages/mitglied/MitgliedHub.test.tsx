import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ angezeigterName: "Max Muster", mitgliedAbmelden: vi.fn() }),
}));
vi.mock("../../context/ConfigContext", () => ({ useConfig: () => ({ config: {} }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
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
    holeMeinProfil.mockReset().mockResolvedValue({
      name: "Max Muster",
      bild_url: null,
      gruppe_id: null,
      funktion_id: null,
      email: "m@example.org",
      benachrichtigungen_aktiv: false,
      passwort_gesetzt: true,
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
});
