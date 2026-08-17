import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallPrompt } from "./InstallPrompt";

afterEach(() => vi.restoreAllMocks());

function beforeInstallEvent() {
  const ev = new Event("beforeinstallprompt") as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: string }>;
  };
  ev.prompt = vi.fn().mockResolvedValue(undefined);
  ev.userChoice = Promise.resolve({ outcome: "accepted" });
  return ev;
}

describe("InstallPrompt", () => {
  it("zeigt den Installieren-Button nach beforeinstallprompt und löst die Installation aus", async () => {
    const user = userEvent.setup();
    render(<InstallPrompt />);
    // Ohne Event zunächst kein Button.
    expect(screen.queryByRole("button", { name: "App installieren" })).toBeNull();

    const ev = beforeInstallEvent();
    act(() => {
      window.dispatchEvent(ev);
    });

    const btn = await screen.findByRole("button", { name: "App installieren" });
    await user.click(btn);
    expect(ev.prompt).toHaveBeenCalled();
    // Nach akzeptierter Installation verschwindet der Hinweis.
    await waitFor(() => expect(screen.queryByRole("button", { name: "App installieren" })).toBeNull());
  });

  it("zeigt auf iOS die manuelle Anleitung statt eines Buttons", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    render(<InstallPrompt />);
    expect(await screen.findByText(/Zum Home-Bildschirm/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "App installieren" })).toBeNull();
  });
});
