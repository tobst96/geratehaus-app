const BASIS_URL = "/api/v1";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : `API-Fehler (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

let moderatorToken: string | null = localStorage.getItem("moderator_token");

export function setModeratorToken(token: string | null): void {
  moderatorToken = token;
  if (token) {
    localStorage.setItem("moderator_token", token);
  } else {
    localStorage.removeItem("moderator_token");
  }
}

export function getModeratorToken(): string | null {
  return moderatorToken;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  isFormData?: boolean;
}

function baueUrl(pfad: string, query?: RequestOptions["query"]): string {
  const url = new URL(BASIS_URL + pfad, window.location.origin);
  if (query) {
    for (const [schluessel, wert] of Object.entries(query)) {
      if (wert !== undefined && wert !== null) {
        url.searchParams.set(schluessel, String(wert));
      }
    }
  }
  return url.pathname + url.search;
}

export async function anfrage<T>(pfad: string, optionen: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (moderatorToken) {
    headers["Authorization"] = `Bearer ${moderatorToken}`;
  }

  let body: BodyInit | undefined;
  if (optionen.body !== undefined) {
    if (optionen.isFormData) {
      body = optionen.body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(optionen.body);
    }
  }

  const response = await fetch(baueUrl(pfad, optionen.query), {
    method: optionen.method ?? "GET",
    credentials: "include",
    headers,
    body,
  });

  if (!response.ok) {
    let detail: unknown = response.statusText;
    try {
      const daten = await response.json();
      detail = daten.detail ?? daten;
    } catch {
      // kein JSON-Body
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.blob()) as unknown as T;
}

export const apiGet = <T>(pfad: string, query?: RequestOptions["query"]) =>
  anfrage<T>(pfad, { method: "GET", query });

export const apiPost = <T>(pfad: string, body?: unknown, query?: RequestOptions["query"]) =>
  anfrage<T>(pfad, { method: "POST", body, query });

export const apiPut = <T>(pfad: string, body?: unknown) => anfrage<T>(pfad, { method: "PUT", body });

export const apiPatch = <T>(pfad: string, body?: unknown) => anfrage<T>(pfad, { method: "PATCH", body });

export const apiDelete = <T>(pfad: string) => anfrage<T>(pfad, { method: "DELETE" });

export const apiUpload = <T>(pfad: string, datei: File, feldname = "datei") => {
  const formData = new FormData();
  formData.append(feldname, datei);
  return anfrage<T>(pfad, { method: "POST", body: formData, isFormData: true });
};
