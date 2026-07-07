import { useEffect, useState } from "react";
import { formatiereDatumZeit } from "../../../utils/datum";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import { ApiError } from "../../../api/client";
import { useConfig } from "../../../context/ConfigContext";
import { Ladeanzeige } from "../../../components/Ladeanzeige";
import { FormularZusammenfassung } from "../FormularZusammenfassung";
import {
  feldAktualisieren,
  feldAnlegen,
  feldLoeschen,
  formularAktualisieren,
  formularAnlegen,
  formularDuplizieren,
  formularCsvHerunterladen,
  formularLoeschen,
  holeEinreichungen,
  holeFormulare,
  holeZusammenfassung,
  type Einreichung,
  type Formular,
  type FormularFeld,
  type FormularFeldTyp,
  type Zusammenfassung,
} from "../../../api/formular";

// ISO (UTC) <-> Wert für <input type="datetime-local"> (lokale Zeit des Browsers).
function zuLokalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const lokal = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return lokal.toISOString().slice(0, 16);
}
function vonLokalInput(wert: string): string | null {
  return wert ? new Date(wert).toISOString() : null;
}

async function linkKopieren(text: string, knopf: HTMLButtonElement) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    const alt = knopf.textContent;
    knopf.textContent = "Kopiert!";
    setTimeout(() => (knopf.textContent = alt), 1500);
  } catch {
    window.prompt("Link manuell kopieren:", text);
  }
}

const FELDTYP_LABEL: Record<FormularFeldTyp, string> = {
  text: "Textfeld (einzeilig)",
  mehrzeilig: "Textfeld (mehrzeilig)",
  checkbox: "Checkbox",
  sterne: "Sternebewertung",
  skala: "Skala (1–N)",
  dropdown: "Dropdown",
  dropdown_mehrfach: "Dropdown (Mehrfachauswahl)",
  datum: "Datum",
  zahl: "Zahl",
  email: "E-Mail",
  telefon: "Telefon",
  ja_nein: "Ja/Nein",
  datei: "Datei-Upload",
};

function wertText(a: Einreichung["antworten"][number]): string {
  if (a.typ === "checkbox") return a.wert ? "Ja" : "Nein";
  if (Array.isArray(a.wert)) return a.wert.join(", ");
  if (a.wert === null || a.wert === "") return "–";
  return String(a.wert);
}

