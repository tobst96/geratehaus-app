import { useEffect, useState, type FormEvent } from "react";
import { holeEinstellungen, schreibeEinstellungen } from "../../api/moderator";
import { ApiError } from "../../api/client";

interface PunkteRegelState {
  punkte: number;
  tage: number;
  modus: string;
}

function RegelKarte({
  titel,
  beschreibung,
  regel,
  onAendern,
}: {
  titel: string;
  beschreibung: string;
  regel: PunkteRegelState;
  onAendern: (regel: PunkteRegelState) => void;
}) {
  const taeglicherAbbau =
    regel.modus === "abziehend" && regel.tage > 0 ? (regel.punkte / regel.tage).toFixed(2) : null;

  return (
    <div className="karte">
      <h2>{titel}</h2>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>{beschreibung}</p>

      <label>Punkte</label>
      <input
        type="number"
        min={0}
        value={regel.punkte}
        onChange={(e) => onAendern({ ...regel, punkte: Number(e.target.value) })}
      />
      <br />
      <br />
      <label>Gültigkeitsdauer (Tage)</label>
      <input
        type="number"
        min={0}
        value={regel.tage}
        onChange={(e) => onAendern({ ...regel, tage: Number(e.target.value) })}
      />
      <br />
      <br />
      <label>Abbau-Modus</label>
      <select value={regel.modus} onChange={(e) => onAendern({ ...regel, modus: e.target.value })}>
        <option value="halten">Halten bis Ende</option>
        <option value="abziehend">Abziehend bis Ende</option>
      </select>
      {taeglicherAbbau && (
        <p style={{ fontSize: "0.8rem", color: "#666", marginTop: 4 }}>
          Entspricht ca. {taeglicherAbbau} Punkten Abzug pro Tag, sodass die Punkte nach {regel.tage}{" "}
          Tagen bei 0 ankommen.
        </p>
      )}
    </div>
  );
}

export function PunkteEinstellungen() {
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  const [anlage, setAnlage] = useState<PunkteRegelState>({ punkte: 1, tage: 3, modus: "halten" });
  const [profilbild, setProfilbild] = useState<PunkteRegelState>({ punkte: 50, tage: 365, modus: "halten" });
  const [email, setEmail] = useState<PunkteRegelState>({ punkte: 30, tage: 100, modus: "halten" });

  async function laden() {
    try {
      const w = await holeEinstellungen();
      setAnlage({
        punkte: Number(w.punkte_anlage_punkte ?? 1),
        tage: Number(w.punkte_anlage_tage ?? 3),
        modus: String(w.punkte_anlage_modus ?? "halten"),
      });
      setProfilbild({
        punkte: Number(w.punkte_profilbild_punkte ?? 50),
        tage: Number(w.punkte_profilbild_tage ?? 365),
        modus: String(w.punkte_profilbild_modus ?? "halten"),
      });
      setEmail({
        punkte: Number(w.punkte_email_punkte ?? 30),
        tage: Number(w.punkte_email_tage ?? 100),
        modus: String(w.punkte_email_modus ?? "halten"),
      });
      setGeladen(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function speichern(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({
        punkte_anlage_punkte: anlage.punkte,
        punkte_anlage_tage: anlage.tage,
        punkte_anlage_modus: anlage.modus,
        punkte_profilbild_punkte: profilbild.punkte,
        punkte_profilbild_tage: profilbild.tage,
        punkte_profilbild_modus: profilbild.modus,
        punkte_email_punkte: email.punkte,
        punkte_email_tage: email.tage,
        punkte_email_modus: email.modus,
      });
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 4000);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einstellungen konnten nicht gespeichert werden.");
    }
  }

  if (!geladen && !fehler) return <p>Lädt …</p>;

  return (
    <div>
      <h1>Punkte</h1>
      <p style={{ color: "#666" }}>
        Hier legst du fest, wie viele Punkte Personen für bestimmte Ereignisse automatisch erhalten,
        wie lange diese gültig sind, und ob sie bis zum Ende voll erhalten bleiben ("Halten bis Ende")
        oder linear bis auf 0 abgebaut werden ("Abziehend bis Ende").
      </p>
      {fehler && <p className="fehlertext">{fehler}</p>}
      {gespeichert && (
        <p
          style={{
            background: "#e6f7ec",
            color: "#1a7a3a",
            padding: "0.6rem 1rem",
            borderRadius: "var(--radius)",
            fontWeight: 600,
          }}
        >
          ✓ Einstellungen erfolgreich gespeichert
        </p>
      )}

      <form onSubmit={speichern}>
        <RegelKarte
          titel="Neuanlage einer Person"
          beschreibung="Wird einmalig vergeben, wenn eine Person im Personal-Tab neu angelegt wird."
          regel={anlage}
          onAendern={setAnlage}
        />
        <RegelKarte
          titel="Erstes Profilbild"
          beschreibung="Wird einmalig vergeben, sobald eine Person zum ersten Mal ein Profilbild erhält."
          regel={profilbild}
          onAendern={setProfilbild}
        />
        <RegelKarte
          titel="Erste E-Mail-Adresse"
          beschreibung="Wird einmalig vergeben, sobald für eine Person zum ersten Mal eine E-Mail-Adresse hinterlegt wird."
          regel={email}
          onAendern={setEmail}
        />
        <button type="submit">Speichern</button>
      </form>
    </div>
  );
}
