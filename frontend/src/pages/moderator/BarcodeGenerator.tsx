import { useState } from "react";

interface Person {
  id: number;
  name: string;
}

export function BarcodeGenerator() {
  const [personen] = useState<Person[]>([
    { id: 1, name: "Person 1" },
    { id: 2, name: "Person 2" },
    { id: 3, name: "Person 3" },
  ]);
  const [barcodes, setBarcodes] = useState<Map<number, string>>(new Map());

  function generateBarcode(personId: number): string {
    // Simplified: just use person ID padded to 8 digits
    const barcode = String(personId).padStart(8, "0");
    const newBarcodes = new Map(barcodes);
    newBarcodes.set(personId, barcode);
    setBarcodes(newBarcodes);
    return barcode;
  }

  function printBarcode(person: Person) {
    // Ensure barcode exists before printing
    if (!barcodes.get(person.id)) {
      generateBarcode(person.id);
    }
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

  function downloadAllAsHTML() {
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
          .barcode { font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace; }
          .barcode-num { font-size: 10px; color: #666; margin-top: 3px; }
        </style>
      </head>
      <body>
    `;

    personen.forEach((person) => {
      const barcode = barcodes.get(person.id) || generateBarcode(person.id);
      html += `
        <div class="card">
          <div class="name">${person.name}</div>
          <div class="barcode-container">
            <div class="barcode">${barcode}</div>
            <div class="barcode-num">${barcode}</div>
          </div>
        </div>
      `;
    });

    html += `</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "barcodes.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1>Barcode-Generierung</h1>
      <p>Hier können Sie EC-Kartengröße-Barcodes für alle Personen generieren und ausdrucken.</p>

      <div style={{ marginBottom: "2rem" }}>
        <button onClick={downloadAllAsHTML} style={{ padding: "0.75rem 1.5rem", fontSize: "1rem" }}>
          📥 Alle Barcodes als HTML herunterladen
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {personen.map((person) => {
          const displayBarcode = barcodes.get(person.id) || "";
          return (
            <div key={person.id} className="karte">
              <h3>{person.name}</h3>

              {displayBarcode && (
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
                  <div style={{ fontSize: "24px", fontWeight: "bold", letterSpacing: "2px", marginBottom: "0.5rem" }}>
                    {displayBarcode}
                  </div>
                  <div style={{ fontSize: "10px", color: "#666" }}>{displayBarcode}</div>
                </div>
              )}

              <button onClick={() => generateBarcode(person.id)} style={{ marginRight: "0.5rem" }}>
                Generieren
              </button>
              {displayBarcode && (
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
