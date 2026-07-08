import * as Sentry from "@sentry/react";
import type { OeffentlicheKonfiguration } from "./api/types";

let initialisiert = false;

/**
 * Initialisiert das Frontend-Fehler-Monitoring (Sentry) anhand der öffentlichen
 * Konfiguration. Sendet nur, wenn die Instanz zugestimmt hat
 * (`fehlerberichte_aktiv` + vorhandene DSN). Performance-Tracing ist aktiv;
 * **Session Replay** wird bewusst **nur in der Beta-Umgebung** eingeschaltet
 * (nimmt Nutzer-Interaktionen auf – in der Produktion aus Datenschutzgründen aus).
 * Idempotent: mehrfacher Aufruf initialisiert nur einmal.
 */
export function sentryInitialisieren(config: OeffentlicheKonfiguration): void {
  if (initialisiert) return;
  if (!config.fehlerberichte_aktiv || !config.sentry_dsn) return;
  initialisiert = true;

  const istBeta = config.sentry_environment === "beta";

  const integrations = [Sentry.browserTracingIntegration()];
  if (istBeta) {
    // Session Replay nur in der Beta. Text maskiert und Medien blockiert, damit
    // keine personenbezogenen Inhalte (Namen, PINs) im Replay landen.
    integrations.push(
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })
    );
  }

  Sentry.init({
    dsn: config.sentry_dsn,
    environment: config.sentry_environment,
    integrations,
    // Kein PII (IP-Adressen etc.) senden.
    sendDefaultPii: false,
    tracesSampleRate: 0.15,
    // Replay-Sampling nur in der Beta > 0; in der Produktion komplett aus.
    replaysSessionSampleRate: istBeta ? 0.1 : 0,
    replaysOnErrorSampleRate: istBeta ? 1.0 : 0,
  });
}
