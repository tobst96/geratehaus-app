import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const gruppenfuehrerStepUp = vi.fn();
const gruppenfuehrer2faAbschliessen = vi.fn();
const gruppenfuehrer2faEinrichten = vi.fn();
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ gruppenfuehrerStepUp, gruppenfuehrer2faEinrichten, gruppenfuehrer2faAbschliessen }),
}));

import { GruppenfuehrerLogin } from "./GruppenfuehrerLogin";

describe("GruppenfuehrerLogin (Step-up)", () => {
  beforeEach(() => {
    navigate.mockClear();
    gruppenfuehrerStepUp.mockReset();
    gruppenfuehrer2faAbschliessen.mockReset();
    gruppenfuehrer2faEinrichten.mockReset();
  });

  it("löst beim Mount automatisch den Step-up aus und navigiert ohne 2FA sofort weiter", async () => {
    gruppenfuehrerStepUp.mockResolvedValue({
      zweiFaktorErforderlich: false,
      einrichtungErforderlich: false,
      emailGesetzt: false,
      challenge: null,
    });
    render(<GruppenfuehrerLogin />);
    expect(gruppenfuehrerStepUp).toHaveBeenCalled();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/gruppenfuehrer", { replace: true }));
  });

  it("zeigt den Code-Schritt, wenn 2FA erforderlich ist", async () => {
    gruppenfuehrerStepUp.mockResolvedValue({
      zweiFaktorErforderlich: true,
      einrichtungErforderlich: false,
      emailGesetzt: false,
      challenge: "chal-123",
    });
    render(<GruppenfuehrerLogin />);
    expect(await screen.findByRole("heading", { name: "Bestätigungscode" })).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("erzwingt die 2FA-Einrichtung (Pflicht): E-Mail → Recovery-Codes → Code-Schritt", async () => {
    const user = userEvent.setup();
    gruppenfuehrerStepUp.mockResolvedValue({
      zweiFaktorErforderlich: false,
      einrichtungErforderlich: true,
      emailGesetzt: false,
      challenge: "chal-setup",
    });
    gruppenfuehrer2faEinrichten.mockResolvedValue({ recovery_codes: ["AAA-111", "BBB-222"], challenge: "chal-otp" });
    render(<GruppenfuehrerLogin />);

    expect(await screen.findByRole("heading", { name: "Zwei-Faktor-Authentisierung einrichten" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("E-Mail-Adresse für Codes"), "chef@example.org");
    await user.click(screen.getByRole("button", { name: "2FA einrichten" }));
    expect(gruppenfuehrer2faEinrichten).toHaveBeenCalledWith("chal-setup", "chef@example.org");

    expect(await screen.findByRole("heading", { name: "Recovery-Codes sichern" })).toBeInTheDocument();
    expect(screen.getByText("AAA-111")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Weiter zur Code-Eingabe" }));
    expect(await screen.findByRole("heading", { name: "Bestätigungscode" })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("zeigt eine Fehlermeldung mit Rückweg, wenn kein erhöhter Zugang besteht (403)", async () => {
    gruppenfuehrerStepUp.mockRejectedValue(new ApiError(403, "Kein erhöhter Zugang für diese Person."));
    render(
      <MemoryRouter>
        <GruppenfuehrerLogin />
      </MemoryRouter>
    );
    expect(await screen.findByText("Kein erhöhter Zugang für dieses Konto.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zurück zum Mitgliederbereich" })).toHaveAttribute(
      "href",
      "/mitglied"
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("leitet ohne Mitglied-Cookie (401) zum Login weiter", async () => {
    gruppenfuehrerStepUp.mockRejectedValue(new ApiError(401, "Nicht angemeldet."));
    render(<GruppenfuehrerLogin />);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/mitglied/login", { replace: true }));
  });
});
