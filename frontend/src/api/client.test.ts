import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("anfrage – abgelehntes Gruppenführer-Token", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("räumt ein vom Server abgelehntes Token auf und meldet die Session als abgelaufen", async () => {
    const { anfrage, setGruppenfuehrerToken, getGruppenfuehrerToken, ApiError } = await import("./client");
    setGruppenfuehrerToken("altes.token.wert");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: { get: () => null },
        json: async () => ({ detail: "Nicht angemeldet." }),
      })
    );

    const ereignis = vi.fn();
    window.addEventListener("gruppenfuehrer-session-abgelaufen", ereignis);

    await expect(anfrage("/gruppenfuehrer/dashboard")).rejects.toBeInstanceOf(ApiError);

    expect(getGruppenfuehrerToken()).toBeNull();
    expect(localStorage.getItem("gruppenfuehrer_token")).toBeNull();
    expect(ereignis).toHaveBeenCalledTimes(1);

    window.removeEventListener("gruppenfuehrer-session-abgelaufen", ereignis);
  });

  it("löst das Ereignis nicht aus, wenn ohne Token angefragt wurde (z. B. Login mit falschem Passwort)", async () => {
    const { anfrage, getGruppenfuehrerToken, ApiError } = await import("./client");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: { get: () => null },
        json: async () => ({ detail: "E-Mail oder Passwort falsch." }),
      })
    );

    const ereignis = vi.fn();
    window.addEventListener("gruppenfuehrer-session-abgelaufen", ereignis);

    await expect(anfrage("/auth/mitglied-login", { method: "POST", body: {} })).rejects.toBeInstanceOf(ApiError);

    expect(getGruppenfuehrerToken()).toBeNull();
    expect(ereignis).not.toHaveBeenCalled();

    window.removeEventListener("gruppenfuehrer-session-abgelaufen", ereignis);
  });
});
