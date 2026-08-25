import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const holeKategorien = vi.fn();
const holeVorlagen = vi.fn();
const legeKategorieAn = vi.fn();
const legeVorlageAn = vi.fn();
const aktualisiereKategorie = vi.fn();
const aktualisiereVorlage = vi.fn();
const deaktiviereVorlage = vi.fn();
vi.mock("../../../api/dienstbuchPlaner", () => ({
  holeKategorien: (...a: unknown[]) => holeKategorien(...a),
  holeVorlagen: (...a: unknown[]) => holeVorlagen(...a),
  legeKategorieAn: (...a: unknown[]) => legeKategorieAn(...a),
  legeVorlageAn: (...a: unknown[]) => legeVorlageAn(...a),
  aktualisiereKategorie: (...a: unknown[]) => aktualisiereKategorie(...a),
  aktualisiereVorlage: (...a: unknown[]) => aktualisiereVorlage(...a),
  deaktiviereVorlage: (...a: unknown[]) => deaktiviereVorlage(...a),
  holeBundeslaender: vi.fn().mockResolvedValue({ BY: "Bayern" }),
  holeFeiertage: vi.fn().mockResolvedValue([]),
  legeFeiertagAn: vi.fn(),
  loescheFeiertag: vi.fn(),
}));
vi.mock("../../../api/gruppenfuehrer", () => ({
  holeEinstellungen: vi.fn().mockResolvedValue({}),
  schreibeEinstellungen: vi.fn(),
}));

import { DienstbuchPlanerModul } from "./DienstbuchPlanerModul";

function renderModul() {
  return render(
    <MemoryRouter>
      <DienstbuchPlanerModul />
    </MemoryRouter>,
  );
}

describe("DienstbuchPlanerModul (Admin-Einstellungen)", () => {
  beforeEach(() => {
    holeKategorien.mockReset().mockResolvedValue([]);
    holeVorlagen.mockReset().mockResolvedValue([]);
    legeKategorieAn.mockReset().mockResolvedValue({ id: 1, name: "Ausbildung", farbe: "#3B82F6", reihenfolge: 0, aktiv: true });
    legeVorlageAn.mockReset().mockResolvedValue({});
  });

  it("zeigt bestehende Vorlagen an", async () => {
    holeVorlagen.mockResolvedValue([
      {
        id: 1,
        titel: "Unterweisung UVV",
        beschreibung: null,
        wiederholungstyp: "jaehrlich",
        intervall: null,
        wochentag: 2,
        kalenderwoche: 5,
        kw_paritaet: "ungerade",
        mindest_intervall_aktiv: false,
        mindest_intervall_tage: null,
        startdatum: "2020-01-01",
        enddatum: null,
        aktiv: true,
        kategorien: [],
      },
    ]);
    renderModul();
    expect(await screen.findByText("Unterweisung UVV")).toBeInTheDocument();
  });

  it("legt eine neue Kategorie an", async () => {
    const user = userEvent.setup();
    renderModul();
    await screen.findByText("Kategorien");

    await user.type(
      screen.getByPlaceholderText("Neue Kategorie, z. B. Ausbildung"),
      "Ausbildung",
    );
    // Button-Reihenfolge: [0] Feiertag anlegen, [1] Kategorie, [2] Vorlage.
    await user.click(screen.getAllByRole("button", { name: "Anlegen" })[1]);

    expect(legeKategorieAn).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ausbildung" }),
    );
  });

  it("legt eine neue jährliche Vorlage mit KW/Wochentag/Parität an", async () => {
    const user = userEvent.setup();
    renderModul();
    await screen.findByText("Wiederholungsregeln (Vorlagen)");

    await user.type(screen.getByLabelText("Titel"), "Unterweisung UVV");
    await user.type(screen.getByLabelText("Kalenderwoche (1–53)"), "5");
    await user.selectOptions(screen.getByLabelText("Wochentag"), "2");
    // Parität ist bei "jedes Jahr" durch die KW festgelegt und wird nicht
    // angeboten/mitgesendet (verhindert widersprüchliche Regeln).
    expect(screen.queryByLabelText("Kalenderwochen-Parität")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Anlegen" })[2]);

    expect(legeVorlageAn).toHaveBeenCalledWith(
      expect.objectContaining({
        titel: "Unterweisung UVV",
        wiederholungstyp: "jaehrlich",
        kalenderwoche: 5,
        wochentag: 2,
        kw_paritaet: null,
      }),
    );
  });
});
