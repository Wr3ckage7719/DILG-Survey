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

export interface AdminBatchPrintResult {
  ok: boolean;
  /** Final URL of the finished batch document (only on the last chunk). */
  url?: string;
  /** Id of the master document — pass back on the next chunk. */
  docId?: string;
  /** Rows that could not be included (skipped without aborting the batch). */
  failedRows?: number[];
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

/** One chunk of a batch-document run. Send a few rows at a time; thread the
 *  returned docId into the next call, and set isFinal on the last chunk (it
 *  returns the finished document's URL). `resume` is the timeout-retry opt-in:
 *  a retried chunk-1 call (no masterDocId yet) asks the server to reuse the
 *  most recent in-progress batch document that already contains some of these
 *  rows instead of starting a duplicate one. */
export async function adminBatchPrintChunk(
  token: string,
  rows: number[],
  masterDocId: string | null,
  isFinal: boolean,
  tpl = 'auto',
  resume = false,
): Promise<AdminBatchPrintResult> {
  const json = await post<AdminBatchPrintResult>('print', {
    token,
    rows,
    masterDocId: masterDocId || undefined,
    final: isFinal,
    tpl,
    resume,
  });
  if (!json) return { ok: false, error: 'Network error — check your connection and try again.' };
  return json;
}

/** Best-effort: export the finished batch document as a PDF in Drive. Called
 *  right after the final chunk returns so the heavy conversion never blocks
 *  the batch result (the document URL is the deliverable; the PDF is a
 *  convenience file). */
export async function adminExportBatchPdf(token: string, docId: string): Promise<AdminBatchPrintResult> {
  const json = await post<AdminBatchPrintResult>('print', { token, pdfDocId: docId });
  if (!json) return { ok: false, error: 'Network error — check your connection and try again.' };
  return json;
}

/** One consistent, human-readable message for any admin API error code.
 *  Used by Login, Dashboard and ResponseDetail so the same failure is never
 *  shown as a raw code in one screen and a message in another. */
export function describeAdminError(result: { error?: string; detail?: string }): string {
  switch (result.error) {
    case 'invalid_credentials':
      return 'Incorrect password. Please try again.';
    case 'unauthorized':
      return 'Your session has expired. Please sign in again.';
    case 'too_many_attempts':
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    case 'not_configured':
      return 'Admin is not configured yet. Set ADMIN_PASSWORD in the Apps Script properties.';
    case 'forbidden':
      return 'The backend rejected the request — ADMIN_GS_SECRET (Vercel) does not match ADMIN_API_SECRET (Apps Script).';
    case 'server_config_error':
      return 'The backend is missing APPS_SCRIPT_URL. Set it in Vercel environment variables.';
    case 'upstream_timeout':
      return 'The survey backend took too long to respond. Please try again in a moment.';
    case 'upstream_unreachable':
      return 'Could not reach the survey backend (network error). Check your connection and try again.';
    case 'upstream_bad_response':
      return 'The survey backend returned an unexpected response — the Apps Script deployment may be deleted or access-restricted. Check APPS_SCRIPT_URL in Vercel and the deployment settings.';
    case 'list_failed':
      return `Could not read responses: ${result.detail || 'unknown error'}`;
    case 'generate_failed':
      return result.detail || 'Could not generate the document. Check the template is set.';
    default:
      return result.detail || result.error || 'Something went wrong. Please try again.';
  }
}
