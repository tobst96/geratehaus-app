import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./ToastContext";

function TestKnopf() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.erfolg("Gespeichert")}>erfolg</button>
      <button onClick={() => toast.fehler("Kaputt")}>fehler</button>
    </>
  );
}

describe("ToastContext", () => {
  it("zeigt einen Erfolgs-Toast mit role=status", async () => {
    render(
      <ToastProvider>
        <TestKnopf />
      </ToastProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "erfolg" }));
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
  });

  it("zeigt einen Fehler-Toast mit role=alert", async () => {
    render(
      <ToastProvider>
        <TestKnopf />
      </ToastProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "fehler" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Kaputt");
  });

  it("lässt sich per Schließen-Button entfernen", async () => {
    render(
      <ToastProvider>
        <TestKnopf />
      </ToastProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "erfolg" }));
    expect(screen.getByRole("status")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
