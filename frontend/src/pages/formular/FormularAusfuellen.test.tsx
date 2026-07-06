import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "1" }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: (p: any) => <a {...p} />,
}));

const holeOeffentlichesFormular = vi.fn();
const formularEinreichen = vi.fn();
vi.mock("../../api/formular", () => ({
  holeOeffentlichesFormular: (...a: unknown[]) => holeOeffentlichesFormular(...a),
  formularEinreichen: (...a: unknown[]) => formularEinreichen(...a),
  holeOeffentlichesErgebnis: () => Promise.resolve(null),
  formularDateiHochladen: vi.fn(),
}));
vi.mock("../moderator/FormularZusammenfassung", () => ({ FormularZusammenfassung: () => null }));

import { FormularAusfuellen } from "./FormularAusfuellen";

const FORMULAR = {
  id: 1,
  name: "Testformular",
  beschreibung: "",
  login_erforderlich: false,
  einwilligung_text: "",
  danke_text: "Danke fürs Mitmachen",
  ergebnis_oeffentlich: false,
  felder: [{ id: 10, label: "Dein Name", typ: "text", pflicht: true, optionen: [], hilfetext: "" }],
};

describe("FormularAusfuellen", () => {
  beforeEach(() => {
    localStorage.clear();
    holeOeffentlichesFormular.mockReset().mockResolvedValue(FORMULAR);
    formularEinreichen.mockReset().mockResolvedValue({ id: 99 });
  });

  it("blockiert das Absenden bei leerem Pflichtfeld", async () => {
    const user = userEvent.setup();
    render(<FormularAusfuellen />);
    await screen.findByText("Testformular");
    await user.click(screen.getByRole("button", { name: "Absenden" }));
    expect(await screen.findByText("Dieses Feld muss ausgefüllt werden.")).toBeInTheDocument();
    expect(formularEinreichen).not.toHaveBeenCalled();
  });

  it("sendet ein ausgefülltes Formular und zeigt den Dank", async () => {
    const user = userEvent.setup();
    render(<FormularAusfuellen />);
    await screen.findByText("Testformular");
    const container = screen.getByText("Dein Name").closest(".formular-feld") as HTMLElement;
    await user.type(container.querySelector("input") as HTMLInputElement, "Max");
    await user.click(screen.getByRole("button", { name: "Absenden" }));
    expect(await screen.findByText("Vielen Dank!")).toBeInTheDocument();
    expect(formularEinreichen).toHaveBeenCalledWith(1, { 10: "Max" }, expect.anything());
  });
});
