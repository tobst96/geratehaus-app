import type { CSSProperties, ReactNode } from "react";

/** Einheitlicher Inline-Fehlertext (ersetzt das vielfach kopierte
 * `<p className="fehlertext">…</p>`). Trägt `role="alert"`, damit Screenreader
 * die Fehlermeldung ansagen – der einzige funktionale Unterschied zum bloßen
 * `<p>`; Styling kommt weiter aus der `.fehlertext`-Klasse. */
export function Fehlertext({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p className="fehlertext" role="alert" style={style}>
      {children}
    </p>
  );
}
