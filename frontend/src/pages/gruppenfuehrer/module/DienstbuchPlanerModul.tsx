import { Fehlertext } from "../../../components/Fehlertext";
import { FarbAuswahl } from "../../../components/FarbAuswahl";
import { Ladeanzeige } from "../../../components/Ladeanzeige";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  aktualisiereKategorie,
  aktualisiereVorlage,
  deaktiviereVorlage,
  holeKategorien,
  holeVorlagen,
  legeKategorieAn,
  legeVorlageAn,
} from "../../../api/dienstbuchPlaner";
import { ApiError } from "../../../api/client";
import type { PlanerKategorieOut, PlanVorlageOut, PlanWiederholungstyp } from "../../../api/types";
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

export function DienstbuchPlanerModul() {
  const [kategorien, setKategorien] = useState<PlanerKategorieOut[] | null>(null);
  const [vorlagen, setVorlagen] = useState<PlanVorlageOut[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const [neueKategorieName, setNeueKategorieName] = useState("");
  const [neueKategorieFarbe, setNeueKategorieFarbe] = useState("#3B82F6");

  const [neuTitel, setNeuTitel] = useState("");
  const [neuTyp, setNeuTyp] = useState<PlanWiederholungstyp>("jaehrlich");
  const [neuIntervall, setNeuIntervall] = useState(1);
  const [neuWochentag, setNeuWochentag] = useState<number | "">("");
  const [neuKw, setNeuKw] = useState<number | "">("");
  const [neuParitaet, setNeuParitaet] = useState<"" | "gerade" | "ungerade">("");
  const [neuStart, setNeuStart] = useState(heuteIso());
  const [neuEnde, setNeuEnde] = useState("");
  const [neuMindestAktiv, setNeuMindestAktiv] = useState(false);
  const [neuMindestTage, setNeuMindestTage] = useState(180);
  const [neuKategorieIds, setNeuKategorieIds] = useState<number[]>([]);
  const [speichertVorlage, setSpeichertVorlage] = useState(false);

  async function laden() {
    try {
      const [k, v] = await Promise.all([holeKategorien(), holeVorlagen()]);
      setKategorien(k);
      setVorlagen(v);
    } catch (err) {
      setFehler(err instanceof ApiError ? String(err.detail) : t.fehler_laden);
    }
  }

  useEffect(() => {
    laden();
  }, []);

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
        kw_paritaet: neuParitaet === "" ? null : neuParitaet,
        mindest_intervall_aktiv: neuMindestAktiv,
        mindest_intervall_tage: neuMindestAktiv ? neuMindestTage : null,
        startdatum: neuStart,
        enddatum: neuEnde || null,
        kategorie_ids: neuKategorieIds,
      });
      setNeuTitel("");
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

  async function vorlageDeaktivieren(v: PlanVorlageOut) {
    await deaktiviereVorlage(v.id);
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
                    {v.aktiv && (
                      <button className="sekundaer" onClick={() => vorlageDeaktivieren(v)}>
                        {t.deaktivieren}
                      </button>
                    )}
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
