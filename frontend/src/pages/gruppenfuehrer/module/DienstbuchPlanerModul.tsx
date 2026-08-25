import { Fehlertext } from "../../../components/Fehlertext";
import { FarbAuswahl } from "../../../components/FarbAuswahl";
import { Ladeanzeige } from "../../../components/Ladeanzeige";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  aktualisiereKategorie,
  aktualisiereVorlage,
  loescheVorlage,
  holeBundeslaender,
  holeFeiertage,
  holeKategorien,
  holeVorlagen,
  legeFeiertagAn,
  legeKategorieAn,
  legeVorlageAn,
  loescheFeiertag,
  seedeFeiertage,
} from "../../../api/dienstbuchPlaner";
import { holeEinstellungen, schreibeEinstellungen } from "../../../api/gruppenfuehrer";
import { ApiError } from "../../../api/client";
import type {
  FeiertagOut,
  PlanerKategorieOut,
  PlanVorlageOut,
  PlanWiederholungstyp,
} from "../../../api/types";
import { texte } from "../../../i18n/texte";

const t = texte.dienstbuch_planer;

const WIEDERHOLUNGSTYPEN: PlanWiederholungstyp[] = [
  "jaehrlich",
  "monatlich",
  "alle_x_tage",
  "alle_x_wochen",
  "alle_x_monate",
  "alle_x_jahre",
];

const WIEDERHOLUNGSTYP_LABEL: Record<PlanWiederholungstyp, string> = {
  jaehrlich: t.wiederholungstyp_jaehrlich,
  monatlich: t.wiederholungstyp_monatlich,
  alle_x_tage: t.wiederholungstyp_alle_x_tage,
  alle_x_wochen: t.wiederholungstyp_alle_x_wochen,
  alle_x_monate: t.wiederholungstyp_alle_x_monate,
  alle_x_jahre: t.wiederholungstyp_alle_x_jahre,
};

const WOCHENTAG_LABEL = [
  t.wochentag_0,
  t.wochentag_1,
  t.wochentag_2,
  t.wochentag_3,
  t.wochentag_4,
  t.wochentag_5,
  t.wochentag_6,
];

const INTERVALL_TYPEN = new Set<PlanWiederholungstyp>([
  "alle_x_tage",
  "alle_x_wochen",
  "alle_x_monate",
  "alle_x_jahre",
]);

function heuteIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Gut unterscheidbare, kräftige Farben für neue Kategorien - bewusst kuratiert
// statt reinem Zufalls-RGB (das ergibt oft unschöne/schwer lesbare Töne).
const FARB_PALETTE = [
  "#3B82F6", // Blau
  "#EF4444", // Rot
  "#22C55E", // Grün
  "#F59E0B", // Orange
  "#A855F7", // Violett
  "#06B6D4", // Türkis
  "#EC4899", // Pink
  "#84CC16", // Limette
  "#F97316", // Dunkelorange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#EAB308", // Gelb
];

function hslZuHex(h: number, s: number, l: number): string {
  const sPct = s / 100;
  const lPct = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sPct * Math.min(lPct, 1 - lPct);
  const f = (n: number) => lPct - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (n: number) => Math.round(f(n) * 255).toString(16).padStart(2, "0");
  return `#${hex(0)}${hex(8)}${hex(4)}`.toUpperCase();
}

/** Zufällige Farbe für eine neue Kategorie, die sich von den bereits
 * vorhandenen unterscheidet - solange die kuratierte Palette reicht daraus,
 * sonst ein zufälliger, kräftiger HSL-Ton. */
function zufallsFarbe(vorhandene: string[]): string {
  const belegt = new Set(vorhandene.map((f) => f.toLowerCase()));
  const frei = FARB_PALETTE.filter((f) => !belegt.has(f.toLowerCase()));
  if (frei.length > 0) return frei[Math.floor(Math.random() * frei.length)];
  return hslZuHex(Math.floor(Math.random() * 360), 65, 50);
}

