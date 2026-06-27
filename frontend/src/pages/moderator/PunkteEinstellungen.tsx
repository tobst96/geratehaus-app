import { useEffect, useState, type FormEvent } from "react";
import {
  holeEinstellungen,
  schreibeEinstellungen,
  holeAllePersonen,
  punkteBelohnungVergeben,
} from "../../api/moderator";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Banner } from "../../components/Banner";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import type { Person } from "../../api/types";

interface PunkteRegelState {
  punkte: number;
  tage: number;
  modus: string;
}

interface RegelZeile {
  schluessel: "anlage" | "profilbild" | "email" | "einsatz" | "dienstbuch" | "dienststunden";
  titel: string;
  beschreibung: string;
  einheit: string;
}

const REGEL_ZEILEN: RegelZeile[] = [
  {
    schluessel: "anlage",
    titel: "Neuanlage einer Person",
    beschreibung: "Wird einmalig bei Anlage im Personal-Tab vergeben.",
    einheit: "Punkte",
  },
  {
    schluessel: "profilbild",
    titel: "Erstes Profilbild",
    beschreibung: "Wird einmalig vergeben, sobald die Person zum ersten Mal ein Profilbild erhält.",
    einheit: "Punkte",
  },
  {
    schluessel: "email",
    titel: "Erste E-Mail-Adresse",
    beschreibung: "Wird einmalig vergeben, sobald für die Person zum ersten Mal eine E-Mail hinterlegt wird.",
    einheit: "Punkte",
  },
  {
    schluessel: "einsatz",
    titel: "Einsatz abgeschlossen",
    beschreibung:
      "Wird je Teilnahme vergeben, wenn ein Einsatz abgeschlossen wird. Bei Wiedereröffnung werden die " +
      "Punkte zurückgenommen, bei erneutem Abschluss wieder vergeben.",
    einheit: "Punkte",
  },
  {
    schluessel: "dienstbuch",
    titel: "Dienstbuch geschlossen",
    beschreibung:
      "Wird je Teilnahme vergeben, wenn ein Dienstbuch geschlossen wird. Bei Wiedereröffnung werden die " +
      "Punkte zurückgenommen, bei erneutem Schließen wieder vergeben.",
    einheit: "Punkte",
  },
  {
    schluessel: "dienststunden",
    titel: "Dienststunden erfasst",
    beschreibung:
      "Punkte PRO STUNDE bei jeder Dienststunden-Erfassung, präzise auf die Minute berechnet " +
      "(z. B. 1,5 Std. = 1,5-facher Wert). Kommazahlen sind hier erlaubt.",
    einheit: "Punkte/Std.",
  },
];