export function FormularModul() {
  const { config } = useConfig();
  const [formulare, setFormulare] = useState<Formular[] | null>(null);
  const [ausgewaehltId, setAusgewaehltId] = useState<number | null>(null);
  const [neuerName, setNeuerName] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [neuesFeldLabel, setNeuesFeldLabel] = useState("");
  const [neuesFeldTyp, setNeuesFeldTyp] = useState<FormularFeldTyp>("text");
  const [einreichungen, setEinreichungen] = useState<Einreichung[] | null>(null);
  const [zusammenfassung, setZusammenfassung] = useState<Zusammenfassung | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const basisUrl = (config?.oeffentliche_basis_url || window.location.origin).replace(/\/$/, "");

  async function laden() {
    try {
      setFormulare(await holeFormulare());
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Formulare konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  useEffect(() => {
    if (ausgewaehltId === null) {
      setQrUrl(null);
      return;
    }
    QRCode.toDataURL(`${basisUrl}/formular/${ausgewaehltId}`, { width: 160, margin: 1 })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [ausgewaehltId, basisUrl]);

  const ausgewaehlt = formulare?.find((f) => f.id === ausgewaehltId) ?? null;

  async function anlegen() {
    if (!neuerName.trim()) return;
    try {
      const neu = await formularAnlegen({ name: neuerName.trim() });
      setNeuerName("");
      await laden();
      setAusgewaehltId(neu.id);
      setEinreichungen(null);
      setZusammenfassung(null);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Anlegen fehlgeschlagen.");
    }
  }

  async function formularFeldAendern(f: Formular, feld: Partial<Formular>) {
    await formularAktualisieren(f.id, feld);
    await laden();
  }

  async function loeschen(f: Formular) {
    if (!confirm(`Formular „${f.name}" inkl. aller Einreichungen löschen?`)) return;
    await formularLoeschen(f.id);
    setAusgewaehltId(null);
    await laden();
  }

  async function duplizieren(f: Formular) {
    const kopie = await formularDuplizieren(f.id);
    await laden();
    setAusgewaehltId(kopie.id);
  }

  async function feldHinzufuegen() {
    if (!ausgewaehlt || !neuesFeldLabel.trim()) return;
    await feldAnlegen(ausgewaehlt.id, {
      label: neuesFeldLabel.trim(),
      typ: neuesFeldTyp,
      reihenfolge: ausgewaehlt.felder.length,
    });
    setNeuesFeldLabel("");
    setNeuesFeldTyp("text");
    await laden();
  }

  async function feldAendern(feld: FormularFeld, aenderung: Partial<FormularFeld>) {
    await feldAktualisieren(feld.id, { label: feld.label, typ: feld.typ, ...aenderung });
    await laden();
  }

  async function feldEntfernen(feld: FormularFeld) {
    if (!confirm(`Feld „${feld.label}" löschen?`)) return;
    await feldLoeschen(feld.id);
    await laden();
  }

  async function feldVerschieben(feld: FormularFeld, richtung: -1 | 1) {
    if (!ausgewaehlt) return;
    const sortiert = [...ausgewaehlt.felder].sort((a, b) => a.reihenfolge - b.reihenfolge);
    const i = sortiert.findIndex((f) => f.id === feld.id);
    const j = i + richtung;
    if (j < 0 || j >= sortiert.length) return;
    const a = sortiert[i];
    const b = sortiert[j];
    await feldAktualisieren(a.id, { label: a.label, typ: a.typ, reihenfolge: b.reihenfolge });
    await feldAktualisieren(b.id, { label: b.label, typ: b.typ, reihenfolge: a.reihenfolge });
    await laden();
  }

  async function einreichungenLaden() {
    if (!ausgewaehlt) return;
    setEinreichungen(null);
    setZusammenfassung(null);
    setEinreichungen(await holeEinreichungen(ausgewaehlt.id));
  }

  if (fehler && !formulare) return <p className="fehlertext">{fehler}</p>;
  if (!formulare) return <Ladeanzeige />;

  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>
      <h1>Formulare</h1>
      {fehler && <p className="fehlertext">{fehler}</p>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Name des neuen Formulars"
          value={neuerName}
          onChange={(e) => setNeuerName(e.target.value)}
          style={{ flex: "1 1 240px" }}
        />
        <button onClick={anlegen}>+ Formular anlegen</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {formulare.map((f) => (
          <button
            key={f.id}
            className={f.id === ausgewaehltId ? "" : "sekundaer"}
            onClick={() => {
              setAusgewaehltId(f.id);
              setEinreichungen(null);
      setZusammenfassung(null);
            }}
          >
            {f.name}
            {!f.aktiv && " (inaktiv)"}
          </button>
        ))}
        {formulare.length === 0 && (
          <p style={{ color: "var(--farbe-text-mute)" }}>Noch keine Formulare angelegt.</p>
        )}
      </div>

      {ausgewaehlt && (
        <div className="karte">
          <h2 style={{ marginTop: 0 }}>Einstellungen</h2>
          <div className="formular-feld">
            <label>Name</label>
            <input
              defaultValue={ausgewaehlt.name}
              key={`name-${ausgewaehlt.id}`}
              onBlur={(e) => formularFeldAendern(ausgewaehlt, { name: e.target.value })}
            />
          </div>
          <div className="formular-feld">
            <label>Beschreibung</label>
            <textarea
              defaultValue={ausgewaehlt.beschreibung ?? ""}
              key={`beschr-${ausgewaehlt.id}`}
              onBlur={(e) => formularFeldAendern(ausgewaehlt, { beschreibung: e.target.value || null })}
            />
          </div>
          <div className="formular-feld">
            <label>E-Mail-Empfänger bei neuer Einreichung</label>
            <input
              type="email"
              defaultValue={ausgewaehlt.email_empfaenger ?? ""}
              key={`mail-${ausgewaehlt.id}`}
              placeholder="z. B. schriftfuehrer@wehr.de"
              onBlur={(e) => formularFeldAendern(ausgewaehlt, { email_empfaenger: e.target.value || null })}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={ausgewaehlt.aktiv}
              onChange={(e) => formularFeldAendern(ausgewaehlt, { aktiv: e.target.checked })}
            />
            Aktiv (für Nutzer sichtbar/absendbar)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={ausgewaehlt.login_erforderlich}
              onChange={(e) => formularFeldAendern(ausgewaehlt, { login_erforderlich: e.target.checked })}
            />
            Anmeldung erforderlich (nur angemeldete Mitglieder)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={ausgewaehlt.moderator_sichtbar}
              onChange={(e) => formularFeldAendern(ausgewaehlt, { moderator_sichtbar: e.target.checked })}
            />
            Einreichungen auch für Gruppenführer/Moderatoren sichtbar
          </label>
          <div className="formular-feld">
            <label>Ablaufdatum (leer = dauerhaft gültig)</label>
            <input
              type="datetime-local"
              key={`ablauf-${ausgewaehlt.id}`}
              defaultValue={zuLokalInput(ausgewaehlt.ablauf_am)}
              onBlur={(e) => formularFeldAendern(ausgewaehlt, { ablauf_am: vonLokalInput(e.target.value) })}
            />
            <p className="hinweistext">
              Nach Ablauf ist das Formular nicht mehr absendbar. Ist ein E-Mail-Empfänger hinterlegt,
              wird bei Ablauf automatisch eine Auswertung dorthin gesendet.
            </p>
          </div>
          <div className="formular-feld">
            <label>Startdatum (leer = sofort verfügbar)</label>
            <input
              type="datetime-local"
              key={`start-${ausgewaehlt.id}`}
              defaultValue={zuLokalInput(ausgewaehlt.start_am)}
              onBlur={(e) => formularFeldAendern(ausgewaehlt, { start_am: vonLokalInput(e.target.value) })}
            />
          </div>
          <div className="formular-feld">
            <label>Maximale Anzahl Einreichungen (leer/0 = unbegrenzt)</label>
            <input
              type="number"
              min={0}
              key={`max-${ausgewaehlt.id}`}
              defaultValue={ausgewaehlt.max_einreichungen ?? ""}
              onBlur={(e) =>
                formularFeldAendern(ausgewaehlt, { max_einreichungen: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
          <div className="formular-feld">
            <label>Einreichungen automatisch löschen nach (Tagen; leer/0 = nie)</label>
            <input
              type="number"
              min={0}
              key={`aufb-${ausgewaehlt.id}`}
              defaultValue={ausgewaehlt.aufbewahrung_tage ?? ""}
              onBlur={(e) =>
                formularFeldAendern(ausgewaehlt, { aufbewahrung_tage: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
          <div className="formular-feld">
            <label>Danke-Text (nach dem Absenden angezeigt)</label>
            <textarea
              key={`danke-${ausgewaehlt.id}`}
              defaultValue={ausgewaehlt.danke_text ?? ""}
              placeholder="z. B. Vielen Dank für deine Rückmeldung!"
              onBlur={(e) => formularFeldAendern(ausgewaehlt, { danke_text: e.target.value || null })}
            />
          </div>
          <div className="formular-feld">
            <label>Einwilligungstext (Pflicht-Häkchen beim Absenden; leer = keins)</label>
            <textarea
              key={`einw-${ausgewaehlt.id}`}
              defaultValue={ausgewaehlt.einwilligung_text ?? ""}
              placeholder="z. B. Ich bin mit der Verarbeitung meiner Angaben einverstanden."
              onBlur={(e) => formularFeldAendern(ausgewaehlt, { einwilligung_text: e.target.value || null })}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={ausgewaehlt.ergebnis_oeffentlich}
              onChange={(e) => formularFeldAendern(ausgewaehlt, { ergebnis_oeffentlich: e.target.checked })}
            />
            Ergebnis nach dem Absenden öffentlich anzeigen (ohne Freitexte)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={ausgewaehlt.mehrfach_verhindern}
              onChange={(e) => formularFeldAendern(ausgewaehlt, { mehrfach_verhindern: e.target.checked })}
            />
            Mehrfach-Absenden verhindern (bei Anmeldepflicht pro Person erzwungen)
          </label>

          <div className="formular-feld">
            <label>Teilbarer Link (z. B. für WhatsApp)</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
              {qrUrl && <img src={qrUrl} alt="QR-Code zum Formular" width={120} height={120} />}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 240px" }}>
                <input readOnly value={`${basisUrl}/formular/${ausgewaehlt.id}`} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="sekundaer"
                    onClick={(e) => linkKopieren(`${basisUrl}/formular/${ausgewaehlt.id}`, e.currentTarget)}
                  >
                    Link kopieren
                  </button>
                  <button
                    type="button"
                    className="sekundaer"
                    onClick={() => formularCsvHerunterladen(ausgewaehlt.id, ausgewaehlt.name)}
                  >
                    CSV-Export
                  </button>
                  <button type="button" className="sekundaer" onClick={() => duplizieren(ausgewaehlt)}>
                    Duplizieren
                  </button>
                </div>
              </div>
            </div>
            {!ausgewaehlt.aktiv && (
              <p className="hinweistext">
                Hinweis: Das Formular ist noch inaktiv und daher über den Link nicht erreichbar.
              </p>
            )}
          </div>

          <h2>Felder</h2>
          {[...ausgewaehlt.felder]
            .sort((a, b) => a.reihenfolge - b.reihenfolge)
            .map((feld, i, arr) => (
              <div
                key={feld.id}
                style={{
                  border: "1px solid var(--farbe-rand)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    defaultValue={feld.label}
                    key={`fl-${feld.id}`}
                    onBlur={(e) => feldAendern(feld, { label: e.target.value })}
                    style={{ flex: "1 1 180px" }}
                  />
                  <select
                    value={feld.typ}
                    onChange={(e) => feldAendern(feld, { typ: e.target.value as FormularFeldTyp })}
                  >
                    {Object.entries(FELDTYP_LABEL).map(([wert, label]) => (
                      <option key={wert} value={wert}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.9rem" }}>
                    <input
                      type="checkbox"
                      checked={feld.pflicht}
                      onChange={(e) => feldAendern(feld, { pflicht: e.target.checked })}
                    />
                    Pflicht
                  </label>
                  <button
                    className="sekundaer"
                    disabled={i === 0}
                    onClick={() => feldVerschieben(feld, -1)}
                    style={{ padding: "2px 8px" }}
                  >
                    ▲
                  </button>
                  <button
                    className="sekundaer"
                    disabled={i === arr.length - 1}
                    onClick={() => feldVerschieben(feld, 1)}
                    style={{ padding: "2px 8px" }}
                  >
                    ▼
                  </button>
                  <button
                    className="sekundaer"
                    onClick={() => feldEntfernen(feld)}
                    style={{ color: "#d64545" }}
                  >
                    Löschen
                  </button>
                </div>

                {(feld.typ === "dropdown" || feld.typ === "dropdown_mehrfach") && (
                  <div className="formular-feld" style={{ marginTop: 8 }}>
                    <label>Optionen (eine pro Zeile)</label>
                    <textarea
                      defaultValue={feld.optionen.join("\n")}
                      key={`opt-${feld.id}`}
                      onBlur={(e) =>
                        feldAendern(feld, {
                          optionen: e.target.value
                            .split("\n")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                )}
                {(feld.typ === "sterne" || feld.typ === "skala") && (
                  <div className="formular-feld" style={{ marginTop: 8 }}>
                    <label>{feld.typ === "sterne" ? "Maximale Sternzahl" : "Maximum der Skala"}</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      defaultValue={feld.max_sterne}
                      key={`ms-${feld.id}`}
                      onBlur={(e) => feldAendern(feld, { max_sterne: Number(e.target.value) })}
                      style={{ width: 100 }}
                    />
                  </div>
                )}
                <div className="formular-feld" style={{ marginTop: 8 }}>
                  <label>Hilfetext / Platzhalter (optional)</label>
                  <input
                    defaultValue={feld.hinweis ?? ""}
                    key={`hw-${feld.id}`}
                    onBlur={(e) => feldAendern(feld, { hinweis: e.target.value || null })}
                  />
                </div>
              </div>
            ))}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <input
              placeholder="Neues Feld – Bezeichnung"
              value={neuesFeldLabel}
              onChange={(e) => setNeuesFeldLabel(e.target.value)}
              style={{ flex: "1 1 180px" }}
            />
            <select value={neuesFeldTyp} onChange={(e) => setNeuesFeldTyp(e.target.value as FormularFeldTyp)}>
              {Object.entries(FELDTYP_LABEL).map(([wert, label]) => (
                <option key={wert} value={wert}>
                  {label}
                </option>
              ))}
            </select>
            <button onClick={feldHinzufuegen}>+ Feld hinzufügen</button>
          </div>

          <h2>Auswertung (Zwischenstand)</h2>
          <button
            className="sekundaer"
            onClick={async () => {
              setZusammenfassung(null);
              setZusammenfassung(await holeZusammenfassung(ausgewaehlt.id));
            }}
          >
            Auswertung laden
          </button>
          {zusammenfassung && (
            <div style={{ marginTop: 12 }}>
              <FormularZusammenfassung daten={zusammenfassung} />
            </div>
          )}

          <h2>Einreichungen</h2>
          <button className="sekundaer" onClick={einreichungenLaden}>
            Einreichungen anzeigen
          </button>
          {einreichungen && (
            <div style={{ marginTop: 12 }}>
              {einreichungen.length === 0 ? (
                <p style={{ color: "var(--farbe-text-mute)" }}>Noch keine Einreichungen.</p>
              ) : (
                einreichungen.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      border: "1px solid var(--farbe-rand)",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", color: "var(--farbe-text-mute)", marginBottom: 6 }}>
                      {formatiereDatumZeit(e.erstellt_am)}
                      {e.person_name ? ` · ${e.person_name}` : ""}
                    </div>
                    {e.antworten.map((a) => (
                      <div key={a.feld_id}>
                        <strong>{a.label}:</strong> {wertText(a)}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: "right" }}>
            <button className="sekundaer" style={{ color: "#d64545" }} onClick={() => loeschen(ausgewaehlt)}>
              Formular löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
