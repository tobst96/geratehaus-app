import { useEffect, useState } from "react";
import { holeAllePersonen, personBarcodeErzeugen } from "../../api/moderator";
import { ApiError } from "../../api/client";
import type { Person } from "../../api/types";

export function BarcodeGenerator() {
  const [personen, setPersonen] = useState<Person[] | null>(null);
  const [barcodes, setBarcodes] = useState<Map<number, string>>(new Map());
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeAllePersonen()
      .then(setPersonen)
      .catch((err) => setFehler(err instanceof ApiError ? String(err.detail) : "Personen konnten nicht geladen werden."));
  }, []);

  async function generateBarcode(personId: number): Promise<string> {
    const { token } = await personBarcodeErzeugen(personId);
    setBarcodes((vorher) => new Map(vorher).set(personId, token));
    return token;
  }

  async function printBarcode(person: Person) {
    const token = barcodes.get(person.id) ?? (await generateBarcode(person.id));
    const element = document.getElementById(`barcode-${person.id}`);
    if (element) {
      const printWindow = window.open("", "", "width=400,height=300");
      if (printWindow) {
        printWindow.document.write(element.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
    return token;
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
          }
          .name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
          .barcode-container { text-align: center; margin: 5px 0; }
          .barcode { font-size: 16px; font-weight: bold; letter-spacing: 1px; font-family: monospace; word-break: break-all; }
        </style>
      </head>
      <body>
    `;

    for (const person of personen) {
      const token = barcodes.get(person.id) ?? (await generateBarcode(person.id));
      html += `
        <div class="card">
          <div class="name">${person.name}</div>
          <div class="barcode-container">
            <div class="barcode">${token}</div>
          </div>
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
        Erzeugt für jede Person ein eindeutiges Geheimnis (Barcode-Token), das ausschließlich für
        diese Person gilt. Personen werden unter Stammdaten → Personen verwaltet.
      </p>

      <div style={{ marginBottom: "2rem" }}>
        <button onClick={downloadAllAsHTML}>📥 Alle Barcodes als HTML herunterladen</button>
      </div>

      {personen.length === 0 && <p>Keine Personen angelegt. Siehe Stammdaten → Personen.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {personen.map((person) => {
          const token = barcodes.get(person.id) ?? "";
          return (
            <div key={person.id} className="karte">
              <h3>{person.name}</h3>

              {token && (
                <div
                  id={`barcode-${person.id}`}
                  style={{
                    border: "2px dashed #ccc",
                    padding: "1rem",
                    textAlign: "center",
                    marginBottom: "1rem",
                    backgroundColor: "#fafafa",
                    fontFamily: "monospace",
                  }}
                >
                  <div className="name" style={{ fontWeight: 700, marginBottom: 4 }}>
                    {person.name}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px", wordBreak: "break-all" }}>
                    {token}
                  </div>
                </div>
              )}

              <button onClick={() => generateBarcode(person.id)} style={{ marginRight: "0.5rem" }}>
                Generieren
              </button>
              {token && (
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
