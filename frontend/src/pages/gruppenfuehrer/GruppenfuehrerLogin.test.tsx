import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));

const gruppenfuehrerAnmelden = vi.fn();
const gruppenfuehrer2faAbschliessen = vi.fn();
const gruppenfuehrer2faEinrichten = vi.fn();
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ gruppenfuehrerAnmelden, gruppenfuehrer2faEinrichten, gruppenfuehrer2faAbschliessen }),
}));

import { GruppenfuehrerLogin } from "./GruppenfuehrerLogin";

async function anmelden() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "admin");
  await user.type(screen.getByLabelText("Passwort"), "geheim123");
  await user.click(screen.getByRole("button", { name: "Anmelden" }));
}

describe("GruppenfuehrerLogin", () => {
  beforeEach(() => {
    navigate.mockClear();
    gruppenfuehrerAnmelden.mockReset();
    gruppenfuehrer2faAbschliessen.mockReset();
    gruppenfuehrer2faEinrichten.mockReset();
  });

  it("navigiert nach erfolgreichem Login ohne 2FA", async () => {
    gruppenfuehrerAnmelden.mockResolvedValue({ zweiFaktorErforderlich: false, challenge: null });
    render(<GruppenfuehrerLogin />);
    await anmelden();
    expect(gruppenfuehrerAnmelden).toHaveBeenCalledWith("admin", "geheim123");
    expect(navigate).toHaveBeenCalledWith("/gruppenfuehrer");
  });

  it("zeigt den Code-Schritt, wenn 2FA erforderlich ist", async () => {
    gruppenfuehrerAnmelden.mockResolvedValue({ zweiFaktorErforderlich: true, challenge: "chal-123" });
    render(<GruppenfuehrerLogin />);
    await anmelden();
    // Zweiter Schritt: Bestätigungscode-Formular erscheint, noch keine Navigation.
    expect(await screen.findByRole("heading", { name: "Bestätigungscode" })).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("erzwingt die 2FA-Einrichtung (Pflicht): E-Mail → Recovery-Codes → Code-Schritt", async () => {
    const user = userEvent.setup();
    gruppenfuehrerAnmelden.mockResolvedValue({
      zweiFaktorErforderlich: false,
      einrichtungErforderlich: true,
      emailGesetzt: false,
      challenge: "chal-setup",
    });
    gruppenfuehrer2faEinrichten.mockResolvedValue({ recovery_codes: ["AAA-111", "BBB-222"], challenge: "chal-otp" });
    render(<GruppenfuehrerLogin />);
    await anmelden();

    // Einrichtungsschritt mit E-Mail-Feld.
    expect(await screen.findByRole("heading", { name: "Zwei-Faktor-Authentisierung einrichten" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("E-Mail-Adresse für Codes"), "chef@example.org");
    await user.click(screen.getByRole("button", { name: "2FA einrichten" }));
    expect(gruppenfuehrer2faEinrichten).toHaveBeenCalledWith("chal-setup", "chef@example.org");

    // Recovery-Codes werden angezeigt.
    expect(await screen.findByRole("heading", { name: "Recovery-Codes sichern" })).toBeInTheDocument();
    expect(screen.getByText("AAA-111")).toBeInTheDocument();

    // Weiter → Code-Eingabe (mit dem neuen Challenge), noch keine Navigation.
    await user.click(screen.getByRole("button", { name: "Weiter zur Code-Eingabe" }));
    expect(await screen.findByRole("heading", { name: "Bestätigungscode" })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
