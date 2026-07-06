import { describe, expect, it } from "vitest";
import { oeffentlicheBasisUrl } from "./oeffentlicheUrl";
import type { OeffentlicheKonfiguration } from "../api/types";

function konfig(url: string): OeffentlicheKonfiguration {
  return { oeffentliche_basis_url: url } as OeffentlicheKonfiguration;
}

describe("oeffentlicheBasisUrl", () => {
  it("nutzt die konfigurierte URL ohne Trailing-Slash", () => {
    expect(oeffentlicheBasisUrl(konfig("https://fw.example.org/"))).toBe("https://fw.example.org");
    expect(oeffentlicheBasisUrl(konfig("https://fw.example.org///"))).toBe("https://fw.example.org");
  });

  it("fällt ohne Konfiguration auf die Browser-Adresse zurück", () => {
    expect(oeffentlicheBasisUrl(konfig("  "))).toBe(window.location.origin);
    expect(oeffentlicheBasisUrl(null)).toBe(window.location.origin);
  });
});
