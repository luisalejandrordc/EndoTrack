import { session } from "./session";
import type { FieldError, SessionResponse } from "./types";
import { mockTransport } from "./mockTransport";

export const MOCK_ALL = import.meta.env.VITE_MOCK_ALL === "true";
const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: FieldError[] = [],
    public requestId?: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;
interface Opts {
  method?: string;
  body?: unknown;
  query?: Query;
  auth?: boolean;
  csrf?: boolean;
  _retried?: boolean;
}
export interface RawResponse {
  status: number;
  json?: any;
}

// ---- slow-server detection (free hosting wakes up slowly) -------------------------------------
const inflight = new Map<number, number>();
let seq = 0;
export const oldestInflightMs = () =>
  inflight.size ? Date.now() - Math.min(...inflight.values()) : 0;

// ---- session loss callback (the app shows a login modal instead of throwing the user away) ------
let onSessionLost: (() => void) | null = null;
export const setSessionLostHandler = (fn: (() => void) | null) => {
  onSessionLost = fn;
};

const qs = (q?: Query) => {
  if (!q) return "";
  const p = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};

async function transport(
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<RawResponse> {
  if (MOCK_ALL) return mockTransport(method, path, headers, body);
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "No se pudo conectar con el servidor. Verifique que la API esté en ejecución.",
    );
  }
  const text = res.status === 204 ? "" : await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: res.status, json };
}

let refreshing: Promise<boolean> | null = null;
/** Rotates the refresh cookie and stores the new access token. One call at a time. */
export function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  const p = (async () => {
    try {
      const r = await transport("POST", "/auth/refresh", {
        Accept: "application/json",
        "X-Requested-With": "EndosoFlow",
      });
      if (r.status !== 200 || !r.json) {
        session.clear();
        return false;
      }
      session.set(r.json as SessionResponse);
      return true;
    } catch {
      return false;
    }
  })();
  refreshing = p;
  p.finally(() => {
    refreshing = null;
  });
  return p;
}

export async function request<T>(path: string, o: Opts = {}): Promise<T> {
  const id = ++seq;
  inflight.set(id, Date.now());
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (o.body !== undefined) headers["Content-Type"] = "application/json";
    if (o.csrf) headers["X-Requested-With"] = "EndosoFlow";
    if (o.auth !== false && session.token)
      headers.Authorization = `Bearer ${session.token}`;
    const res = await transport(
      o.method ?? "GET",
      path + qs(o.query),
      headers,
      o.body,
    );

    if (res.status === 401 && o.auth !== false && !o._retried) {
      if (await refreshSession())
        return request<T>(path, { ...o, _retried: true });
      onSessionLost?.();
    }
    if (res.status >= 400) {
      const e = res.json?.error;
      throw new ApiError(
        res.status,
        e?.code ?? `HTTP_${res.status}`,
        e?.message ?? "Ocurrió un error inesperado. Intente nuevamente.",
        e?.fields ?? [],
        e?.requestId,
      );
    }
    return res.json as T;
  } finally {
    inflight.delete(id);
  }
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Ocurrió un error inesperado.";
export const fieldErrors = (e: unknown): Record<string, string> =>
  e instanceof ApiError
    ? Object.fromEntries(e.fields.map((f) => [f.field, f.message]))
    : {};
