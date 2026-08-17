import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BerechtigungMatrix } from "../../api/berechtigungen";

const holeBerechtigungen = vi.fn();
const setzeBerechtigung = vi.fn();
vi.mock("../../api/berechtigungen", () => ({
  holeBerechtigungen: (...a: unknown[]) => holeBerechtigungen(...a),
  setzeBerechtigung: (...a: unknown[]) => setzeBerechtigung(...a),
}));

import { Berechtigungen } from "./Berechtigungen";

const EIN_MODUL = [{ key: "einsatztagebuch", name: "Einsatztagebuch" }];

function matrix(over: Partial<BerechtigungMatrix>): BerechtigungMatrix {
  return { module: EIN_MODUL, gruppenfuehrer: [], ...over };
}

describe("Berechtigungen (Rechte-Matrix)", () => {
  beforeEach(() => {
    holeBerechtigungen.mockReset();
    setzeBerechtigung.mockReset().mockResolvedValue(undefined);
  });

  it("erteilt einem Gruppenführer ein Modul-Recht per Checkbox", async () => {
    holeBerechtigungen.mockResolvedValue(
      matrix({
        gruppenfuehrer: [
          { id: 3, username: "Max GF", rolle: "gruppenfuehrer", ist_admin: false, module: [] },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<Berechtigungen />);

    const box = await screen.findByRole("checkbox");
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(setzeBerechtigung).toHaveBeenCalledWith(3, "einsatztagebuch", true);
  });

  it("Admins haben Vollzugriff: Checkbox ist deaktiviert (nicht änderbar)", async () => {
    holeBerechtigungen.mockResolvedValue(
      matrix({
        gruppenfuehrer: [
          { id: 1, username: "Chef", rolle: "admin", ist_admin: true, module: [] },
        ],
      }),
    );
    render(<Berechtigungen />);

    const box = await screen.findByRole("checkbox");
    expect(box).toBeDisabled();
  });
});
