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
  holeAllePersonen,
  personAnlegen,
  personAktualisieren,
  personLoeschen,
  personBildHochladen,
  personBarcodeErzeugen,
  holePersonTimeline,
  barcodeBildUrl,
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
  Person,
  PersonEreignis,
} from "../../api/types";
import { SitzplatzEditor } from "./SitzplatzEditor";

const TABS = [
  "Personen",
  "Gruppen",
  "Fahrzeuge",
  "Einsatz-Funktionen",
  "Dienststunden-Funktionen",
  "Einsatz-Felder",
] as const;
type Tab = (typeof TABS)[number];

export function Stammdaten() {
  const [tab, setTab] = useState<Tab>("Personen");

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
      {tab === "Personen" && <PersonenTab />}
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

function Initialen(vorname: string | null, nachname: string | null, name: string): string {
  if (vorname || nachname) {
    return `${(vorname ?? "").charAt(0)}${(nachname ?? "").charAt(0)}`.toUpperCase();
  }
  const teile = name.trim().split(/\s+/);
  return teile
    .slice(0, 2)
    .map((t) => t.charAt(0))
    .join("")
    .toUpperCase();
}

function PersonenAvatar({ person }: { person: Person }) {
  if (person.bild_url) {
    return (
      <img
        src={person.bild_url}
        alt={person.name}
        style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "var(--farbe-primaer)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "1rem",
      }}
    >
      {Initialen(person.vorname, person.nachname, person.name)}
    </div>
  );
}

async function tokenKopieren(token: string, knopf: HTMLButtonElement) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(token);
    } else {
      // navigator.clipboard ist nur in sicheren Kontexten (HTTPS) verfügbar –
      // im LAN über HTTP läuft die App ohne TLS, daher dieser Fallback.
      const textarea = document.createElement("textarea");
      textarea.value = token;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    const beschriftung = knopf.textContent;
    knopf.textContent = "Kopiert!";
    setTimeout(() => {
      knopf.textContent = beschriftung;
    }, 1500);
  } catch {
    window.prompt("Kopieren fehlgeschlagen – Text manuell kopieren:", token);
  }
}

const PERSON_EREIGNIS_ICON: Record<string, string> = {
  funktion_geaendert: "🔄",
};

