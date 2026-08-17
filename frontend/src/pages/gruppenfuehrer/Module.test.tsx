import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeatureModul } from "../../api/featureModule";

const holeFeatureModule = vi.fn();
const setFeatureModulFlag = vi.fn();
const setFeatureModulReihenfolge = vi.fn();
vi.mock("../../api/featureModule", () => ({
  holeFeatureModule: (...a: unknown[]) => holeFeatureModule(...a),
  setFeatureModulFlag: (...a: unknown[]) => setFeatureModulFlag(...a),
  setFeatureModulReihenfolge: (...a: unknown[]) => setFeatureModulReihenfolge(...a),
}));

const holeMeta = vi.fn();
vi.mock("../../api/meta", () => ({ holeMeta: (...a: unknown[]) => holeMeta(...a) }));

import { Module } from "./Module";

function modul(over: Partial<FeatureModul>): FeatureModul {
  return {
    key: "x",
    name: "X",
    mitgliederseitig: false,
    immer_aktiv: false,
    reihenfolge: 0,
    aktiv: true,
    startseite: null,
    aussenzugriff: null,
    ...over,
  };
}

const DIVERA = modul({ key: "divera", name: "Divera 24/7", mitgliederseitig: false, reihenfolge: 1 });
const FORMULAR = modul({
  key: "formular",
  name: "Formular",
  mitgliederseitig: true,
  reihenfolge: 2,
  startseite: false,
  aussenzugriff: false,
});

function renderModule() {
  return render(
    <MemoryRouter>
      <Module />
    </MemoryRouter>,
  );
}

describe("Module (Modul-Übersicht)", () => {
  beforeEach(() => {
    holeFeatureModule.mockReset().mockResolvedValue([DIVERA, FORMULAR]);
    setFeatureModulFlag.mockReset().mockImplementation((key, flags) =>
      Promise.resolve(modul({ ...DIVERA, key, ...flags })),
    );
    setFeatureModulReihenfolge.mockReset().mockResolvedValue([DIVERA, FORMULAR]);
    holeMeta.mockReset().mockResolvedValue({ docs_basis_url: "" });
  });

  it("schaltet ein Modul über die 'Aktiv'-Checkbox um", async () => {
    holeFeatureModule.mockResolvedValue([DIVERA]);
    const user = userEvent.setup();
    renderModule();
    const aktiv = await screen.findByLabelText("Aktiv");
    expect(aktiv).toBeChecked();
    await user.click(aktiv);
    expect(setFeatureModulFlag).toHaveBeenCalledWith("divera", { aktiv: false });
  });

  it("filtert die Liste über die Suche", async () => {
    const user = userEvent.setup();
    renderModule();
    expect(await screen.findByRole("link", { name: /Divera/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Formular/ })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Modul suchen…"), "Divera");

    expect(screen.getByRole("link", { name: /Divera/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Formular/ })).not.toBeInTheDocument();
  });
});
