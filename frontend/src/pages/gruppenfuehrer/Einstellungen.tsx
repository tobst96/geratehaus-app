import { Fehlertext } from "../../components/Fehlertext";
import { useEffect, useState, type FormEvent } from "react";
import {
  holeEinstellungen,
  schreibeEinstellungen,
  ladeLogoHoch,
  ladeLogoDarkHoch,
  fuehreArchivierungAus,
  holeZweiFaktorStatus,
  zweiFaktorAktivieren,
  zweiFaktorRecoveryNeu,
  zweiFaktorDeaktivieren,
  type ZweiFaktorStatus,
} from "../../api/gruppenfuehrer";
import { setupErneutAusfuehren } from "../../api/setup";
import { ApiError } from "../../api/client";
import { useConfig } from "../../context/ConfigContext";
import { useToast } from "../../context/ToastContext";
import { Banner } from "../../components/Banner";
import { Ladeanzeige } from "../../components/Ladeanzeige";
import { texte } from "../../i18n/texte";

const t = texte.einstellungen;

function ZweiFaktorVerwaltung() {
  const [status, setStatus] = useState<ZweiFaktorStatus | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function laden() {
    try {
      setStatus(await holeZweiFaktorStatus());
    } catch {
      /* nicht kritisch */
    }
  }

  useEffect(() => {
    laden();
  }, []);

  async function aktivieren() {
    setFehler(null);
    try {
      const { codes } = await zweiFaktorAktivieren();
      setCodes(codes);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_2fa_aktivieren);
    }
  }

  async function deaktivieren() {
    if (!confirm(t.zwei_faktor_deaktivieren_bestaetigen)) return;
    setFehler(null);
    try {
      await zweiFaktorDeaktivieren();
      setCodes(null);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_2fa_deaktivieren);
    }
  }

  async function recoveryNeu() {
    setFehler(null);
    try {
      const { codes } = await zweiFaktorRecoveryNeu();
      setCodes(codes);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_codes);
    }
  }

  if (!status) return null;

  return (
    <div className="karte">
      <h2>{t.zwei_faktor_titel}</h2>
      <p className="hinweistext">{t.zwei_faktor_hinweis}</p>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {codes && (
        <div style={{ margin: "8px 0", padding: 12, border: "1px solid var(--farbe-rand)", borderRadius: 8 }}>
          <strong>{t.recovery_codes_hinweis}</strong>
          <div style={{ fontFamily: "monospace", marginTop: 8, columns: 2 }}>
            {codes.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
        </div>
      )}
      {status.aktiv ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "green", fontWeight: 600, alignSelf: "center" }}>{t.aktiv}</span>
          <button type="button" className="sekundaer" onClick={recoveryNeu}>
            {t.neue_recovery_codes}
          </button>
          <button type="button" className="sekundaer" onClick={deaktivieren}>
            {t.deaktivieren}
          </button>
        </div>
      ) : !status.email_gesetzt ? (
        <Fehlertext>{t.zwei_faktor_email_noetig}</Fehlertext>
      ) : (
        <button type="button" onClick={aktivieren}>
          {t.zwei_faktor_aktivieren}
        </button>
      )}
    </div>
  );
}

