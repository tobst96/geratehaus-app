import { useEffect, useState } from "react";
import {
  barcodeBildUrl,
  holeAllePersonen,
  personBarcodeErzeugen,
  holeEinstellungen,
  schreibeEinstellungen,
} from "../../api/moderator";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";
import { oeffentlicheBasisUrl } from "../../utils/oeffentlicheUrl";
import type { Person } from "../../api/types";

interface BarcodeInfo {
  token: string;
  ablaufAm: string | null;
}

export function BarcodeGenerator() {
  const { config } = useConfig();
  const [personen, setPersonen] = useState<Person[] | null>(null);
  const [barcodes, setBarcodes] = useState<Map<number, BarcodeInfo>>(new Map());
  const [fehler, setFehler] = useState<string | null>(null);
  const [gueltigkeitTage, setGueltigkeitTage] = useState(730);
  const [speichertGueltigkeit, setSpeichertGueltigkeit] = useState(false);

  useEffect(() => {
    holeAllePersonen()
      .then(setPersonen)
      .catch((err) => setFehler(err instanceof ApiError ? String(err.detail) : "Personen konnten nicht geladen werden."));
    holeEinstellungen()
      .then((w) => setGueltigkeitTage(Number(w.barcode_gueltigkeit_tage ?? 730)))
      .catch(() => {});
  }, []);

  async function gueltigkeitSpeichern() {
    setSpeichertGueltigkeit(true);
    try {
      await schreibeEinstellungen({ barcode_gueltigkeit_tage: gueltigkeitTage });
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    } finally {
      setSpeichertGueltigkeit(false);
    }
  }

  async function generateBarcode(personId: number): Promise<BarcodeInfo> {
    const { token, ablauf_am } = await personBarcodeErzeugen(personId);
    const info = { token, ablaufAm: ablauf_am };
    setBarcodes((vorher) => new Map(vorher).set(personId, info));
    return info;
  }

  function printBarcode(person: Person) {
    const element = document.getElementById(`barcode-${person.id}`);
    if (element) {
      const printWindow = window.open("", "", "width=400,height=300");
      if (printWindow) {
        printWindow.document.write(element.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  }

  async function downloadAllAsHTML() {
    if (!personen) return;
    let html = `
      <html>
      <head>
        <title>Barcodes</title>
        <style>
          body { margin: 0; padding: 10px; font-family: Arial; }
          .card {
            width: 85.6mm;
            height: 53.98mm;
            border: 1px solid #ccc;
            padding: 5mm;
            margin: 5mm;
            display: inline-block;
            page-break-inside: avoid;
            box-sizing: border-box;
            text-align: center;
          }
          .name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
          .ablauf { font-size: 9px; color: #666; margin-top: 4px; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>
    `;

    for (const person of personen) {
      const info = barcodes.get(person.id) ?? (await generateBarcode(person.id));
      html += `
        <div class="card">
          <div class="name">${person.name}</div>
          <img src="${oeffentlicheBasisUrl(config)}${barcodeBildUrl(info.token)}" alt="Barcode" />
          ${info.ablaufAm ? `<div class="ablauf">Gültig bis ${new Date(info.ablaufAm).toLocaleDateString("de-DE")}</div>` : ""}
        </div>
      `;
    }

    html += `</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "barcodes.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (fehler) return <p className="fehlertext">{fehler}</p>;
  if (!personen) return <p>Lädt …</p>;

  return (
    <div>
      <h1>Barcode-Generierung</h1>
      <p>
        Erzeugt für jede Person einen echten Strichcode (Code128), der ein eindeutiges Geheimnis
        codiert und 2 Jahre gültig ist. Personen werden unter Stammdaten → Personen verwaltet.
      </p>

      <div className="karte" style={{ marginBottom: "2rem", maxWidth: 400 }}>
        <label htmlFor="barcode-gueltigkeit">Gültigkeitsdauer neuer Barcodes (Tage)</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            id="barcode-gueltigkeit"
            type="number"
            min={1}
            value={gueltigkeitTage}
            onChange={(e) => setGueltigkeitTage(Number(e.target.value))}
          />
          <button onClick={gueltigkeitSpeichern} disabled={speichertGueltigkeit}>
            {speichertGueltigkeit ? "Speichert …" : "Speichern"}
          </button>
        </div>
        <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: 0 }}>
          Gilt nur für neu erzeugte Barcodes. Bereits ausgegebene Barcodes behalten ihr
          ursprüngliches Ablaufdatum.
        </p>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <button onClick={downloadAllAsHTML}>📥 Alle Barcodes als HTML herunterladen</button>
      </div>

      {personen.length === 0 && <p>Keine Personen angelegt. Siehe Stammdaten → Personen.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {personen.map((person) => {
          const info = barcodes.get(person.id);
          return (
            <div key={person.id} className="karte">
              <h3>{person.name}</h3>

              {info && (
                <div
                  id={`barcode-${person.id}`}
                  style={{
                    border: "2px dashed #ccc",
                    padding: "1rem",
                    textAlign: "center",
                    marginBottom: "1rem",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{person.name}</div>
                  <img src={barcodeBildUrl(info.token)} alt="Barcode" style={{ maxWidth: "100%" }} />
                  {info.ablaufAm && (
                    <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 4 }}>
                      Gültig bis {new Date(info.ablaufAm).toLocaleDateString("de-DE")}
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => generateBarcode(person.id)} style={{ marginRight: "0.5rem" }}>
                Generieren
              </button>
              {info && (
                <button className="sekundaer" onClick={() => printBarcode(person)}>
                  🖨️ Drucken
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
