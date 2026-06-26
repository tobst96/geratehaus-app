export type KachelModulKey = "einsatzbericht" | "dienstbuch" | "dienststunden" | "fahrzeugbuchung";

export const KACHEL_ICONS: Record<KachelModulKey, JSX.Element> = {
  einsatzbericht: (
    <svg className="kiosk-tile-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32 6c-9.94 0-18 8.06-18 18v14H16a4 4 0 0 0 0 8h32a4 4 0 0 0 0-8h-2V24c0-9.94-8.06-18-18-18Z"
        fill="white"
      />
      <rect x="29" y="2" width="6" height="8" rx="2" fill="white" />
      <circle cx="32" cy="50" r="6" fill="white" />
      <path d="M32 16v14M25 23l14 14" stroke="var(--farbe-primaer)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  dienstbuch: (
    <svg className="kiosk-tile-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12a4 4 0 0 1 4-4h16v48H14a4 4 0 0 1-4-4V12Z" fill="white" />
      <path d="M54 12a4 4 0 0 0-4-4H34v48h16a4 4 0 0 0 4-4V12Z" fill="white" fillOpacity="0.8" />
      <path d="M32 8v48" stroke="var(--farbe-primaer)" strokeWidth="2" />
      <path d="M16 18h10M16 26h10M16 34h10" stroke="var(--farbe-primaer)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M38 18h10M38 26h10M38 34h10" stroke="var(--farbe-primaer)" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
    </svg>
  ),
  dienststunden: (
    <svg className="kiosk-tile-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="34" r="24" fill="white" />
      <path d="M24 6h16" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 18v16l11 7" stroke="var(--farbe-primaer)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  fahrzeugbuchung: (
    <svg className="kiosk-tile-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 38l4-14a6 6 0 0 1 5.7-4h28.6a6 6 0 0 1 5.7 4l4 14v12a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-2H18v2a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4Z"
        fill="white"
      />
      <circle cx="18" cy="40" r="4" fill="var(--farbe-primaer)" />
      <circle cx="46" cy="40" r="4" fill="var(--farbe-primaer)" />
    </svg>
  ),
};
