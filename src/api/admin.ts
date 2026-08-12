/* ─── Admin API client ───
 * Talks only to the Vercel function /api/admin/* (the Apps Script URL never
 * reaches the browser). The session token is stored in sessionStorage and
 * expires server-side after 12h. */

export const ADMIN_TOKEN_KEY = 'dilg_admin_token';

export interface AdminRow {
  /** Spreadsheet row number (header = 1) — used by the print endpoint. */
  __row: number;
  [header: string]: string | number;
}

export interface AdminListResult {
  ok: boolean;
  rows?: AdminRow[];
  headers?: string[];
  count?: number;
  error?: string;
  detail?: string;
  /** True when the session token was rejected — the UI should log out. */
  unauthorized?: boolean;
}

export interface AdminPrintResult {
  ok: boolean;
  url?: string;
  error?: string;
  detail?: string;
  /** True when the session token was rejected — the UI should log out. */
  unauthorized?: boolean;
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null): void {
  if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

interface Envelope {
  ok?: boolean;
  token?: string;
  error?: string;
  detail?: string;
}

async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`/api/admin/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as T | null;
    if (res.status === 401 && json && (json as Envelope).error === 'unauthorized') {
      return { ...(json as object), unauthorized: true } as T;
    }
    return json;
  } catch {
    return null;
  }
}

export async function adminLogin(password: string): Promise<Envelope & { ok: boolean; token?: string }> {
  const json = await post<Envelope & { ok: boolean; token?: string }>('login', { password });
  if (!json) return { ok: false, error: 'Network error — check your connection and try again.' };
  return json;
}

export async function adminFetchResponses(token: string): Promise<AdminListResult & { unauthorized?: boolean }> {
  const json = await post<AdminListResult & { unauthorized?: boolean }>('responses', { token });
  if (!json) return { ok: false, error: 'Network error — check your connection and try again.' };
  return json;
}

export async function adminPrintResponse(token: string, row: number, tpl = 'auto'): Promise<AdminPrintResult> {
  const json = await post<AdminPrintResult>('print', { token, row, tpl });
  if (!json) return { ok: false, error: 'Network error — check your connection and try again.' };
  return json;
}
