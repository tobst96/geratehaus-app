import { useRef } from "react";

/** Spielt einen kurzen Ton, wenn beim Scannen (Live-Vorschau via
 * barcodeVorschau()) eine Person erkannt bzw. nicht gefunden wurde – gibt
 * sofortes akustisches Feedback, ohne dass man auf den Bildschirm schauen
 * muss (wichtig am Kiosk, wo oft im Vorbeigehen gescannt wird). Audio-
 * Objekte werden einmal pro Komponente angelegt (nicht bei jedem Aufruf neu),
 * `currentTime = 0` erlaubt schnelles erneutes Abspielen bei aufeinander
 * folgenden Scans. Browser blockieren Sound ohne vorherige Nutzerinteraktion
 * nicht zuverlässig – play() wird daher bewusst mit .catch() abgesichert,
 * damit ein blockierter Ton nie einen Fehler in der Konsole/im Ablauf erzeugt. */
export function useBarcodeSound() {
  const erkanntRef = useRef<HTMLAudioElement | null>(null);
  const fehlerRef = useRef<HTMLAudioElement | null>(null);

  function audio(ref: { current: HTMLAudioElement | null }, datei: string): HTMLAudioElement {
    if (!ref.current) {
      ref.current = new Audio(datei);
    }
    return ref.current;
  }

  function spielen(ref: { current: HTMLAudioElement | null }, datei: string) {
    const element = audio(ref, datei);
    element.currentTime = 0;
    element.play().catch(() => {
      // Wiedergabe vom Browser blockiert (z. B. noch keine Nutzerinteraktion) – egal.
    });
  }

  return {
    spieleErkannt: () => spielen(erkanntRef, "/sounds/erkannt.wav"),
    spieleFehler: () => spielen(fehlerRef, "/sounds/fehler.wav"),
  };
}
