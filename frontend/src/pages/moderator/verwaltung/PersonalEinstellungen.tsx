import { useEffect, useState } from "react";
import { Gespeichert } from "../../../components/Gespeichert";
import { GruppenVerwaltung } from "./GruppenVerwaltung";
import { holeEinstellungen, schreibeEinstellungen } from "../../../api/moderator";
import { ApiError } from "../../../api/client";

/** Sammel-Einstellungen für das Modul Personal: Gruppen + PIN-Erinnerung.
 * Wird sowohl in der Personal-Seite (Dialog „Personal-Einstellungen") als auch
 * auf der Modul-Unterseite verwendet. */
export function PersonalEinstellungen() {
  const [intervall, setIntervall] = useState(7);
  const [sortierung, setSortierung] = useState("nachname");
  const [inaktivitaetTage, setInaktivitaetTage] = useState(90);
  const [ampelGelbTage, setAmpelGelbTage] = useState(30);
  const [ampelRotTage, setAmpelRotTage] = useState(60);
  const [ampelMeldeGelb, setAmpelMeldeGelb] = useState(true);
  const [ampelMeldeRot, setAmpelMeldeRot] = useState(true);
  const [geladen, setGeladen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    holeEinstellungen()
      .then((w) => {
        setIntervall(Number(w.pin_erinnerung_intervall_tage ?? 7));
        setSortierung(String(w.personen_sortierung ?? "nachname"));
        setInaktivitaetTage(Number(w.personen_inaktivitaet_tage ?? 90));
        setAmpelGelbTage(Number(w.personal_ampel_gelb_tage ?? 30));
        setAmpelRotTage(Number(w.personal_ampel_rot_tage ?? 60));
        setAmpelMeldeGelb(w.benachrichtigung_person_ampel_gelb !== false);
        setAmpelMeldeRot(w.benachrichtigung_person_ampel_rot !== false);
        setGeladen(true);
      })
      .catch(() => setGeladen(true));
  }, []);

  async function speichern() {
    setSpeichert(true);
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({
        pin_erinnerung_intervall_tage: intervall,
        personen_sortierung: sortierung,
        personen_inaktivitaet_tage: inaktivitaetTage,
        personal_ampel_gelb_tage: ampelGelbTage,
        personal_ampel_rot_tage: ampelRotTage,
        benachrichtigung_person_ampel_gelb: ampelMeldeGelb,
        benachrichtigung_person_ampel_rot: ampelMeldeRot,
      });
      setGespeichert(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <div>
      <h2>Gruppen</h2>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Personengruppen (z. B. Züge/Gruppen), die Personen zugeordnet werden können.
      </p>
      <GruppenVerwaltung />

      <h2 style={{ marginTop: 24 }}>Personenliste</h2>
      <div className="formular-feld">
        <label htmlFor="e-personen-sortierung">Sortierung der Personenliste</label>
        <select
          id="e-personen-sortierung"
          value={sortierung}
          onChange={(e) => setSortierung(e.target.value)}
          disabled={!geladen}
        >
          <option value="nachname">Nach Nachname</option>
          <option value="vorname">Nach Vorname</option>
          <option value="gruppe_nachname">Nach Gruppe, dann Nachname</option>
        </select>
      </div>
      <div className="formular-feld">
        <label htmlFor="e-personen-inaktivitaet">
          Person löschen nach Inaktivität (Tage ohne neuen Timeline-Eintrag)
        </label>
        <input
          id="e-personen-inaktivitaet"
          type="number"
          min={0}
          value={inaktivitaetTage}
          onChange={(e) => setInaktivitaetTage(Number(e.target.value))}
          disabled={!geladen}
        />
        <p className="hinweistext">
          7 Tage vor der automatischen Löschung wird einmalig eine Benachrichtigung verschickt.
          Erfolgt in dieser Zeit keine neue Aktivität, wird die Person inkl. aller zugehörigen Daten
          gelöscht. 0 = nie automatisch löschen.
        </p>
      </div>

      <h2 style={{ marginTop: 24 }}>PIN-Erinnerung</h2>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Ist das Barcode-Modul deaktiviert, melden sich Personen per Namen und PIN an. Personen ohne
        gesetzten PIN (mit hinterlegter E-Mail) werden in diesem Intervall automatisch per Mail an das
        Setzen ihres PINs erinnert.
      </p>
      <div className="formular-feld">
        <label htmlFor="pin-intervall">Erinnerungsintervall (Tage)</label>
        <input
          id="pin-intervall"
          type="number"
          min={1}
          value={intervall}
          onChange={(e) => setIntervall(Number(e.target.value))}
          disabled={!geladen}
        />
      </div>

      <h2 style={{ marginTop: 24 }}>Aktivitäts-Ampel</h2>
      <p style={{ color: "var(--farbe-text-mute)" }}>
        Färbt Personen ein, die seit einer bestimmten Anzahl Tagen keinen Einsatz, Dienst oder keine
        Dienststunden mehr hatten (nur aktive Module zählen; ohne Eintrag zählt das Anlagedatum).
        0 Tage = diese Farbe aus. Als inaktiv markierte Personen sind ausgenommen.
      </p>
      <div className="formular-feld">
        <label htmlFor="ampel-gelb">Gelb ab (Tagen ohne Eintrag)</label>
        <input
          id="ampel-gelb"
          type="number"
          min={0}
          value={ampelGelbTage}
          onChange={(e) => setAmpelGelbTage(Number(e.target.value))}
          disabled={!geladen}
        />
      </div>
      <div className="formular-feld">
        <label htmlFor="ampel-rot">Rot ab (Tagen ohne Eintrag)</label>
        <input
          id="ampel-rot"
          type="number"
          min={0}
          value={ampelRotTage}
          onChange={(e) => setAmpelRotTage(Number(e.target.value))}
          disabled={!geladen}
        />
      </div>
      <p style={{ color: "var(--farbe-text-mute)", fontSize: "0.85rem", marginBottom: 4 }}>
        Benachrichtigungen gehen einmalig beim Überschreiten der Schwelle an die Personen, die das
        jeweilige Ereignis abonniert haben (Benachrichtigungskanäle je Person).
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={ampelMeldeGelb}
          onChange={(e) => setAmpelMeldeGelb(e.target.checked)}
          disabled={!geladen}
        />
        Bei gelber Ampel benachrichtigen
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={ampelMeldeRot}
          onChange={(e) => setAmpelMeldeRot(e.target.checked)}
          disabled={!geladen}
        />
        Bei roter Ampel benachrichtigen
      </label>

      <button style={{ marginTop: 16 }} onClick={speichern} disabled={speichert || !geladen}>
        {speichert ? "Speichert …" : "Speichern"}
      </button>
      {gespeichert && <Gespeichert />}
      {fehler && <p className="fehlertext">{fehler}</p>}
    </div>
  );
}