export function Einstellungen() {
  const { neuLaden } = useConfig();
  const toast = useToast();
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  const [organisationName, setOrganisationName] = useState("");
  const [oeffentlicheBasisUrl, setOeffentlicheBasisUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoDarkUrl, setLogoDarkUrl] = useState("");
  const [farbePrimaer, setFarbePrimaer] = useState("#FFA633");
  const [farbeAkzent, setFarbeAkzent] = useState("#1A1A1A");

  const [archivierungszeitraum, setArchivierungszeitraum] = useState(2);


  const [fehlerberichteAktiv, setFehlerberichteAktiv] = useState(false);

  const [zweiFaktorPflicht, setZweiFaktorPflicht] = useState(true);


  async function laden() {
    try {
      const w = await holeEinstellungen();
      setOrganisationName(String(w.organisation_name ?? ""));
      setOeffentlicheBasisUrl(String(w.oeffentliche_basis_url ?? ""));
      setLogoUrl(String(w.logo_url ?? ""));
      setLogoDarkUrl(String(w.logo_url_dark ?? ""));
      setFarbePrimaer(String(w.farbe_primaer ?? "#FFA633"));
      setFarbeAkzent(String(w.farbe_akzent ?? "#1A1A1A"));
      setArchivierungszeitraum(Number(w.archivierungszeitraum_jahre ?? 2));
      setFehlerberichteAktiv(Boolean(w.fehlerberichte_aktiv));
      setZweiFaktorPflicht(Boolean(w.zwei_faktor_pflicht ?? false));
      setGeladen(true);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_laden);
    }
  }

  useEffect(() => {
    laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function speichern(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setGespeichert(false);
    try {
      await schreibeEinstellungen({
        organisation_name: organisationName,
        oeffentliche_basis_url: oeffentlicheBasisUrl,
        farbe_primaer: farbePrimaer,
        farbe_akzent: farbeAkzent,
        archivierungszeitraum_jahre: archivierungszeitraum,
        fehlerberichte_aktiv: fehlerberichteAktiv,
        zwei_faktor_pflicht: zweiFaktorPflicht,
      });
      neuLaden();
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 4000);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_speichern);
    }
  }

  async function logoDarkHochladen(datei: File) {
    try {
      const { logo_url_dark } = await ladeLogoDarkHoch(datei);
      setLogoDarkUrl(logo_url_dark);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_logo);
    }
  }

  async function logoHochladen(datei: File) {
    try {
      const { logo_url } = await ladeLogoHoch(datei);
      setLogoUrl(logo_url);
      neuLaden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_logo);
    }
  }

  async function archivierungJetzt() {
    try {
      const ergebnis = await fuehreArchivierungAus();
      setGespeichert(false);
      setFehler(null);
      toast.erfolg(
        `${t.archiviert_prefix} ${ergebnis.einsaetze} ${t.einsaetze}, ${ergebnis.dienstbuecher} ${t.dienstbuecher}.`
      );
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_archivierung);
    }
  }

  async function setupErneut() {
    if (
      !confirm(
        t.setup_erneut_bestaetigen
      )
    ) {
      return;
    }
    try {
      await setupErneutAusfuehren({
        organisation_name: organisationName,
        farbe_primaer: farbePrimaer,
        farbe_akzent: farbeAkzent,
      });
      neuLaden();
      toast.erfolg(t.setup_erfolg);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_setup);
    }
  }

  if (!geladen && !fehler) return <Ladeanzeige />;

  return (
    <div>
      <h1>{t.titel}</h1>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}
      {gespeichert && <Banner art="erfolg">{t.gespeichert_banner}</Banner>}

      <form onSubmit={speichern}>
        <div className="karte">
          <h2>{t.organisation_branding}</h2>
          <div className="formular-feld">
            <label htmlFor="e-org">{t.org_name_label}</label>
            <input id="e-org" value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} />
          </div>
          <div className="formular-feld">
            <label htmlFor="e-basis-url">{t.basis_url_label}</label>
            <input
              id="e-basis-url"
              value={oeffentlicheBasisUrl}
              onChange={(e) => setOeffentlicheBasisUrl(e.target.value)}
              placeholder={t.basis_url_platzhalter}
            />
            <p className="hinweistext">{t.basis_url_hinweis}</p>
          </div>
          <div className="formular-feld">
            <label htmlFor="e-logo">{t.logo_label}</label>
            {logoUrl && (
              <img
                src={logoUrl}
                alt={t.logo_alt}
                style={{
                  height: 50,
                  width: "auto",
                  maxWidth: "100%",
                  objectFit: "contain",
                  alignSelf: "flex-start",
                  marginBottom: 8,
                }}
              />
            )}
            <input
              id="e-logo"
              type="file"
              accept="image/png,image/svg+xml"
              onChange={(e) => e.target.files?.[0] && logoHochladen(e.target.files[0])}
            />
          </div>
          <div className="formular-feld">
            <label htmlFor="e-logo-dark">{t.logo_dark_label}</label>
            {logoDarkUrl && (
              <img
                src={logoDarkUrl}
                alt={t.logo_dark_alt}
                style={{
                  height: 50,
                  width: "auto",
                  maxWidth: "100%",
                  objectFit: "contain",
                  alignSelf: "flex-start",
                  marginBottom: 8,
                  background: "#1a1a1a",
                  padding: 4,
                  borderRadius: 6,
                }}
              />
            )}
            <input
              id="e-logo-dark"
              type="file"
              accept="image/png,image/svg+xml"
              onChange={(e) => e.target.files?.[0] && logoDarkHochladen(e.target.files[0])}
            />
            <p style={{ fontSize: "0.8rem", color: "var(--farbe-text-mute)", margin: "4px 0 0" }}>
              {t.logo_dark_hinweis}
            </p>
          </div>
          <div className="formular-zeile">
            <div className="formular-feld">
              <label htmlFor="e-farbe-primaer">{t.primaerfarbe}</label>
              <input id="e-farbe-primaer" type="color" value={farbePrimaer} onChange={(e) => setFarbePrimaer(e.target.value)} />
            </div>
            <div className="formular-feld">
              <label htmlFor="e-farbe-akzent">{t.akzentfarbe}</label>
              <input id="e-farbe-akzent" type="color" value={farbeAkzent} onChange={(e) => setFarbeAkzent(e.target.value)} />
            </div>
          </div>
        </div>


        <div className="karte">
          <h2>{t.archivierung}</h2>
          <div className="formular-feld">
            <label htmlFor="e-archiv">{t.archivierungszeitraum_label}</label>
            <input
              id="e-archiv"
              type="number"
              min={1}
              value={archivierungszeitraum}
              onChange={(e) => setArchivierungszeitraum(Number(e.target.value))}
            />
          </div>
        </div>


        <div className="karte">
          <h2>{t.zwei_faktor_pflicht_titel}</h2>
          <label>
            <input
              type="checkbox"
              checked={zweiFaktorPflicht}
              onChange={(e) => setZweiFaktorPflicht(e.target.checked)}
            />{" "}
            {t.zwei_faktor_pflicht_label}
          </label>
          <p className="hinweistext">{t.zwei_faktor_pflicht_hinweis}</p>
        </div>

        <div className="karte">
          <h2>{t.fehlerberichte}</h2>
          <label>
            <input
              type="checkbox"
              checked={fehlerberichteAktiv}
              onChange={(e) => setFehlerberichteAktiv(e.target.checked)}
            />{" "}
            {t.fehlerberichte_label}
          </label>
          <p className="hinweistext">{t.fehlerberichte_hinweis}</p>
        </div>

        <button type="submit">{t.speichern}</button>
      </form>

      <ZweiFaktorVerwaltung />

      <div className="karte" style={{ marginTop: 24 }}>
        <h2>{t.wartung}</h2>
        <button type="button" className="sekundaer" onClick={archivierungJetzt}>
          {t.archivierung_jetzt}
        </button>{" "}
        <button type="button" className="sekundaer" onClick={setupErneut}>
          {t.setup_erneut}
        </button>
      </div>
    </div>
  );
}
