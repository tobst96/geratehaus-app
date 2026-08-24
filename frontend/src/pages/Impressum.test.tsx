import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const config = vi.fn();
vi.mock("../context/ConfigContext", () => ({
  useConfig: () => ({ config: config() }),
}));

import { Impressum } from "./Impressum";

describe("Impressum", () => {
  it("zeigt einen Hinweis, solange keine Angaben hinterlegt sind", () => {
    config.mockReturnValue({ organisation_name: "Freiwillige Feuerwehr Musterstadt" });
    render(<Impressum />);
    expect(screen.getByText(/noch kein Impressum hinterlegt/)).toBeInTheDocument();
  });

  it("zeigt die hinterlegten Angaben", () => {
    config.mockReturnValue({
      organisation_name: "Freiwillige Feuerwehr Musterstadt",
      impressum_verantwortliche_person: "Max Mustermann",
      impressum_anschrift: "Musterstraße 1\n12345 Musterstadt",
      impressum_email: "vorstand@feuerwehr-musterstadt.de",
      impressum_telefon: "+49 1234 56789",
      impressum_zusatz: "Eingetragen im Vereinsregister XY",
    });
    render(<Impressum />);
    expect(screen.getByText("Max Mustermann")).toBeInTheDocument();
    expect(screen.getByText("vorstand@feuerwehr-musterstadt.de")).toBeInTheDocument();
    expect(screen.getByText(/\+49 1234 56789/)).toBeInTheDocument();
    expect(screen.getByText(/Eingetragen im Vereinsregister XY/)).toBeInTheDocument();
    expect(screen.queryByText(/noch kein Impressum hinterlegt/)).not.toBeInTheDocument();
  });
});
