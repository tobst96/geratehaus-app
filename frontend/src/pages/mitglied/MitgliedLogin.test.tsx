import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// useAuth mocken, damit wir das Persistieren der Identität direkt beobachten.
const identitaetSpeichern = vi.fn();
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ identitaetSpeichern }),
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const mitgliedPasswortLogin = vi.fn();
vi.mock("../../api/auth", () => ({
  mitgliedPasswortLogin: (...a: unknown[]) => mitgliedPasswortLogin(...a),
  passwortAnfordern: vi.fn().mockResolvedValue({ status: "ok" }),
}));

import { MitgliedLogin } from "./MitgliedLogin";

describe("MitgliedLogin – Passwort-Login", () => {
  beforeEach(() => {
    identitaetSpeichern.mockReset();
    navigate.mockReset();
    mitgliedPasswortLogin.mockReset().mockResolvedValue({ name: "Max Muster" });
  });

  it("meldet per E-Mail + Passwort an, merkt die Identität und navigiert zum Hub", async () => {
    const user = userEvent.setup();
    render(<MitgliedLogin />);

    await user.type(screen.getByLabelText("E-Mail"), "max@example.org");
    await user.type(screen.getByLabelText("Passwort"), "geheim123");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(mitgliedPasswortLogin).toHaveBeenCalledWith("max@example.org", "geheim123");
    await waitFor(() => expect(identitaetSpeichern).toHaveBeenCalledWith("Max Muster"));
    expect(navigate).toHaveBeenCalledWith("/mitglied");
  });

  it("bietet weder Barcode- noch PIN-Anmeldung an – E-Mail+Passwort ist die einzige Option", () => {
    render(<MitgliedLogin />);
    expect(screen.queryByLabelText(/barcode/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/pin/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Barcode vergessen" })).not.toBeInTheDocument();
  });
});
