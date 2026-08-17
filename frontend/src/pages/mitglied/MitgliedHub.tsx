import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import {
  holeMeinProfil,
  aktualisiereMeinProfil,
  setzeMeinPasswort,
  type MeinProfil,
} from "../../api/auth";
import { holeMitgliedUebersicht, type MitgliedUebersicht } from "../../api/mitglied";
import { ApiError } from "../../api/client";
import { Fehlertext } from "../../components/Fehlertext";
import { KACHEL_ICONS, type KachelModulKey } from "../kachelIcons";
import { PushAktivierung } from "../../components/PushAktivierung";
import { InstallPrompt } from "../../components/InstallPrompt";

const MODULE: { key: KachelModulKey; aktivKey: string; aussenKey: string; route: string; label: string }[] = [
  { key: "einsatzbericht", aktivKey: "modul_einsatztagebuch_aktiv", aussenKey: "modul_einsatztagebuch_aussenzugriff", route: "/einsatztagebuch", label: "Einsatzbericht" },
  { key: "dienstbuch", aktivKey: "modul_dienstbuch_aktiv", aussenKey: "modul_dienstbuch_aussenzugriff", route: "/dienstbuch", label: "Dienstbuch" },
  { key: "dienststunden", aktivKey: "modul_dienststunden_aktiv", aussenKey: "modul_dienststunden_aussenzugriff", route: "/dienststunden", label: "Dienststunden" },
  { key: "fahrzeugbuchung", aktivKey: "modul_fahrzeugbuchung_aktiv", aussenKey: "modul_fahrzeugbuchung_aussenzugriff", route: "/fahrzeugbuchung", label: "Fahrzeugbuchung" },
  { key: "formulare", aktivKey: "modul_formular_aktiv", aussenKey: "modul_formular_aussenzugriff", route: "/formulare", label: "Formulare" },
];

function initialen(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((t) => t.charAt(0))
    .join("")
    .toUpperCase();
}