function PersonenTab() {
  const [liste, setListe] = useState<Person[] | null>(null);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [funktionen, setFunktionen] = useState<FunktionDienststunden[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuerVorname, setNeuerVorname] = useState("");
  const [neuerZwischenname, setNeuerZwischenname] = useState("");
  const [neuerNachname, setNeuerNachname] = useState("");
  const [barcodes, setBarcodes] = useState<Map<number, { token: string; ablaufAm: string | null }>>(
    new Map()
  );
  const [offeneTimeline, setOffeneTimeline] = useState<number | null>(null);
  const [timelines, setTimelines] = useState<Map<number, PersonEreignis[]>>(new Map());

  async function laden() {
    try {
      setListe(await holeAllePersonen());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Personen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
    holeAlleGruppen().then(setGruppen).catch(() => setGruppen([]));
    holeAlleFunktionenDienststunden().then(setFunktionen).catch(() => setFunktionen([]));
  }, []);

  async function gruppeFeldAendern(p: Person, gruppeId: number | null) {
    await personAktualisieren(p.id, { gruppe_id: gruppeId });
    await laden();
  }

  async function funktionFeldAendern(p: Person, funktionId: number | null) {
    await personAktualisieren(p.id, { funktion_id: funktionId });
    await laden();
    if (offeneTimeline === p.id) await timelineLaden(p.id);
  }

  async function timelineLaden(personId: number) {
    try {
      const ereignisse = await holePersonTimeline(personId);
      setTimelines((vorher) => new Map(vorher).set(personId, ereignisse));
    } catch {
      setTimelines((vorher) => new Map(vorher).set(personId, []));
    }
  }

  async function timelineUmschalten(personId: number) {
    if (offeneTimeline === personId) {
      setOffeneTimeline(null);
      return;
    }
    setOffeneTimeline(personId);
    await timelineLaden(personId);
  }

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerVorname.trim() || !neuerNachname.trim()) return;
    await personAnlegen({
      vorname: neuerVorname.trim(),
      zwischenname: neuerZwischenname.trim() || null,
      nachname: neuerNachname.trim(),
    });
    setNeuerVorname("");
    setNeuerZwischenname("");
    setNeuerNachname("");
    await laden();
  }

  async function feldAendern(p: Person, feld: "vorname" | "zwischenname" | "nachname", wert: string) {
    await personAktualisieren(p.id, { [feld]: wert || null });
    await laden();
  }

  async function loeschen(id: number) {
    await personLoeschen(id);
    await laden();
  }

  async function bildHochladen(p: Person, datei: File) {
    await personBildHochladen(p.id, datei);
    await laden();
  }

  async function barcodeErzeugen(p: Person) {
    const { token, ablauf_am } = await personBarcodeErzeugen(p.id);
    setBarcodes((vorher) => new Map(vorher).set(p.id, { token, ablaufAm: ablauf_am }));
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!liste) return <p>Lädt …</p>;

  return (
    <div>
      <form onSubmit={anlegen} style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Vorname"
          value={neuerVorname}
          onChange={(e) => setNeuerVorname(e.target.value)}
          style={{ width: 150 }}
        />
        <input
          placeholder="Zwischenname (optional)"
          value={neuerZwischenname}
          onChange={(e) => setNeuerZwischenname(e.target.value)}
          style={{ width: 150 }}
        />
        <input
          placeholder="Nachname"
          value={neuerNachname}
          onChange={(e) => setNeuerNachname(e.target.value)}
          style={{ width: 150 }}
        />
        <button type="submit">Anlegen</button>
      </form>

      {liste.length === 0 && <p>Noch keine Personen angelegt.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {liste.map((p) => (
          <div key={p.id} className="karte" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <PersonenAvatar person={p} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
              <input
                defaultValue={p.vorname ?? ""}
                placeholder="Vorname"
                onBlur={(e) => feldAendern(p, "vorname", e.target.value)}
                style={{ width: 140 }}
              />
              <input
                defaultValue={p.zwischenname ?? ""}
                placeholder="Zwischenname"
                onBlur={(e) => feldAendern(p, "zwischenname", e.target.value)}
                style={{ width: 140 }}
              />
              <input
                defaultValue={p.nachname ?? ""}
                placeholder="Nachname"
                onBlur={(e) => feldAendern(p, "nachname", e.target.value)}
                style={{ width: 140 }}
              />
              <select
                value={p.gruppe_id ?? ""}
                onChange={(e) => gruppeFeldAendern(p, e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">– keine Gruppe –</option>
                {gruppen.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                value={p.funktion_id ?? ""}
                onChange={(e) => funktionFeldAendern(p, e.target.value ? Number(e.target.value) : null)}
                title="Default-Funktion für Dienststunden"
              >
                <option value="">– keine Funktion –</option>
                {funktionen.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="sekundaer" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
              Bild hochladen
              <input
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: "none" }}
                onChange={(e) => {
                  const datei = e.target.files?.[0];
                  if (datei) bildHochladen(p, datei);
                }}
              />
            </label>

            <button className="sekundaer" onClick={() => barcodeErzeugen(p)}>
              Barcode erzeugen
            </button>
            {barcodes.get(p.id) && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                <img src={barcodeBildUrl(barcodes.get(p.id)!.token)} alt="Barcode" style={{ height: 50 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <input
                    readOnly
                    value={barcodes.get(p.id)!.token}
                    onFocus={(e) => e.target.select()}
                    style={{ width: 140, fontSize: "0.75rem", fontFamily: "monospace" }}
                  />
                  <button
                    type="button"
                    className="sekundaer"
                    style={{ padding: "0.2rem 0.5rem" }}
                    onClick={(e) => tokenKopieren(barcodes.get(p.id)!.token, e.currentTarget)}
                  >
                    Kopieren
                  </button>
                </div>
                {barcodes.get(p.id)!.ablaufAm && (
                  <div style={{ fontSize: "0.7rem", color: "#666" }}>
                    Gültig bis {new Date(barcodes.get(p.id)!.ablaufAm!).toLocaleDateString("de-DE")}
                  </div>
                )}
              </div>
            )}

            <button className="sekundaer" onClick={() => timelineUmschalten(p.id)}>
              Timeline {offeneTimeline === p.id ? "▲" : "▼"}
            </button>

            <button className="sekundaer" onClick={() => loeschen(p.id)}>
              Löschen
            </button>

            {offeneTimeline === p.id && (
              <div style={{ width: "100%", marginTop: 8 }}>
                {!timelines.get(p.id) ? (
                  <p>Lädt …</p>
                ) : timelines.get(p.id)!.length === 0 ? (
                  <p style={{ color: "#666" }}>Noch keine Ereignisse.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {timelines
                      .get(p.id)!
                      .slice()
                      .reverse()
                      .map((ereignis) => (
                        <li
                          key={ereignis.id}
                          style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "4px 0" }}
                        >
                          <span>{PERSON_EREIGNIS_ICON[ereignis.typ] ?? "•"}</span>
                          <span style={{ fontSize: "0.8rem", color: "#666", minWidth: 130 }}>
                            {new Date(ereignis.zeitpunkt).toLocaleString("de-DE")}
                          </span>
                          <span>{ereignis.beschreibung}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
