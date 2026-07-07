import { apiGet, apiPost } from "./client";

export interface VapidPublicKey {
  public_key: string;
}

export const holeVapidPublicKey = () => apiGet<VapidPublicKey>("/push/vapid-public-key");

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const pushSubscribe = (daten: PushSubscriptionPayload) =>
  apiPost<void>("/push/subscribe", daten);

// Das Backend erwartet den Endpoint als Query-Parameter (kein Body).
export const pushUnsubscribe = (endpoint: string) =>
  apiPost<void>("/push/unsubscribe", undefined, { endpoint });
