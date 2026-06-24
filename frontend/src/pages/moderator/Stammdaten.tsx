import { useEffect, useState, type FormEvent } from "react";
import {
  holeAlleFahrzeuge,
  fahrzeugAnlegen,
  fahrzeugAktualisieren,
  fahrzeugLoeschen,
  holeAlleFunktionenEinsatz,
  funktionEinsatzAnlegen,
  funktionEinsatzAktualisieren,
  funktionEinsatzLoeschen,
  holeAlleFunktionenDienststunden,
  funktionDienststundenAnlegen,
  funktionDienststundenAktualisieren,
  funktionDienststundenLoeschen,
} from "../../api/moderator";
import { ApiError } from "../../api/client";
import type { Fahrzeug, FunktionDienststunden, FunktionEinsatz } from "../../api/types";
import { SitzplatzEditor } from "./SitzplatzEditor";

const TABS = ["Fahrzeuge", "Einsatz-Funktionen", "Dienststunden-Funktionen"] as const;
type Tab = (typeof TABS)[number];

export function Stammdaten() {
  const [tab, setTab] = useState<Tab>("Fahrzeuge");

  return (
    <div>
      <h1>Stammdaten</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "" : "sekundaer"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Fahrzeuge" && <FahrzeugeTab />}
      {tab === "Einsatz-Funktionen" && <FunktionenEinsatzTab />}
      {tab === "Dienststunden-Funktionen" && <FunktionenDienststundenTab />}
    </div>
  );
}

function FahrzeugeTab() {
  const [liste, setListe] = useState<Fahrzeug[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerName, setNeuerName] = useState("");
  const [editorFahrzeug, setEditorFahrzeug] = useState<Fahrzeug | null>(null);

  async function laden() {
    try {
      setListe(await holeAlleFahrzeuge());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Fahrzeuge konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerName.trim()) return;
    await fahrzeugAnlegen({ name: neuerName.trim(), aktiv: true, buchbar: true });
    setNeuerName("");
    await laden();
  }

  async function feldAendern(f: Fahrzeug, feld: "aktiv" | "buchbar", wert: boolean) {
    await fahrzeugAktualisieren(f.id, { [feld]: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await fahrzeugLoeschen(id);
    await laden();
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!liste) return <p>Lädt …</p>;

  return (
    <div>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Neues Fahrzeug, z. B. HLF 20"
          value={neuerName}
          onChange={(e) => setNeuerName(e.target.value)}
        />
        <button type="submit">Anlegen</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Aktiv</th>
            <th>Buchbar</th>
            <th>Sitzplätze</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((f) => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td>
                <input type="checkbox" checked={f.aktiv} onChange={(e) => feldAendern(f, "aktiv", e.target.checked)} />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={f.buchbar}
                  onChange={(e) => feldAendern(f, "buchbar", e.target.checked)}
                />
              </td>
              <td>{f.sitzplaetze.length}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <button className="sekundaer" onClick={() => setEditorFahrzeug(f)}>
                  Sitzplätze bearbeiten
                </button>
                <button className="sekundaer" onClick={() => loeschen(f.id)}>
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editorFahrzeug && (
        <SitzplatzEditor
          fahrzeug={editorFahrzeug}
          onClose={() => setEditorFahrzeug(null)}
          onGespeichert={async () => {
            setEditorFahrzeug(null);
            await laden();
          }}
        />
      )}
    </div>
  );
}

function FunktionenEinsatzTab() {
  const [liste, setListe] = useState<FunktionEinsatz[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerName, setNeuerName] = useState("");

  async function laden() {
    try {
      setListe(await holeAlleFunktionenEinsatz());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Funktionen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerName.trim()) return;
    await funktionEinsatzAnlegen({ name: neuerName.trim(), aktiv: true });
    setNeuerName("");
    await laden();
  }

  async function aktivAendern(f: FunktionEinsatz, wert: boolean) {
    await funktionEinsatzAktualisieren(f.id, { aktiv: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await funktionEinsatzLoeschen(id);
    await laden();
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!liste) return <p>Lädt …</p>;

  return (
    <div>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Neue Funktion, z. B. Gruppenführer"
          value={neuerName}
          onChange={(e) => setNeuerName(e.target.value)}
        />
        <button type="submit">Anlegen</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Aktiv</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((f) => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td>
                <input type="checkbox" checked={f.aktiv} onChange={(e) => aktivAendern(f, e.target.checked)} />
              </td>
              <td>
                <button className="sekundaer" onClick={() => loeschen(f.id)}>
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FunktionenDienststundenTab() {
  const [liste, setListe] = useState<FunktionDienststunden[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerName, setNeuerName] = useState("");
  const [neuerSchwellenwert, setNeuerSchwellenwert] = useState(0);

  async function laden() {
    try {
      setListe(await holeAlleFunktionenDienststunden());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Funktionen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerName.trim()) return;
    await funktionDienststundenAnlegen({
      name: neuerName.trim(),
      schwellenwert_stunden: neuerSchwellenwert,
      aktiv: true,
    });
    setNeuerName("");
    setNeuerSchwellenwert(0);
    await laden();
  }

  async function aktivAendern(f: FunktionDienststunden, wert: boolean) {
    await funktionDienststundenAktualisieren(f.id, { aktiv: wert });
    await laden();
  }

  async function schwellenwertAendern(f: FunktionDienststunden, wert: number) {
    await funktionDienststundenAktualisieren(f.id, { schwellenwert_stunden: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await funktionDienststundenLoeschen(id);
    await laden();
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!liste) return <p>Lädt …</p>;

  return (
    <div>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Neue Funktion, z. B. Maschinist"
          value={neuerName}
          onChange={(e) => setNeuerName(e.target.value)}
        />
        <input
          type="number"
          min={0}
          placeholder="Schwellenwert (h)"
          value={neuerSchwellenwert}
          onChange={(e) => setNeuerSchwellenwert(Number(e.target.value))}
          style={{ width: 150 }}
        />
        <button type="submit">Anlegen</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Schwellenwert (h)</th>
            <th>Aktiv</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((f) => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  defaultValue={f.schwellenwert_stunden}
                  onBlur={(e) => schwellenwertAendern(f, Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </td>
              <td>
                <input type="checkbox" checked={f.aktiv} onChange={(e) => aktivAendern(f, e.target.checked)} />
              </td>
              <td>
                <button className="sekundaer" onClick={() => loeschen(f.id)}>
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
