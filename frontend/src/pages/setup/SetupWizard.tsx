import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { markiereAlsEingerichtet, setupAusfuehren, setupLogoHochladen } from "../../api/setup";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";
import { GeofencePicker } from "../../components/GeofencePicker";

const SCHRITTE = ["Organisation", "Logo", "Farben", "Standort", "Admin-Passwort"] as const;

export function SetupWizard() {
  const navigate = useNavigate();
  const { neuLaden } = useConfig();

  const [schritt, setSchritt] = useState(0);
  const [organisationName, setOrganisationName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoLadevorgang, setLogoLadevorgang] = useState(false);
  const [farbePrimaer, setFarbePrimaer] = useState("#CC0000");
  const [farbeAkzent, setFarbeAkzent] = useState("#000000");
  const [geofenceLat, setGeofenceLat] = useState(0);
  const [geofenceLon, setGeofenceLon] = useState(0);
  const [radiusMeter, setRadiusMeter] = useState(150);
  const [adminPasswort, setAdminPasswort] = useState("");
  const [adminPasswortWiederholung, setAdminPasswortWiederholung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [wirdAbgeschlossen, setWirdAbgeschlossen] = useState(false);

  async function logoAuswaehlen(datei: File) {
    setLogoLadevorgang(true);
    setFehler(null);
    try {
      const { logo_url } = await setupLogoHochladen(datei);
      setLogoUrl(logo_url);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Logo-Upload fehlgeschlagen.");
    } finally {
      setLogoLadevorgang(false);
    }
  }

  function kannWeiter(): boolean {
    switch (schritt) {
      case 0:
        return organisationName.trim().length > 0;
      case 3:
        return geofenceLat !== 0 || geofenceLon !== 0;
      case 4:
        return adminPasswort.length >= 8 && adminPasswort === adminPasswortWiederholung;
      default:
        return true;
    }
  }

  async function abschliessen() {
    setFehler(null);
    setWirdAbgeschlossen(true);
    try {
      await setupAusfuehren({
        organisation_name: organisationName,
        farbe_primaer: farbePrimaer,
        farbe_akzent: farbeAkzent,
        geofence_lat: geofenceLat,
        geofence_lon: geofenceLon,
        geofence_radius_meter: radiusMeter,
        admin_passwort: adminPasswort,
      });
      markiereAlsEingerichtet();
      neuLaden();
      navigate("/");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Einrichtung fehlgeschlagen.");
    } finally {
      setWirdAbgeschlossen(false);
    }
  }

  return (
    <div>
      <h1>Einrichtung von Gerätehaus.app</h1>
      <p>
        Schritt {schritt + 1} von {SCHRITTE.length}: <strong>{SCHRITTE[schritt]}</strong>
      </p>

      <div className="karte">
        {schritt === 0 && (
          <>
            <label htmlFor="organisation-name">Name der Organisation</label>
            <input
              id="organisation-name"
              value={organisationName}
              onChange={(e) => setOrganisationName(e.target.value)}
              placeholder="z. B. Freiwillige Feuerwehr Musterstadt"
              required
            />
          </>
        )}

        {schritt === 1 && (
          <>
            <p>Lade optional ein Logo hoch (PNG oder SVG). Du kannst diesen Schritt überspringen.</p>
            <input
              type="file"
              accept="image/png,image/svg+xml"
              onChange={(e) => e.target.files?.[0] && logoAuswaehlen(e.target.files[0])}
            />
            {logoLadevorgang && <p>Wird hochgeladen …</p>}
            {logoUrl && <img src={logoUrl} alt="Hochgeladenes Logo" style={{ height: 60, marginTop: 12 }} />}
          </>
        )}

        {schritt === 2 && (
          <>
            <label htmlFor="farbe-primaer">Primärfarbe</label>
            <input
              id="farbe-primaer"
              type="color"
              value={farbePrimaer}
              onChange={(e) => setFarbePrimaer(e.target.value)}
            />
            <br />
            <br />
            <label htmlFor="farbe-akzent">Akzentfarbe</label>
            <input
              id="farbe-akzent"
              type="color"
              value={farbeAkzent}
              onChange={(e) => setFarbeAkzent(e.target.value)}
            />
          </>
        )}

        {schritt === 3 && (
          <>
            <GeofencePicker
              lat={geofenceLat}
              lon={geofenceLon}
              radiusMeter={radiusMeter}
              onChange={(lat, lon) => {
                setGeofenceLat(lat);
                setGeofenceLon(lon);
              }}
            />
            <label htmlFor="radius">Radius in Metern</label>
            <input
              id="radius"
              type="number"
              min={10}
              value={radiusMeter}
              onChange={(e) => setRadiusMeter(Number(e.target.value))}
            />
          </>
        )}

        {schritt === 4 && (
          <>
            <label htmlFor="admin-passwort">Admin-Passwort (mind. 8 Zeichen)</label>
            <input
              id="admin-passwort"
              type="password"
              value={adminPasswort}
              onChange={(e) => setAdminPasswort(e.target.value)}
              autoComplete="new-password"
            />
            <br />
            <br />
            <label htmlFor="admin-passwort-wiederholung">Passwort wiederholen</label>
            <input
              id="admin-passwort-wiederholung"
              type="password"
              value={adminPasswortWiederholung}
              onChange={(e) => setAdminPasswortWiederholung(e.target.value)}
              autoComplete="new-password"
            />
            {adminPasswortWiederholung.length > 0 && adminPasswort !== adminPasswortWiederholung && (
              <p className="fehlertext">Die Passwörter stimmen nicht überein.</p>
            )}
          </>
        )}
      </div>

      {fehler && <p className="fehlertext">{fehler}</p>}

      <div style={{ display: "flex", gap: 12 }}>
        {schritt > 0 && (
          <button type="button" className="sekundaer" onClick={() => setSchritt((s) => s - 1)}>
            Zurück
          </button>
        )}
        {schritt < SCHRITTE.length - 1 ? (
          <button type="button" disabled={!kannWeiter()} onClick={() => setSchritt((s) => s + 1)}>
            Weiter
          </button>
        ) : (
          <button type="button" disabled={!kannWeiter() || wirdAbgeschlossen} onClick={abschliessen}>
            {wirdAbgeschlossen ? "Wird eingerichtet …" : "Einrichtung abschließen"}
          </button>
        )}
      </div>
    </div>
  );
}
