import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gruppenfuehrerAbmelden = vi.fn();
const navigate = vi.fn();
const useAuthMock = vi.fn();

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));
vi.mock("../../context/ConfigContext", () => ({
  useConfig: () => ({ config: {}, neuLaden: vi.fn() }),
}));
vi.mock("../../api/featureModule", () => ({
  holeFeatureModule: vi.fn().mockResolvedValue([]),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

import { GruppenfuehrerLayout } from "./GruppenfuehrerLayout";

function rendern() {
  render(
    <MemoryRouter initialEntries={["/gruppenfuehrer/dashboard"]}>
      <Routes>
        <Route path="/gruppenfuehrer/*" element={<GruppenfuehrerLayout />}>
          <Route path="dashboard" element={<div>Dashboard-Inhalt</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("GruppenfuehrerLayout – Rückwechsel zur Mitgliederseite", () => {
  beforeEach(() => {
    gruppenfuehrerAbmelden.mockReset();
    navigate.mockReset();
  });

  it("zeigt den Link 'Zurück zur Mitgliederseite', wenn eine Mitglied-Identität besteht, und navigiert ohne Abmelden", async () => {
    useAuthMock.mockReturnValue({
      gruppenfuehrerAbmelden,
      gruppenfuehrerRolle: "gruppenfuehrer",
      hatModulZugriff: () => false,
      angezeigterName: "Max Muster",
    });
    const user = userEvent.setup();
    rendern();

    const link = screen.getByRole("button", { name: "Zurück zur Mitgliederseite" });
    await user.click(link);

    expect(navigate).toHaveBeenCalledWith("/mitglied");
    expect(gruppenfuehrerAbmelden).not.toHaveBeenCalled();
  });

  it("zeigt den Link NICHT ohne Mitglied-Identität", () => {
    useAuthMock.mockReturnValue({
      gruppenfuehrerAbmelden,
      gruppenfuehrerRolle: "admin",
      hatModulZugriff: () => true,
      angezeigterName: null,
    });
    rendern();

    expect(screen.queryByRole("button", { name: "Zurück zur Mitgliederseite" })).not.toBeInTheDocument();
  });
});
