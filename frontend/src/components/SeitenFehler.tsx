/** Einheitlicher, seitenfüllender Fehlerzustand. Ersetzt die früher verstreuten
 * `<div style={{ color: "red" }}>Fehler: …</div>`-Blöcke: konsistente, dark-mode-
 * taugliche Darstellung (CSS-Variablen statt hartem Rot) plus optionalem
 * „Erneut versuchen"-Button. */
export function SeitenFehler({ nachricht, onRetry }: { nachricht: string; onRetry?: () => void }) {
  return (
    <div className="seiten-fehler" role="alert">
      <p className="seiten-fehler-text">{nachricht}</p>
      {onRetry && (
        <button type="button" className="sekundaer" onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
