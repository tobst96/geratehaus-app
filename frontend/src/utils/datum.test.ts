import { afterEach, describe, expect, it } from "vitest";
import { formatiereDatum, formatiereDatumZeit, formatiereZeit, setZeitzone, STANDARD_ZEITZONE } from "./datum";

// Fester UTC-Zeitpunkt: 2026-07-01 12:00 UTC.
const ISO = "2026-07-01T12:00:00Z";

afterEach(() => setZeitzone(STANDARD_ZEITZONE));

describe("Datumsformatierung in der konfigurierten Zeitzone", () => {
  it("nutzt Europe/Berlin (Sommerzeit = UTC+2) standardmäßig", () => {
    // 12:00 UTC → 14:00 in Berlin (MESZ).
    expect(formatiereZeit(ISO)).toBe("14:00:00");
    expect(formatiereDatum(ISO)).toBe("1.7.2026");
    expect(formatiereDatumZeit(ISO)).toContain("14:00:00");
  });

  it("berücksichtigt eine andere gesetzte Zeitzone", () => {
    setZeitzone("America/New_York"); // 12:00 UTC → 08:00 EDT
    expect(formatiereZeit(ISO)).toBe("08:00:00");
  });

  it("akzeptiert Date-Objekte und ISO-Strings", () => {
    expect(formatiereZeit(new Date(ISO))).toBe(formatiereZeit(ISO));
  });

  it("fällt bei leerer Zeitzone auf den bisherigen Wert zurück", () => {
    setZeitzone(""); // kein Wechsel
    expect(formatiereZeit(ISO)).toBe("14:00:00");
  });
});