function StatKachel({ zahl, label }: { zahl: number; label: string }) {
  return (
    <div className="karte text-center" style={{ padding: "16px 12px" }}>
      <div style={{ fontSize: "2.2rem", fontWeight: 700, lineHeight: 1.1 }}>{zahl}</div>
      <div className="text-mute" style={{ fontSize: "0.85rem", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function StatBereich({ uebersicht }: { uebersicht: MitgliedUebersicht }) {
  const jahr = new Date().getFullYear();
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <StatKachel zahl={uebersicht.einsaetze_jahr} label={`Einsätze ${jahr}`} />
        <StatKachel zahl={uebersicht.dienste_jahr} label={`Dienste ${jahr}`} />
      </div>

      {uebersicht.dienststunden.length > 0 && (
        <div className="karte">
          <h3 style={{ marginTop: 0 }}>Meine Dienststunden</h3>
          {uebersicht.dienststunden.map((d) => {
            const anteil =
              d.schwellenwert_stunden > 0
                ? Math.min(100, (d.summe_stunden / d.schwellenwert_stunden) * 100)
                : 0;
            return (
              <div key={d.funktion_id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>{d.funktion_name}</span>
                  <span className="text-mute">
                    {d.summe_stunden}
                    {d.schwellenwert_stunden > 0 ? ` / ${d.schwellenwert_stunden}` : ""} h
                  </span>
                </div>
                {d.schwellenwert_stunden > 0 && (
                  <div style={{ height: 8, borderRadius: 4, background: "var(--farbe-rand)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${anteil}%`,
                        height: "100%",
                        background: d.schwellenwert_ueberschritten ? "#2e7d32" : "var(--farbe-primaer)",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {uebersicht.letzte_einsaetze.length > 0 && (
        <div className="karte">
          <h3 style={{ marginTop: 0 }}>Letzte Einsätze</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {uebersicht.letzte_einsaetze.map((e) => (
              <li key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--farbe-rand)" }}>
                <span>{e.titel}</span>
                <span className="text-mute">{new Date(e.zeitpunkt).toLocaleDateString("de-DE")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function MeinProfilKarte({ profil, onAktualisiert }: { profil: MeinProfil; onAktualisiert: (p: MeinProfil) => void }) {
  const [email, setEmail] = useState(profil.email ?? "");
  const [passwort, setPasswort] = useState("");
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function emailSpeichern(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setMeldung(null);
    try {
      onAktualisiert(await aktualisiereMeinProfil({ email: email.trim() || null }));
      setMeldung("Gespeichert.");
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    }
  }

  async function benachrichtigungenUmschalten(aktiv: boolean) {
    setFehler(null);
    setMeldung(null);
    try {
      onAktualisiert(await aktualisiereMeinProfil({ benachrichtigungen_aktiv: aktiv }));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Speichern fehlgeschlagen.");
    }
  }

  async function passwortSpeichern(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setMeldung(null);
    if (passwort.length < 8) {
      setFehler("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    try {
      await setzeMeinPasswort(passwort);
      setPasswort("");
      setMeldung("Passwort geändert.");
      onAktualisiert({ ...profil, passwort_gesetzt: true });
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : "Passwort konnte nicht geändert werden.");
    }
  }

  return (
    <div className="karte">
      <h3 style={{ marginTop: 0 }}>Mein Profil</h3>

      <form onSubmit={emailSpeichern}>
        <div className="formular-feld">
          <label htmlFor="profil-email">E-Mail-Adresse</label>
          <input
            id="profil-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <button type="submit" className="sekundaer">E-Mail speichern</button>
      </form>

      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0" }}>
        <input
          type="checkbox"
          checked={profil.benachrichtigungen_aktiv}
          onChange={(e) => benachrichtigungenUmschalten(e.target.checked)}
        />
        Benachrichtigungen per E-Mail erhalten
      </label>

      <form onSubmit={passwortSpeichern}>
        <div className="formular-feld">
          <label htmlFor="profil-passwort">
            {profil.passwort_gesetzt ? "Neues Passwort" : "Passwort festlegen"}
          </label>
          <input
            id="profil-passwort"
            type="password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            autoComplete="new-password"
            placeholder="mindestens 8 Zeichen"
          />
        </div>
        <button type="submit" className="sekundaer">Passwort speichern</button>
      </form>

      {meldung && <p style={{ color: "#2e7d32", marginTop: 8 }}>{meldung}</p>}
      {fehler && <Fehlertext style={{ marginTop: 8 }}>{fehler}</Fehlertext>}
    </div>
  );
}

export function MitgliedHub() {
  const navigate = useNavigate();
  const { angezeigterName, mitgliedAbmelden } = useAuth();
  const { config } = useConfig();
  const [profil, setProfil] = useState<MeinProfil | null>(null);
  const [uebersicht, setUebersicht] = useState<MitgliedUebersicht | null>(null);

  useEffect(() => {
    if (!angezeigterName) return;
    let abbruch = false;
    holeMeinProfil()
      .then((p) => {
        if (!abbruch) setProfil(p);
      })
      .catch(() => {});
    holeMitgliedUebersicht()
      .then((u) => {
        if (!abbruch) setUebersicht(u);
      })
      .catch(() => {});
    return () => {
      abbruch = true;
    };
  }, [angezeigterName]);

  const sichtbar = MODULE.filter(
    (m) => (config as Record<string, unknown> | null)?.[m.aktivKey] && (config as Record<string, unknown> | null)?.[m.aussenKey]
  );

  async function abmelden() {
    await mitgliedAbmelden();
    navigate("/");
  }

  return (
    <div className="mitglied-hub">
      {angezeigterName && (
        <div className="mitglied-profil">
          {profil?.bild_url ? (
            <img src={profil.bild_url} alt={angezeigterName} className="mitglied-avatar mitglied-avatar-bild" />
          ) : (
            <div className="mitglied-avatar">{initialen(angezeigterName)}</div>
          )}
          <div className="mitglied-profil-name">{angezeigterName}</div>
          <button type="button" className="mitglied-abmelden-link" onClick={abmelden}>
            Abmelden
          </button>
        </div>
      )}

      {profil?.gruppenfuehrer_rolle && (
        <button type="button" className="karte" onClick={() => navigate("/gruppenfuehrer")}>
          <strong>
            {profil.gruppenfuehrer_rolle === "admin"
              ? "Zum Admin-Bereich"
              : "Zum Gruppenführer-Bereich"}
          </strong>
        </button>
      )}

      {angezeigterName && (
        <>
          <InstallPrompt />
          <PushAktivierung />
          {uebersicht && <StatBereich uebersicht={uebersicht} />}
          {profil && <MeinProfilKarte profil={profil} onAktualisiert={setProfil} />}
        </>
      )}

      {sichtbar.length === 0 ? (
        !angezeigterName && (
          <p className="text-mute">
            Aktuell sind keine Module für den Mitglieder-Login freigegeben. Bitte den Admin ansprechen.
          </p>
        )
      ) : (
        <>
          <h2 className="mitglied-frage">{angezeigterName ? "Aktionen" : "Was möchtest du machen?"}</h2>
          <div className="mitglied-grid">
            {sichtbar.map((m) => (
              <button
                key={m.route}
                type="button"
                className="mitglied-tile"
                onClick={() => navigate(m.route, { state: { mitgliedModus: true } })}
              >
                <span className="mitglied-tile-icon">{KACHEL_ICONS[m.key]}</span>
                <span className="mitglied-tile-label">{m.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
