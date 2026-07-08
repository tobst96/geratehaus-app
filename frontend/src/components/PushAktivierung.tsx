import { Fehlertext } from "./Fehlertext";
import { useEffect, useState } from "react";
import { holeVapidPublicKey, pushSubscribe, pushUnsubscribe } from "../api/push";
import { pushWirdUnterstuetzt, urlBase64ToUint8Array } from "../utils/webpush";

/** „Push-Benachrichtigungen aktivieren"-Umschalter für dieses Gerät. Blendet sich
 * selbst aus, wenn Push nicht unterstützt wird (kein Secure Context / kein
 * VAPID-Schlüssel im Backend hinterlegt). Die Subscription ist gerätebezogen. */
export function PushAktivierung() {
  const [unterstuetzt] = useState(pushWirdUnterstuetzt());
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [abonniert, setAbonniert] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    if (!unterstuetzt) {
      setBereit(true);
      return;
    }
    let abbruch = false;
    (async () => {
      try {
        const { public_key } = await holeVapidPublicKey();
        if (abbruch) return;
        setVapidKey(public_key || null);
        if (public_key) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (!abbruch) setAbonniert(sub !== null);
        }
      } catch {
        /* Bei Fehler bleibt die Option einfach verborgen. */
      } finally {
        if (!abbruch) setBereit(true);
      }
    })();
    return () => {
      abbruch = true;
    };
  }, [unterstuetzt]);

  async function aktivieren() {
    setLaedt(true);
    setFehler(null);
    try {
      const erlaubnis = await Notification.requestPermission();
      if (erlaubnis !== "granted") {
        setFehler("Benachrichtigungen wurden im Browser nicht erlaubt.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast: der Laufzeitwert ist eine gültige BufferSource; die lib.dom-Typen
        // verlangen seit TS 5.7 ArrayBuffer-basierte Views (nicht ArrayBufferLike).
        applicationServerKey: urlBase64ToUint8Array(vapidKey!) as BufferSource,
      });
      const json = sub.toJSON();
      await pushSubscribe({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setAbonniert(true);
    } catch {
      setFehler("Aktivieren fehlgeschlagen.");
    } finally {
      setLaedt(false);
    }
  }

  async function deaktivieren() {
    setLaedt(true);
    setFehler(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushUnsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setAbonniert(false);
    } catch {
      setFehler("Deaktivieren fehlgeschlagen.");
    } finally {
      setLaedt(false);
    }
  }

  // Vor dem ersten Laden, ohne Unterstützung oder ohne konfigurierten Schlüssel:
  // nichts anzeigen (Option ausblenden statt einen toten Button zu zeigen).
  if (!bereit || !unterstuetzt || !vapidKey) return null;

  return (
    <div className="karte" style={{ marginTop: 16, textAlign: "center" }}>
      <p style={{ margin: "0 0 8px", color: "var(--farbe-text-mute)", fontSize: "0.9rem" }}>
        {abonniert
          ? "Dieses Gerät erhält Push-Benachrichtigungen."
          : "Push-Benachrichtigungen auf diesem Gerät aktivieren."}
      </p>
      <button
        type="button"
        className={abonniert ? "sekundaer" : undefined}
        onClick={abonniert ? deaktivieren : aktivieren}
        disabled={laedt}
      >
        {laedt ? "Bitte warten …" : abonniert ? "Push deaktivieren" : "Push aktivieren"}
      </button>
      {fehler && <Fehlertext style={{ marginTop: 8 }}>{fehler}</Fehlertext>}
    </div>
  );
}
