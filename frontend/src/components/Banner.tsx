import type { ReactNode } from "react";

interface BannerProps {
  art: "erfolg" | "fehler";
  children: ReactNode;
}

/** Erfolgs-/Fehlermeldung als abgesetzter Banner statt eines losen
 * <p>-Blocks, der den Layout-Fluss verschiebt. Ersetzt die bisher mehrfach
 * ad-hoc duplizierten Inline-Styles für Erfolgsmeldungen (z. B. in
 * PunkteEinstellungen.tsx, Einstellungen.tsx, NotifierEinstellungen.tsx). */
export function Banner({ art, children }: BannerProps) {
  return <p className={`banner banner-${art}`}>{art === "erfolg" ? "✓ " : ""}{children}</p>;
}
