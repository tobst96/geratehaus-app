import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../context/ConfigContext", () => ({
  useConfig: () => ({ config: { organisation_name: "Freiwillige Feuerwehr Musterstadt" } }),
}));

import { LandingPage } from "./LandingPage";

function rendern() {
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

describe("LandingPage", () => {
  it("zeigt den Organisationsnamen, eine Erklärung und einen Anmelden-Button", () => {
    rendern();
    expect(screen.getByRole("heading", { name: "Freiwillige Feuerwehr Musterstadt" })).toBeInTheDocument();
    expect(screen.getByText(/digitale Einsatzverwaltung/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Anmelden" });
    expect(link).toHaveAttribute("href", "/mitglied/login");
  });

  it("zeigt keine separaten Mitglied-/Gruppenführer-/Admin-Karten mehr", () => {
    rendern();
    expect(screen.queryByRole("link", { name: "Gruppenführer-Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin-Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mitglieder-Login" })).not.toBeInTheDocument();
  });

  it("behält den Kiosk-Hinweis und den API-Doku-Link", () => {
    rendern();
    expect(screen.getByText(/Kiosk-Modus-Link/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "API-Dokumentation (Swagger)" })).toHaveAttribute(
      "href",
      "/api/v1/docs"
    );
  });
});
