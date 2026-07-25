import { describe, expect, it } from "vitest";
import { tokenGueltig } from "./jwt";

function macheToken(payload: Record<string, unknown>): string {
  return `kopf.${btoa(JSON.stringify(payload))}.signatur`;
}

describe("tokenGueltig", () => {
  it("ist false ohne Token", () => {
    expect(tokenGueltig(null)).toBe(false);
    expect(tokenGueltig("")).toBe(false);
  });

  it("ist false für ein abgelaufenes Token", () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    expect(tokenGueltig(macheToken({ rolle: "admin", exp }))).toBe(false);
  });

  it("ist true für ein noch gültiges Token", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(tokenGueltig(macheToken({ rolle: "admin", exp }))).toBe(true);
  });

  it("ist true, wenn kein exp-Claim vorhanden ist (Backend entscheidet)", () => {
    expect(tokenGueltig(macheToken({ rolle: "admin" }))).toBe(true);
  });

  it("ist false für ein kaputtes/nicht dekodierbares Token", () => {
    expect(tokenGueltig("nur-ein-teil")).toBe(false);
    expect(tokenGueltig("kopf.@@@.signatur")).toBe(false);
  });
});
