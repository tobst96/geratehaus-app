import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));

const moderatorAnmelden = vi.fn();
const moderator2faAbschliessen = vi.fn();
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ moderatorAnmelden, moderator2faAbschliessen }),
}));

import { ModeratorLogin } from "./ModeratorLogin";

async function anmelden() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "admin");
  await user.type(screen.getByLabelText("Passwort"), "geheim123");
  await user.click(screen.getByRole("button", { name: "Anmelden" }));
}

describe("ModeratorLogin", () => {
  beforeEach(() => {
    navigate.mockClear();
    moderatorAnmelden.mockReset();
    moderator2faAbschliessen.mockReset();
  });

  it("navigiert nach erfolgreichem Login ohne 2FA", async () => {
    moderatorAnmelden.mockResolvedValue({ zweiFaktorErforderlich: false, challenge: null });
    render(<ModeratorLogin />);
    await anmelden();
    expect(moderatorAnmelden).toHaveBeenCalledWith("admin", "geheim123");
    expect(navigate).toHaveBeenCalledWith("/moderator");
  });

  it("zeigt den Code-Schritt, wenn 2FA erforderlich ist", async () => {
    moderatorAnmelden.mockResolvedValue({ zweiFaktorErforderlich: true, challenge: "chal-123" });
    render(<ModeratorLogin />);
    await anmelden();
    // Zweiter Schritt: Bestätigungscode-Formular erscheint, noch keine Navigation.
    expect(await screen.findByRole("heading", { name: "Bestätigungscode" })).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
