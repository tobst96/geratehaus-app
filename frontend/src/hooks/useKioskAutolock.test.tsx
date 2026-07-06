import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
let sekunden = 1;
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: "/einsatztagebuch" }),
}));
vi.mock("../context/ConfigContext", () => ({
  useConfig: () => ({ config: { kiosk_autolock_sekunden: sekunden } }),
}));

import { useKioskAutolock } from "./useKioskAutolock";

describe("useKioskAutolock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigate.mockReset();
    localStorage.clear();
    sekunden = 1;
  });
  afterEach(() => vi.useRealTimers());

  it("springt nach Inaktivität zur Kiosk-Startseite", () => {
    localStorage.setItem("kiosk_token", "abc");
    renderHook(() => useKioskAutolock());
    act(() => vi.advanceTimersByTime(1100));
    expect(navigate).toHaveBeenCalledWith("/kiosk/abc");
  });

  it("tut nichts ohne Kiosk-Token", () => {
    renderHook(() => useKioskAutolock());
    act(() => vi.advanceTimersByTime(2000));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("tut nichts, wenn die Schwelle 0 ist", () => {
    localStorage.setItem("kiosk_token", "abc");
    sekunden = 0;
    renderHook(() => useKioskAutolock());
    act(() => vi.advanceTimersByTime(3000));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("setzt den Timer bei Aktivität zurück", () => {
    localStorage.setItem("kiosk_token", "abc");
    sekunden = 2;
    renderHook(() => useKioskAutolock());
    act(() => vi.advanceTimersByTime(1500)); // noch vor Ablauf
    act(() => window.dispatchEvent(new Event("keydown"))); // Aktivität → Timer neu
    act(() => vi.advanceTimersByTime(1500)); // wieder < 2s seit Reset
    expect(navigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000)); // jetzt > 2s seit Reset
    expect(navigate).toHaveBeenCalledWith("/kiosk/abc");
  });
});
