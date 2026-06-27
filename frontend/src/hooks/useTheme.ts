import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const SPEICHER_SCHLUESSEL = "geraetehaus-theme";

function systemPraeferenz(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function gespeichertePraeferenz(): Theme | null {
  const wert = localStorage.getItem(SPEICHER_SCHLUESSEL);
  return wert === "light" || wert === "dark" ? wert : null;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => gespeichertePraeferenz() ?? systemPraeferenz());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Solange keine manuelle Wahl gespeichert ist, der System-Präferenz folgen.
  useEffect(() => {
    if (gespeichertePraeferenz() !== null) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handler(e: MediaQueryListEvent) {
      setTheme(e.matches ? "dark" : "light");
    }
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  function umschalten() {
    const neu: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(SPEICHER_SCHLUESSEL, neu);
    setTheme(neu);
  }

  return { theme, umschalten };
}
