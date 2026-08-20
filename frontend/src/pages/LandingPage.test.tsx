import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.fn();
vi.mock("../context/ConfigContext", () => ({
  useConfig: () => ({ config: config() }),
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
  beforeEach(() => {
    config.mockReset().mockReturnValue({ organisation_name: "Freiwillige Feuerwehr Musterstadt" });
  });

  it("zeigt ohne Logo 'Gerätehaus.app' als Überschrift (nicht den Organisationsnamen), eine Erklärung und einen Anmelden-Button", () => {
    config.mockReturnValue({ organisation_name: "Freiwillige Feuerwehr Musterstadt" });
    rendern();
    expect(screen.getByRole("heading", { name: "Gerätehaus.app" })).toBeInTheDocument();
    expect(screen.getByText(/digitale Einsatzverwaltung/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Anmelden" });
    expect(link).toHaveAttribute("href", "/mitglied/login");
  });

  it("blendet die Überschrift bei konfiguriertem Logo visuell aus, behält aber den echten Organisationsnamen für Screenreader", () => {
    config.mockReturnValue({
      organisation_name: "Freiwillige Feuerwehr Musterstadt",
      logo_url: "/uploads/logo.png",
    });
    rendern();
    const heading = screen.getByRole("heading", { name: "Freiwillige Feuerwehr Musterstadt" });
    expect(heading).toHaveClass("sr-only");
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
