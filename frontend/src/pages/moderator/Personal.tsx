import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  holeAllePersonen,
  personAnlegen,
  personAktualisieren,
  personLoeschen,
  personBildHochladen,
  personBarcodeErzeugen,
  personBildReservierungAnlegen,
  holePersonTimeline,
  barcodeBildUrl,
  holeAlleGruppen,
  holeAlleFunktionenDienststunden,
} from "../../api/moderator";
import { holePersonBildReservierung } from "../../api/personBildReservierungen";
import { ApiError } from "../../api/client";
import type { FunktionDienststunden, Gruppe, Person, PersonEreignis } from "../../api/types";

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

function PersonenAvatar({ person, groesse = 48 }: { person: Person; groesse?: number }) {
  if (person.bild_url) {
    return (
      <img
        src={person.bild_url}
        alt={person.name}
        style={{ width: groesse, height: groesse, borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        width: groesse,
        height: groesse,
        borderRadius: "50%",
        background: "var(--farbe-primaer)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: groesse > 32 ? "1rem" : "0.8rem",
        flexShrink: 0,
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
  stammdaten_geaendert: "✏️",
  punkte_vergeben: "🎯",
  bild_geaendert: "🖼️",
};

export function Personal() {
  const [liste, setListe] = useState<Person[] | null>(null);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [funktionen, setFunktionen] = useState<FunktionDienststunden[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [suche, setSuche] = useState("");
  const [ausgewaehlteId, setAusgewaehlteId] = useState<number | null>(null);

  const [zeigeAnlegenModal, setZeigeAnlegenModal] = useState(false);
  const [neuerVorname, setNeuerVorname] = useState("");
  const [neuerZwischenname, setNeuerZwischenname] = useState("");
  const [neuerNachname, setNeuerNachname] = useState("");
  const [anlegenFehler, setAnlegenFehler] = useState<string | null>(null);
  const [neuePerson, setNeuePerson] = useState<Person | null>(null);
  const [bildQr, setBildQr] = useState<{ token: string; bildUrl: string; ablaufAm: string } | null>(null);
  const [bildHochgeladen, setBildHochgeladen] = useState(false);

  const [timeline, setTimeline] = useState<PersonEreignis[] | null>(null);
  const [barcode, setBarcode] = useState<{ token: string; ablaufAm: string | null } | null>(null);

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

  async function timelineLaden(personId: number) {
    try {
      setTimeline(await holePersonTimeline(personId));
    } catch {
      setTimeline([]);
    }
  }

  function auswaehlen(personId: number) {
    setAusgewaehlteId(personId);
    setBarcode(null);
    timelineLaden(personId);
  }

  function anlegenModalOeffnen() {
    setNeuerVorname("");
    setNeuerZwischenname("");
    setNeuerNachname("");
    setAnlegenFehler(null);
    setNeuePerson(null);
    setBildQr(null);
    setBildHochgeladen(false);
    setZeigeAnlegenModal(true);
  }

  function anlegenModalSchliessen() {
    setZeigeAnlegenModal(false);
    if (neuePerson) auswaehlen(neuePerson.id);
  }

  async function anlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerVorname.trim() || !neuerNachname.trim()) return;
    setAnlegenFehler(null);
    try {
      const person = await personAnlegen({
        vorname: neuerVorname.trim(),
        zwischenname: neuerZwischenname.trim() || null,
        nachname: neuerNachname.trim(),
      });
      await laden();
      setNeuePerson(person);

      const { token, ablauf_am } = await personBildReservierungAnlegen(person.id);
      const url = `${window.location.origin}/person-bild/${token}`;
      const bildUrl = await QRCode.toDataURL(url, { width: 240, margin: 1 });
      setBildQr({ token, bildUrl, ablaufAm: ablauf_am });
    } catch (err) {
      setAnlegenFehler(err instanceof ApiError ? String(err.detail) : "Person konnte nicht angelegt werden.");
    }
  }

  // Solange das QR-Foto-Popup offen ist, prüfen ob das Foto bereits vom
  // Handy aus hochgeladen wurde.
  useEffect(() => {
    if (!bildQr || bildHochgeladen) return;
    const intervall = setInterval(async () => {
      try {
        const info = await holePersonBildReservierung(bildQr.token);
        if (info.bereits_eingeloest) {
          setBildHochgeladen(true);
          await laden();
        }
      } catch {
        // Best effort – wird beim nächsten Intervall erneut versucht.
      }
    }, 1500);
    return () => clearInterval(intervall);
  }, [bildQr, bildHochgeladen]);

  async function feldAendern(p: Person, feld: "vorname" | "zwischenname" | "nachname", wert: string) {
    await personAktualisieren(p.id, { [feld]: wert || null });
    await laden();
    await timelineLaden(p.id);
  }

  async function gruppeFeldAendern(p: Person, gruppeId: number | null) {
    await personAktualisieren(p.id, { gruppe_id: gruppeId });
    await laden();
    await timelineLaden(p.id);
  }

  async function funktionFeldAendern(p: Person, funktionId: number | null) {
    await personAktualisieren(p.id, { funktion_id: funktionId });
    await laden();
    await timelineLaden(p.id);
  }

  async function bildHochladen(p: Person, datei: File) {
    await personBildHochladen(p.id, datei);
    await laden();
    await timelineLaden(p.id);
  }

  async function barcodeErzeugen(p: Person) {
    const { token, ablauf_am } = await personBarcodeErzeugen(p.id);
    setBarcode({ token, ablaufAm: ablauf_am });
  }

  async function loeschen(id: number) {
    await personLoeschen(id);
    if (ausgewaehlteId === id) {
      setAusgewaehlteId(null);
      setTimeline(null);
    }
    await laden();
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!liste) return <p>Lädt …</p>;

  const gefiltert = !suche.trim()
    ? liste
    : liste.filter((p) => p.name.toLowerCase().includes(suche.trim().toLowerCase()));
  const ausgewaehltePerson = liste.find((p) => p.id === ausgewaehlteId) ?? null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Personal</h1>
        <button type="button" onClick={anlegenModalOeffnen}>
          + Person hinzufügen
        </button>
      </div>

      {zeigeAnlegenModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={anlegenModalSchliessen}
        >
          <div
            className="karte"
            style={{ width: 360, maxWidth: "90vw", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            {!neuePerson ? (
              <>
                <h2>Person hinzufügen</h2>
                <form onSubmit={anlegen} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    placeholder="Vorname"
                    value={neuerVorname}
                    onChange={(e) => setNeuerVorname(e.target.value)}
                    autoFocus
                  />
                  <input
                    placeholder="Zwischenname (optional)"
                    value={neuerZwischenname}
                    onChange={(e) => setNeuerZwischenname(e.target.value)}
                  />
                  <input
                    placeholder="Nachname"
                    value={neuerNachname}
                    onChange={(e) => setNeuerNachname(e.target.value)}
                  />
                  {anlegenFehler && <p className="fehlertext">{anlegenFehler}</p>}
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button type="button" className="sekundaer" onClick={anlegenModalSchliessen}>
                      Abbrechen
                    </button>
                    <button type="submit">Anlegen</button>
                  </div>
                </form>
              </>
            ) : !bildQr ? (
              <p>Lege Person an …</p>
            ) : bildHochgeladen ? (
              <>
                <h2>Foto gespeichert!</h2>
                <PersonenAvatar person={liste.find((p) => p.id === neuePerson.id) ?? neuePerson} groesse={120} />
                <p style={{ marginTop: 12 }}>{neuePerson.name} wurde angelegt.</p>
                <button type="button" onClick={anlegenModalSchliessen}>
                  Fertig
                </button>
              </>
            ) : (
              <>
                <h2>{neuePerson.name} angelegt</h2>
                <p style={{ color: "#666" }}>
                  Mit dem Handy scannen, um direkt ein Profilfoto aufzunehmen oder hochzuladen.
                </p>
                <img src={bildQr.bildUrl} alt="QR-Code für Foto-Upload" style={{ width: 220, height: 220 }} />
                <p style={{ fontSize: "0.8rem", color: "#999" }}>
                  Gültig bis {new Date(bildQr.ablaufAm).toLocaleTimeString("de-DE")}
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button type="button" className="sekundaer" onClick={anlegenModalSchliessen}>
                    Überspringen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ width: 300, flexShrink: 0 }}>
          <input
            placeholder="Suche…"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            style={{ width: "100%", marginBottom: 12 }}
          />

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0" }}>
            {gefiltert.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => auswaehlen(p.id)}
                  className={p.id === ausgewaehlteId ? "" : "sekundaer"}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                    textAlign: "left",
                  }}
                >
                  <PersonenAvatar person={p} groesse={32} />
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{p.gesamtpunkte} Pkt.</span>
                </button>
              </li>
            ))}
            {gefiltert.length === 0 && <p style={{ color: "#666" }}>Keine Personen gefunden.</p>}
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          {!ausgewaehltePerson ? (
            <p style={{ color: "#666" }}>Bitte links eine Person auswählen.</p>
          ) : (
            <div className="karte" key={ausgewaehltePerson.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                <PersonenAvatar person={ausgewaehltePerson} groesse={64} />
                <div>
                  <h2 style={{ margin: 0 }}>{ausgewaehltePerson.name}</h2>
                  <strong>{ausgewaehltePerson.gesamtpunkte} Punkte</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <input
                  defaultValue={ausgewaehltePerson.vorname ?? ""}
                  placeholder="Vorname"
                  onBlur={(e) => feldAendern(ausgewaehltePerson, "vorname", e.target.value)}
                  style={{ width: 160 }}
                />
                <input
                  defaultValue={ausgewaehltePerson.zwischenname ?? ""}
                  placeholder="Zwischenname"
                  onBlur={(e) => feldAendern(ausgewaehltePerson, "zwischenname", e.target.value)}
                  style={{ width: 160 }}
                />
                <input
                  defaultValue={ausgewaehltePerson.nachname ?? ""}
                  placeholder="Nachname"
                  onBlur={(e) => feldAendern(ausgewaehltePerson, "nachname", e.target.value)}
                  style={{ width: 160 }}
                />
                <select
                  value={ausgewaehltePerson.gruppe_id ?? ""}
                  onChange={(e) =>
                    gruppeFeldAendern(ausgewaehltePerson, e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">– keine Gruppe –</option>
                  {gruppen.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <select
                  value={ausgewaehltePerson.funktion_id ?? ""}
                  onChange={(e) =>
                    funktionFeldAendern(ausgewaehltePerson, e.target.value ? Number(e.target.value) : null)
                  }
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

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
                <label className="sekundaer" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  Bild hochladen
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const datei = e.target.files?.[0];
                      if (datei) bildHochladen(ausgewaehltePerson, datei);
                    }}
                  />
                </label>

                <button className="sekundaer" onClick={() => barcodeErzeugen(ausgewaehltePerson)}>
                  Barcode erzeugen
                </button>

                <button className="sekundaer" onClick={() => loeschen(ausgewaehltePerson.id)}>
                  Löschen
                </button>
              </div>

              {barcode && (
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 }}>
                    {ausgewaehltePerson.name}
                  </div>
                  <img src={barcodeBildUrl(barcode.token)} alt="Barcode" style={{ height: 50 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, justifyContent: "center" }}>
                    <input
                      readOnly
                      value={barcode.token}
                      onFocus={(e) => e.target.select()}
                      style={{ width: 140, fontSize: "0.75rem", fontFamily: "monospace" }}
                    />
                    <button
                      type="button"
                      className="sekundaer"
                      style={{ padding: "0.2rem 0.5rem" }}
                      onClick={(e) => tokenKopieren(barcode.token, e.currentTarget)}
                    >
                      Kopieren
                    </button>
                  </div>
                  {barcode.ablaufAm && (
                    <div style={{ fontSize: "0.7rem", color: "#666" }}>
                      Gültig bis {new Date(barcode.ablaufAm).toLocaleDateString("de-DE")}
                    </div>
                  )}
                </div>
              )}

              <h3>Timeline</h3>
              {!timeline ? (
                <p>Lädt …</p>
              ) : timeline.length === 0 ? (
                <p style={{ color: "#666" }}>Noch keine Ereignisse.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {timeline
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
      </div>
    </div>
  );
}
