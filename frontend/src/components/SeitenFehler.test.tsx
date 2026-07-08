import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeitenFehler } from "./SeitenFehler";

describe("SeitenFehler", () => {
  it("zeigt die Fehlermeldung als Alert", () => {
    render(<SeitenFehler nachricht="Etwas ging schief" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Etwas ging schief");
  });

  it("zeigt keinen Retry-Button ohne onRetry", () => {
    render(<SeitenFehler nachricht="x" />);
    expect(screen.queryByRole("button", { name: /erneut versuchen/i })).toBeNull();
  });

  it("ruft onRetry beim Klick auf den Retry-Button", async () => {
    const onRetry = vi.fn();
    render(<SeitenFehler nachricht="x" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /erneut versuchen/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