export function PunkteEinstellungen() {
  const { moderatorRolle } = useAuth();
  const istAdmin = moderatorRolle === "admin";

  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  const [regeln, setRegeln] = useState<Record<string, PunkteRegelState>>({
    anlage: { punkte: 1, tage: 3, modus: "halten" },
    profilbild: { punkte: 50, tage: 365, modus: "halten" },
    email: { punkte: 30, tage: 100, modus: "halten" },
    einsatz: { punkte: 5, tage: 180, modus: "halten" },
    dienstbuch: { punkte: 5, tage: 180, modus: "halten" },
    dienststunden: { punkte: 1, tage: 180, modus: "halten" },
  });

  const [personen, setPersonen] = useState<Person[]>([]);
  const [belohnungPersonId, setBelohnungPersonId] = useState<string>("");
  const [belohnungPunkte, setBelohnungPunkte] = useState(5);
  const [belohnungGrund, setBelohnungGrund] = useState("");
  const [belohnungTage, setBelohnungTage] = useState(180);
  const [belohnungLaeuft, setBelohnungLaeuft] = useState(false);
  const [belohnungErfolg, setBelohnungErfolg] = useState<string | null>(null);

  function regelAendern(schluessel: string, regel: PunkteRegelState) {
    setRegeln((vorher) => ({ ...vorher, [schluessel]: regel }));
  }

  async function laden() {
    try {
      if (istAdmin) {
        const w = await holeEinstellungen();
        const neu: Record<string, PunkteRegelState> = {};
        for (const { schluessel } of REGEL_ZEILEN) {
          neu[schluessel] = {
            punkte: Number(w[`punkte_${schluessel}_punkte`] ?? regeln[schluessel].punkte),
            tage: Number(w[`punkte_${schluessel}_tage`] ?? regeln[schluessel].tage),
            modus: String(w[`punkte_${schluessel}_modus`] ?? regeln[schluessel].modus),
          };
        }
        setRegeln(neu);
      }
      setPersonen(await holeAllePersonen());
      setGeladen(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function belohnungAbsenden(e: FormEvent) {
    e.preventDefault();
    if (!belohnungPersonId || !belohnungGrund.trim()) return;
    setBelohnungLaeuft(true);
    setFehler(null);
    setBelohnungErfolg(null);
    try {
      const ergebnis = await punkteBelohnungVergeben({
        person_id: Number(belohnungPersonId),
        punkte: belohnungPunkte,
        grund: belohnungGrund.trim(),
        gueltig_tage: belohnungTage,
      });
      const person = personen.find((p) => p.id === Number(belohnungPersonId));
      setBelohnungErfolg(
        `${belohnungPunkte} Punkte an ${person?.name ?? "die Person"} vergeben (Gesamtpunkte: ${ergebnis.gesamtpunkte}).`
      );
      setBelohnungGrund("");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Belohnung konnte nicht vergeben werden.");
    } finally {
      setBelohnungLaeuft(false);
    }
  }

  async function speichern(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setGespeichert(false);
    try {
      const werte: Record<string, unknown> = {};
      for (const { schluessel } of REGEL_ZEILEN) {
        werte[`punkte_${schluessel}_punkte`] = regeln[schluessel].punkte;
        werte[`punkte_${schluessel}_tage`] = regeln[schluessel].tage;
        werte[`punkte_${schluessel}_modus`] = regeln[schluessel].modus;
      }
      await schreibeEinstellungen(werte);
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 4000);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht gespeichert werden.");
    }
  }

  if (!geladen && !fehler) return <Ladeanzeige />;

  return (
    <div>
      <h1>Punkte</h1>
      {fehler && <p className="fehlertext">{fehler}</p>}

      <div className="karte">
        <h2>Punkte als Belohnung vergeben</h2>
        <p style={{ color: "#666" }}>
          Zusätzlich zu den automatischen Regeln kannst du einer Person hier jederzeit Punkte als
          Belohnung gutschreiben, z. B. für besonderes Engagement.
        </p>
        {belohnungErfolg && <Banner art="erfolg">{belohnungErfolg}</Banner>}
        <form onSubmit={belohnungAbsenden} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label htmlFor="belohnung-person">Person</label>
            <select
              id="belohnung-person"
              value={belohnungPersonId}
              onChange={(e) => setBelohnungPersonId(e.target.value)}
              required
            >
              <option value="">– auswählen –</option>
              {personen.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="belohnung-punkte">Punkte</label>
            <input
              id="belohnung-punkte"
              type="number"
              min={0.1}
              step={0.1}
              value={belohnungPunkte}
              onChange={(e) => setBelohnungPunkte(Number(e.target.value))}
              style={{ width: 80 }}
              required
            />
          </div>
          <div>
            <label htmlFor="belohnung-tage">Gültig (Tage)</label>
            <input
              id="belohnung-tage"
              type="number"
              min={1}
              value={belohnungTage}
              onChange={(e) => setBelohnungTage(Number(e.target.value))}
              style={{ width: 80 }}
              required
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="belohnung-grund">Grund</label>
            <input
              id="belohnung-grund"
              value={belohnungGrund}
              onChange={(e) => setBelohnungGrund(e.target.value)}
              placeholder="z. B. Besonderer Einsatz bei der Übung"
              required
            />
          </div>
          <button type="submit" disabled={belohnungLaeuft}>
            {belohnungLaeuft ? "Wird vergeben …" : "Punkte vergeben"}
          </button>
        </form>
      </div>

      {!istAdmin && (
        <p style={{ color: "#666" }}>
          Die automatischen Punkte-Regeln (unten) kann nur ein Admin einsehen und ändern.
        </p>
      )}

      {istAdmin && (
      <>
      <p style={{ color: "#666" }}>
        Hier legst du fest, wie viele Punkte Personen für bestimmte Ereignisse automatisch erhalten,
        wie lange diese gültig sind, und ob sie bis zum Ende voll erhalten bleiben ("Halten bis Ende")
        oder linear bis auf 0 abgebaut werden ("Abziehend bis Ende").
      </p>
      {gespeichert && <Banner art="erfolg">Einstellungen erfolgreich gespeichert</Banner>}

      <form onSubmit={speichern}>
        <div className="karte">
          <table>
            <thead>
              <tr>
                <th>Ereignis</th>
                <th>Punkte</th>
                <th>Gültigkeit (Tage)</th>
                <th>Abbau-Modus</th>
              </tr>
            </thead>
            <tbody>
              {REGEL_ZEILEN.map(({ schluessel, titel, beschreibung, einheit }) => {
                const regel = regeln[schluessel];
                return (
                  <tr key={schluessel}>
                    <td>
                      <div>
                        <strong>{titel}</strong>
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "#666" }}>{beschreibung}</span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={regel.punkte}
                        onChange={(e) => regelAendern(schluessel, { ...regel, punkte: Number(e.target.value) })}
                        style={{ width: 70 }}
                      />
                      <div style={{ fontSize: "0.75rem", color: "#666" }}>{einheit}</div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={regel.tage}
                        onChange={(e) => regelAendern(schluessel, { ...regel, tage: Number(e.target.value) })}
                        style={{ width: 70 }}
                      />
                    </td>
                    <td>
                      <select
                        value={regel.modus}
                        onChange={(e) => regelAendern(schluessel, { ...regel, modus: e.target.value })}
                      >
                        <option value="halten">Halten bis Ende</option>
                        <option value="abziehend">Abziehend bis Ende</option>
                      </select>
                      {regel.modus === "abziehend" && regel.tage > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 4 }}>
                          ≈ {(regel.punkte / regel.tage).toFixed(2)} Punkte/Tag
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="submit">Speichern</button>
      </form>
      </>
      )}
    </div>
  );
}
