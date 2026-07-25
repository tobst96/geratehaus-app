import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const holeVapidPublicKey = vi.fn();
const pushSubscribe = vi.fn();
const pushUnsubscribe = vi.fn();
vi.mock("../api/push", () => ({
  holeVapidPublicKey: (...a: unknown[]) => holeVapidPublicKey(...a),
  pushSubscribe: (...a: unknown[]) => pushSubscribe(...a),
  pushUnsubscribe: (...a: unknown[]) => pushUnsubscribe(...a),
}));

vi.mock("../utils/webpush", () => ({
  pushWirdUnterstuetzt: () => true,
  urlBase64ToUint8Array: () => new Uint8Array([1, 2, 3]),
}));

import { PushAktivierung } from "./PushAktivierung";

const fakeSub = { toJSON: () => ({ endpoint: "https://push.example/abc", keys: { p256dh: "P", auth: "A" } }) };

let subscribe: ReturnType<typeof vi.fn>;
let getSubscription: ReturnType<typeof vi.fn>;

beforeEach(() => {
  holeVapidPublicKey.mockReset().mockResolvedValue({ public_key: "KEY" });
  pushSubscribe.mockReset().mockResolvedValue(undefined);
  pushUnsubscribe.mockReset().mockResolvedValue(undefined);
  subscribe = vi.fn();
  getSubscription = vi.fn();
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: { subscribe, getSubscription } }) },
  });
  vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("granted") });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PushAktivierung", () => {
  it("abonniert erfolgreich und meldet das Abo ans Backend", async () => {
    getSubscription.mockResolvedValue(null);
    subscribe.mockResolvedValue(fakeSub);
    const user = userEvent.setup();
    render(<PushAktivierung />);

    await user.click(await screen.findByRole("button", { name: "Push aktivieren" }));

    await waitFor(() =>
      expect(pushSubscribe).toHaveBeenCalledWith({
        endpoint: "https://push.example/abc",
        keys: { p256dh: "P", auth: "A" },
      }),
    );
    expect(await screen.findByText("Dieses Gerät erhält Push-Benachrichtigungen.")).toBeInTheDocument();
  });

  it("meldet ein altes Abo ab und abonniert neu, wenn subscribe mit InvalidStateError abbricht", async () => {
    // Mount: kein Abo; im Retry: altes Abo mit abweichendem Schlüssel vorhanden.
    const altesAbo = { unsubscribe: vi.fn().mockResolvedValue(true) };
    getSubscription.mockResolvedValueOnce(null).mockResolvedValueOnce(altesAbo);
    const invalid = new Error("A subscription with a different applicationServerKey already exists");
    invalid.name = "InvalidStateError";
    subscribe.mockRejectedValueOnce(invalid).mockResolvedValueOnce(fakeSub);

    const user = userEvent.setup();
    render(<PushAktivierung />);
    await user.click(await screen.findByRole("button", { name: "Push aktivieren" }));

    await waitFor(() => expect(pushSubscribe).toHaveBeenCalledTimes(1));
    expect(altesAbo.unsubscribe).toHaveBeenCalled();
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Dieses Gerät erhält Push-Benachrichtigungen.")).toBeInTheDocument();
  });
});