export function DienstbuchPlanerModul() {
  const [kategorien, setKategorien] = useState<PlanerKategorieOut[] | null>(null);
  const [vorlagen, setVorlagen] = useState<PlanVorlageOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const [neueKategorieName, setNeueKategorieName] = useState("");
  const [neueKategorieFarbe, setNeueKategorieFarbe] = useState("#3B82F6");

  // Feiertage (Phase 2) + Divera-Standard-Erinnerung (Phase 4)
  const [bundeslaender, setBundeslaender] = useState<Record<string, string>>({});
  const [bundesland, setBundesland] = useState("");
  const [diveraErinnerung, setDiveraErinnerung] = useState(0);
  const [einstellungenGespeichert, setEinstellungenGespeichert] = useState(false);
  const [feiertage, setFeiertage] = useState<FeiertagOut[]>([]);
  const feiertagsJahr = new Date().getFullYear();
  const [neuerFeiertagDatum, setNeuerFeiertagDatum] = useState("");
  const [neuerFeiertagName, setNeuerFeiertagName] = useState("");

  const [neuTitel, setNeuTitel] = useState("");
  const [neuTyp, setNeuTyp] = useState<PlanWiederholungstyp>("jaehrlich");
  const [neuIntervall, setNeuIntervall] = useState(1);
  const [neuWochentag, setNeuWochentag] = useState<number | "">("");
  const [neuKw, setNeuKw] = useState<number | "">("");
  const [neuParitaet, setNeuParitaet] = useState<"" | "gerade" | "ungerade">("");
  const [neuStart, setNeuStart] = useState(heuteIso());
  const [neuEnde, setNeuEnde] = useState("");
  const [neuUhrzeit, setNeuUhrzeit] = useState("");
  const [neuEndzeit, setNeuEndzeit] = useState("");
  const [neuMindestAktiv, setNeuMindestAktiv] = useState(false);
  const [neuMindestTage, setNeuMindestTage] = useState(180);
  const [neuKategorieIds, setNeuKategorieIds] = useState<number[]>([]);
  const [speichertVorlage, setSpeichertVorlage] = useState(false);

  async function laden() {
    try {
      const [k, v] = await Promise.all([holeKategorien(), holeVorlagen()]);
      setKategorien(k);
      setVorlagen(v);
      // Nächste neu angelegte Kategorie bekommt automatisch eine Farbe, die
      // sich von den bereits vorhandenen unterscheidet.
      setNeueKategorieFarbe(zufallsFarbe(k.map((kat) => kat.farbe)));
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_laden);
    }
  }

  useEffect(() => {
    laden();
    holeBundeslaender().then(setBundeslaender).catch(() => setBundeslaender({}));
    holeFeiertage(feiertagsJahr).then(setFeiertage).catch(() => setFeiertage([]));
    holeEinstellungen()
      .then((w) => {
        setBundesland(String(w.dienstbuch_planer_bundesland ?? ""));
        setDiveraErinnerung(Number(w.dienstbuch_planer_divera_erinnerung_minuten ?? 0));
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function einstellungenSpeichern() {
    setEinstellungenGespeichert(false);
    await schreibeEinstellungen({
      dienstbuch_planer_bundesland: bundesland,
      dienstbuch_planer_divera_erinnerung_minuten: diveraErinnerung,
    });
    // Bundesland-Wechsel: gesetzliche Feiertage für dieses + nächstes Jahr neu
    // aufbauen (manuelle bleiben unberührt).
    await seedeFeiertage(feiertagsJahr);
    await seedeFeiertage(feiertagsJahr + 1);
    setEinstellungenGespeichert(true);
    setFeiertage(await holeFeiertage(feiertagsJahr));
  }

  async function feiertagAnlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuerFeiertagDatum || !neuerFeiertagName.trim()) return;
    await legeFeiertagAn(neuerFeiertagDatum, neuerFeiertagName.trim());
    setNeuerFeiertagDatum("");
    setNeuerFeiertagName("");
    setFeiertage(await holeFeiertage(feiertagsJahr));
  }

  async function feiertagEntfernen(id: number) {
    await loescheFeiertag(id);
    setFeiertage(await holeFeiertage(feiertagsJahr));
  }

  async function kategorieAnlegen(e: FormEvent) {
    e.preventDefault();
    if (!neueKategorieName.trim()) return;
    await legeKategorieAn({ name: neueKategorieName.trim(), farbe: neueKategorieFarbe });
    setNeueKategorieName("");
    await laden();
  }

  async function kategorieAktivAendern(k: PlanerKategorieOut, wert: boolean) {
    await aktualisiereKategorie(k.id, { aktiv: wert });
    await laden();
  }

  function kategorieAuswahlUmschalten(id: number) {
    setNeuKategorieIds((vorher) => (vorher.includes(id) ? vorher.filter((x) => x !== id) : [...vorher, id]));
  }

  async function vorlageAnlegen(e: FormEvent) {
    e.preventDefault();
    if (!neuTitel.trim()) return;
    setSpeichertVorlage(true);
    setFehler(null);
    try {
      await legeVorlageAn({
        titel: neuTitel.trim(),
        wiederholungstyp: neuTyp,
        intervall: INTERVALL_TYPEN.has(neuTyp) ? neuIntervall : null,
        wochentag: neuWochentag === "" ? null : Number(neuWochentag),
        kalenderwoche: neuTyp === "jaehrlich" && neuKw !== "" ? Number(neuKw) : null,
        // Bei "jedes Jahr" legt die Kalenderwoche die Parität bereits eindeutig
        // fest - eine (womöglich widersprüchliche) Auswahl hier nicht mitsenden,
        // sonst lehnt der Server die Vorlage mit 400 ab.
        kw_paritaet: neuTyp === "jaehrlich" || neuParitaet === "" ? null : neuParitaet,
        mindest_intervall_aktiv: neuMindestAktiv,
        mindest_intervall_tage: neuMindestAktiv ? neuMindestTage : null,
        startdatum: neuStart,
        enddatum: neuEnde || null,
        uhrzeit: neuUhrzeit ? `${neuUhrzeit}:00` : null,
        endzeit: neuUhrzeit && neuEndzeit ? `${neuEndzeit}:00` : null,
        kategorie_ids: neuKategorieIds,
      });
      setNeuTitel("");
      setNeuKw("");
      setNeuWochentag("");
      setNeuParitaet("");
      setNeuKategorieIds([]);
      await laden();
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_speichern);
    } finally {
      setSpeichertVorlage(false);
    }
  }

  async function vorlageAktivAendern(v: PlanVorlageOut, wert: boolean) {
    await aktualisiereVorlage(v.id, { aktiv: wert });
    await laden();
  }

  async function vorlageLoeschen(v: PlanVorlageOut) {
    if (!window.confirm(`Vorlage „${v.titel}“ endgültig löschen? Bereits erzeugte Termine bleiben erhalten.`)) return;
    await loescheVorlage(v.id);
    await laden();
  }

  if (fehler && !kategorien) return <Fehlertext>{fehler}</Fehlertext>;
  if (!kategorien || !vorlagen) return <Ladeanzeige />;

  return (
    <div>
      <p>
        <Link to="/gruppenfuehrer/module">{t.zurueck}</Link>
      </p>
      <h1>{t.titel}</h1>
      {fehler && <Fehlertext>{fehler}</Fehlertext>}

      <div className="karte">
        <h2>Feiertage &amp; Divera</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="formular-feld">
            <label htmlFor="planer-bundesland">Bundesland (Feiertage im Kalender)</label>
            <select
              id="planer-bundesland"
              value={bundesland}
              onChange={(e) => setBundesland(e.target.value)}
            >
              <option value="">– nur bundesweite Feiertage –</option>
              {Object.entries(bundeslaender).map(([kuerzel, name]) => (
                <option key={kuerzel} value={kuerzel}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="formular-feld">
            <label htmlFor="planer-divera-erinnerung">
              Divera: Standard-Erinnerung (Minuten vorher, 0 = keine)
            </label>
            <input
              id="planer-divera-erinnerung"
              type="number"
              min={0}
              value={diveraErinnerung}
              onChange={(e) => setDiveraErinnerung(Number(e.target.value))}
            />
          </div>
          <button onClick={einstellungenSpeichern}>Speichern</button>
          {einstellungenGespeichert && <span>✓ gespeichert</span>}
        </div>

        <h3 style={{ marginTop: 16 }}>Eigene Feiertage/Blockiertage</h3>
        <p className="hinweistext">
          Die gesetzlichen Feiertage werden einmalig beim Start aus dem Regelwerk übernommen und sind
          danach wie eigene Einträge frei löschbar. Beim Speichern eines anderen Bundeslands werden
          sie neu aufgebaut (eigene Einträge bleiben erhalten).
        </p>
        <form onSubmit={feiertagAnlegen} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            type="date"
            value={neuerFeiertagDatum}
            onChange={(e) => setNeuerFeiertagDatum(e.target.value)}
            aria-label="Datum des Feiertags"
          />
          <input
            placeholder="Bezeichnung, z. B. Stadtfest"
            value={neuerFeiertagName}
            onChange={(e) => setNeuerFeiertagName(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <button type="submit">Anlegen</button>
        </form>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 220, overflowY: "auto" }}>
          {feiertage.map((f) => (
            <li key={`${f.datum}-${f.name}`} style={{ display: "flex", gap: 8, alignItems: "center", padding: "2px 0" }}>
              <span style={{ minWidth: 90 }}>{f.datum}</span>
              <span style={{ flex: 1 }}>
                {f.name}
                {f.quelle === "regel" && (
                  <span className="text-mute" style={{ fontSize: "0.8rem" }}> (gesetzlich)</span>
                )}
              </span>
              {f.id != null && (
                <button className="sekundaer" onClick={() => feiertagEntfernen(f.id as number)}>
                  {t.loeschen}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="karte">
        <h2>{t.kategorien_titel}</h2>
        <p className="hinweistext">{t.kategorien_hinweis}</p>
        <form onSubmit={kategorieAnlegen} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input
            placeholder={t.kategorie_name_platzhalter}
            value={neueKategorieName}
            onChange={(e) => setNeueKategorieName(e.target.value)}
          />
          <FarbAuswahl wert={neueKategorieFarbe} onChange={setNeueKategorieFarbe} />
          <button type="submit">{t.anlegen}</button>
        </form>
        <div className="tabelle-scroll">
          <table>
            <thead>
              <tr>
                <th>{t.kategorie_name_platzhalter.replace("Neue Kategorie, z. B. ", "")}</th>
                <th>{t.aktiv}</th>
              </tr>
            </thead>
            <tbody>
              {kategorien.map((k) => (
                <tr key={k.id}>
                  <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: k.farbe,
                      }}
                    />
                    {k.name}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={k.aktiv}
                      onChange={(e) => kategorieAktivAendern(k, e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="karte">
        <h2>{t.vorlagen_titel}</h2>
        <p className="hinweistext">{t.vorlagen_hinweis}</p>

        <form onSubmit={vorlageAnlegen} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <div className="formular-feld">
            <label htmlFor="plan-titel">{t.feld_titel}</label>
            <input id="plan-titel" value={neuTitel} onChange={(e) => setNeuTitel(e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="formular-feld">
              <label htmlFor="plan-typ">{t.feld_wiederholungstyp}</label>
              <select
                id="plan-typ"
                value={neuTyp}
                onChange={(e) => setNeuTyp(e.target.value as PlanWiederholungstyp)}
              >
                {WIEDERHOLUNGSTYPEN.map((typ) => (
                  <option key={typ} value={typ}>
                    {WIEDERHOLUNGSTYP_LABEL[typ]}
                  </option>
                ))}
              </select>
            </div>

            {INTERVALL_TYPEN.has(neuTyp) && (
              <div className="formular-feld">
                <label htmlFor="plan-intervall">{t.feld_intervall}</label>
                <input
                  id="plan-intervall"
                  type="number"
                  min={1}
                  value={neuIntervall}
                  onChange={(e) => setNeuIntervall(Number(e.target.value))}
                />
              </div>
            )}

            <div className="formular-feld">
              <label htmlFor="plan-wochentag">{t.feld_wochentag}</label>
              <select
                id="plan-wochentag"
                value={neuWochentag}
                onChange={(e) => setNeuWochentag(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">{t.feld_wochentag_beliebig}</option>
                {WOCHENTAG_LABEL.map((label, index) => (
                  <option key={index} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {neuTyp === "jaehrlich" && (
              <div className="formular-feld">
                <label htmlFor="plan-kw">{t.feld_kalenderwoche}</label>
                <input
                  id="plan-kw"
                  type="number"
                  min={1}
                  max={53}
                  value={neuKw}
                  onChange={(e) => setNeuKw(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            )}

            {/* Bei "jedes Jahr" ist die Parität durch die Kalenderwoche bereits
                festgelegt (KW 5 ist immer ungerade) - Auswahl dort ausblenden,
                sonst entstehen widersprüchliche, vom Server abgelehnte Regeln. */}
            {neuTyp !== "jaehrlich" && (
              <div className="formular-feld">
                <label htmlFor="plan-paritaet">{t.feld_kw_paritaet}</label>
                <select
                  id="plan-paritaet"
                  value={neuParitaet}
                  onChange={(e) => setNeuParitaet(e.target.value as "" | "gerade" | "ungerade")}
                >
                  <option value="">{t.feld_kw_paritaet_keine}</option>
                  <option value="gerade">{t.feld_kw_paritaet_gerade}</option>
                  <option value="ungerade">{t.feld_kw_paritaet_ungerade}</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="formular-feld">
              <label htmlFor="plan-start">{t.feld_startdatum}</label>
              <input id="plan-start" type="date" value={neuStart} onChange={(e) => setNeuStart(e.target.value)} />
            </div>
            <div className="formular-feld">
              <label htmlFor="plan-ende">{t.feld_enddatum}</label>
              <input id="plan-ende" type="date" value={neuEnde} onChange={(e) => setNeuEnde(e.target.value)} />
            </div>
            <div className="formular-feld">
              <label htmlFor="plan-uhrzeit">Beginn (optional)</label>
              <input
                id="plan-uhrzeit"
                type="time"
                value={neuUhrzeit}
                onChange={(e) => setNeuUhrzeit(e.target.value)}
              />
            </div>
            <div className="formular-feld">
              <label htmlFor="plan-endzeit">Ende (optional)</label>
              <input
                id="plan-endzeit"
                type="time"
                value={neuEndzeit}
                onChange={(e) => setNeuEndzeit(e.target.value)}
                disabled={!neuUhrzeit}
              />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={neuMindestAktiv}
              onChange={(e) => setNeuMindestAktiv(e.target.checked)}
            />
            {t.feld_mindest_intervall_aktiv}
          </label>
          {neuMindestAktiv && (
            <div className="formular-feld">
              <label htmlFor="plan-mindest-tage">{t.feld_mindest_intervall_tage}</label>
              <input
                id="plan-mindest-tage"
                type="number"
                min={1}
                value={neuMindestTage}
                onChange={(e) => setNeuMindestTage(Number(e.target.value))}
              />
            </div>
          )}

          {kategorien.length > 0 && (
            <div>
              <p style={{ margin: "4px 0" }}>{t.feld_kategorien}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {kategorien.map((k) => (
                  <label key={k.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={neuKategorieIds.includes(k.id)}
                      onChange={() => kategorieAuswahlUmschalten(k.id)}
                    />
                    {k.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <button type="submit" disabled={speichertVorlage}>
              {t.anlegen}
            </button>
          </div>
        </form>

        <div className="tabelle-scroll">
          <table>
            <thead>
              <tr>
                <th>{t.feld_titel}</th>
                <th>{t.feld_wiederholungstyp}</th>
                <th>{t.aktiv}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vorlagen.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.titel}
                    {!v.aktiv && <span className="text-mute"> ({t.deaktiviert_badge})</span>}
                  </td>
                  <td>{WIEDERHOLUNGSTYP_LABEL[v.wiederholungstyp]}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={v.aktiv}
                      onChange={(e) => vorlageAktivAendern(v, e.target.checked)}
                    />
                  </td>
                  <td>
                    <button className="sekundaer" onClick={() => vorlageLoeschen(v)}>
                      {t.loeschen}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
