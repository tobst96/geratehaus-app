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
  holeAlleEinsatzFelder,
  einsatzFeldAnlegen,
  einsatzFeldAktualisieren,
  einsatzFeldLoeschen,
  holeAlleGruppen,
  gruppeAnlegen,
  gruppeAktualisieren,
  gruppeLoeschen,
} from "../../api/moderator";
import { ApiError } from "../../api/client";
import type {
  EinsatzFeldDefinition,
  Fahrzeug,
  FunktionDienststunden,
  FunktionEinsatz,
  Gruppe,
} from "../../api/types";
import { SitzplatzEditor } from "./SitzplatzEditor";

const TABS = [
  "Gruppen",
  "Fahrzeuge",
  "Einsatz-Funktionen",
  "Dienststunden-Funktionen",
  "Einsatz-Felder",
] as const;
type Tab = (typeof TABS)[number];

export function Stammdaten() {
  const [tab, setTab] = useState<Tab>("Gruppen");

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
      {tab === "Einsatz-Felder" && <EinsatzFelderTab />}
      {tab === "Gruppen" && <GruppenTab />}
    </div>
  );
}

function FahrzeugeTab() {
  const [liste, setListe] = useState<Fahrzeug[] | null>(null);
  const [funktionen, setFunktionen] = useState<FunktionEinsatz[]>([]);
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
    holeAlleFunktionenEinsatz().then(setFunktionen).catch(() => setFunktionen([]));
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
      <div className="tabelle-scroll">
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
      </div>

      {editorFahrzeug && (
        <SitzplatzEditor
          fahrzeug={editorFahrzeug}
          funktionen={funktionen}
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
      <div className="tabelle-scroll">
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
    </div>
  );
}

function GruppenTab() {
  const [liste, setListe] = useState<Gruppe[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerName, setNeuerName] = useState("");

  async function laden() {
    try {
      setListe(await holeAlleGruppen());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Gruppen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerName.trim()) return;
    await gruppeAnlegen({ name: neuerName.trim(), aktiv: true });
    setNeuerName("");
    await laden();
  }

  async function aktivAendern(g: Gruppe, wert: boolean) {
    await gruppeAktualisieren(g.id, { aktiv: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await gruppeLoeschen(id);
    await laden();
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!liste) return <p>Lädt …</p>;

  return (
    <div>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Neue Gruppe, z. B. 1. Gruppe"
          value={neuerName}
          onChange={(e) => setNeuerName(e.target.value)}
        />
        <button type="submit">Anlegen</button>
      </form>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Aktiv</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((g) => (
            <tr key={g.id}>
              <td>{g.name}</td>
              <td>
                <input type="checkbox" checked={g.aktiv} onChange={(e) => aktivAendern(g, e.target.checked)} />
              </td>
              <td>
                <button className="sekundaer" onClick={() => loeschen(g.id)}>
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

const TYP_LABEL: Record<EinsatzFeldDefinition["typ"], string> = {
  text: "Text (eine Zeile)",
  mehrzeilig: "Mehrzeilig",
  checkbox: "Checkbox",
};

function EinsatzFelderTab() {
  const [liste, setListe] = useState<EinsatzFeldDefinition[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuesLabel, setNeuesLabel] = useState("");
  const [neuerTyp, setNeuerTyp] = useState<EinsatzFeldDefinition["typ"]>("text");

  async function laden() {
    try {
      setListe(await holeAlleEinsatzFelder());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Felder konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuesLabel.trim()) return;
    const reihenfolge = liste ? liste.length : 0;
    await einsatzFeldAnlegen({ label: neuesLabel.trim(), typ: neuerTyp, reihenfolge, aktiv: true });
    setNeuesLabel("");
    setNeuerTyp("text");
    await laden();
  }

  async function aktivAendern(f: EinsatzFeldDefinition, wert: boolean) {
    await einsatzFeldAktualisieren(f.id, { aktiv: wert });
    await laden();
  }

  async function reihenfolgeAendern(f: EinsatzFeldDefinition, wert: number) {
    await einsatzFeldAktualisieren(f.id, { reihenfolge: wert });
    await laden();
  }

  async function loeschen(id: number) {
    await einsatzFeldLoeschen(id);
    await laden();
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!liste) return <p>Lädt …</p>;

  return (
    <div>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Frei konfigurierbare Zusatzfelder für den Einsatzbericht (z. B. Einsatzleiter, Erste Lage,
        Tätigkeit). Werden im Einsatztagebuch unterhalb der Garage angezeigt und im PDF-Export
        ausgegeben.
      </p>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Neues Feld, z. B. Geschädigter"
          value={neuesLabel}
          onChange={(e) => setNeuesLabel(e.target.value)}
        />
        <select value={neuerTyp} onChange={(e) => setNeuerTyp(e.target.value as EinsatzFeldDefinition["typ"])}>
          {Object.entries(TYP_LABEL).map(([wert, label]) => (
            <option key={wert} value={wert}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit">Anlegen</button>
      </form>
      <div className="tabelle-scroll">
      <table>
        <thead>
          <tr>
            <th>Bezeichnung</th>
            <th>Typ</th>
            <th>Reihenfolge</th>
            <th>Aktiv</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((f) => (
            <tr key={f.id}>
              <td>{f.label}</td>
              <td>{TYP_LABEL[f.typ]}</td>
              <td>
                <input
                  type="number"
                  defaultValue={f.reihenfolge}
                  onBlur={(e) => reihenfolgeAendern(f, Number(e.target.value))}
                  style={{ width: 80 }}
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
      <div className="tabelle-scroll">
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
    </div>
  );
}

