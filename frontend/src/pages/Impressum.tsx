import { useConfig } from "../context/ConfigContext";

export function Impressum() {
  const { config } = useConfig();
  const hatAngaben = Boolean(
    config?.impressum_verantwortliche_person || config?.impressum_anschrift || config?.impressum_email
  );

  return (
    <div>
      <h1>Impressum</h1>

      {!hatAngaben && (
        <div className="karte">
          <p>
            Für diese Instanz wurde noch kein Impressum hinterlegt. Der Betreiber kann die Angaben
            (verantwortliche Person, Anschrift, Kontakt) in den Einstellungen ergänzen.
          </p>
        </div>
      )}

      {hatAngaben && (
        <div className="karte">
          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            <strong>{config?.organisation_name ?? "Gerätehaus.app"}</strong>
            {config?.impressum_verantwortliche_person && (
              <>
                <br />
                {config.impressum_verantwortliche_person}
              </>
            )}
          </p>
          {config?.impressum_anschrift && (
            <p style={{ whiteSpace: "pre-line" }}>{config.impressum_anschrift}</p>
          )}
          {(config?.impressum_email || config?.impressum_telefon) && (
            <p>
              {config?.impressum_email && (
                <>
                  E-Mail: <a href={`mailto:${config.impressum_email}`}>{config.impressum_email}</a>
                  <br />
                </>
              )}
              {config?.impressum_telefon && <>Telefon: {config.impressum_telefon}</>}
            </p>
          )}
          {config?.impressum_zusatz && (
            <p style={{ whiteSpace: "pre-line" }}>{config.impressum_zusatz}</p>
          )}
        </div>
      )}
    </div>
  );
}
