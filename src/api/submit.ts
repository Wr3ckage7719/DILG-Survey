import type { FormData, Language } from '../types';
import type { TranslationKey } from '../i18n/translations';
import { translations } from '../i18n/translations';

// Always posts to /api/submit — in dev this is proxied by Vite, in production by Vercel.
// The Google Apps Script URL is NEVER exposed to the browser.

/* ─── Client-side rate limiting (belt-and-suspenders with server-side) ─── */
const SUBMIT_COOLDOWN_MS = 15_000;
let lastSubmitTime = 0;

/* ─── Client-side timeout ─── */
// Cap how long the browser waits before the UI can react. The Vercel function
// keeps running even after the browser aborts (up to its own 55s timeout), so
// the row may still land — the retry reuses the SAME refNumber and the Apps
// Script dedupe turns any late success into a no-op (never a duplicate).
const SUBMIT_TIMEOUT_MS = 20_000;

/* ─── Warm-up (kills the Apps Script cold start) ─── */
// The Google Apps Script web app takes ~27s to wake from cold. A cheap GET
// through /api/submit warms both the Vercel function and the Apps Script
// instance so the real POST (~2-3s when warm) succeeds on the first try.
export function warmUpSubmitEndpoint(): void {
  fetch('/api/submit', { method: 'GET' }).catch(() => {});
}

/* ─── Text sanitization ─── */
function sanitize(str: string): string {
  return str
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

function sanitizeForm(data: FormData): FormData {
  return {
    ...data,
    mgaMungkahi: sanitize(data.mgaMungkahi),
    pangalan: sanitize(data.pangalan),
    contactNumber: sanitize(data.contactNumber),
    emailAddress: sanitize(data.emailAddress),
    serbisyongIba: sanitize(data.serbisyongIba),
  };
}

/* ─── Validation helpers ─── */
export function validateEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^[\d\s\-+()]{7,20}$/.test(phone);
}

/* ─── Generate reference number ─── */
export function generateRefNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `DILG-${timestamp}-${random}`;
}

/* ─── Honeypot check ─── */
export function isHoneypotFilled(value: string): boolean {
  return value.trim().length > 0;
}

/* ─── Saved-confirmation check ─── */
// Asks the server whether a reference number was actually recorded. Used by the
// fast-success watcher and as the final safety net: when a POST fails or times
// out, the row may still have been saved server-side (lost response after a
// cold start). If this returns true, the user gets the success screen instead
// of a false error.
export async function checkRefSaved(ref: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`/api/submit?ref=${encodeURIComponent(ref)}`, { method: 'GET', signal });
    const json = await res.json().catch(() => null);
    return !!(json && json.saved);
  } catch {
    return false;
  }
}

/* ─── Abortable delay ─── */
// Sleeps for ms, resolving early if the signal aborts (used to stop pointless
// background work the moment success is confirmed).
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    let timer: ReturnType<typeof setTimeout>;
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
  });
}

/* ─── Fast-success watcher ─── */
// Polls the ?ref= lookup until the row actually appears in the spreadsheet.
// That read-only signal is the ground truth for "saved" — and typically lands
// seconds before the slow POST round-trip returns (~10-40s through Google's
// edge; a lost response can push it well past 40s). Racing it against the POST
// lets the UI show success the moment the data is recorded. The lookup is a GET
// through the Vercel proxy (the Apps Script URL never reaches the browser) and
// is not subject to the POST rate limiter, so bounded polling is safe.
export async function waitForRefSaved(
  ref: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
  signal?: AbortSignal,
): Promise<boolean> {
  const intervalMs = opts.intervalMs ?? 1_500;
  const timeoutMs = opts.timeoutMs ?? 50_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) return false;
    // Each lookup also warms the endpoint, so the first (near-certainly-false)
    // poll makes every later poll faster.
    if (await checkRefSaved(ref, signal)) return true;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await delay(Math.min(intervalMs, remaining), signal);
  }
  return false;
}

/* ─── Map server error codes → localized messages ─── */

/** Field name reported by the server (api/submit.ts) → localized "select" message. */
const SERVER_FIELD_KEYS: Record<string, TranslationKey> = {
  pangalanNgTanggapan: 'office.selectOffice',
  serbisyongIbinigay: 'office.selectService',
  uriNgKliyente: 'demo.clientTypeErr',
  edad: 'demo.ageErr',
  kasarian: 'demo.sexErr',
  rehiyon: 'demo.regionErr',
  cc1: 'cc.select',
  cc2: 'cc.select',
  cc3: 'cc.select',
};

function mapServerError(
  json: { ok?: boolean; error?: string; retryIn?: number; field?: string },
  dict: Record<TranslationKey, string>,
): string {
  switch (json?.error) {
    case 'rate_limit':
      return dict['error.rateLimit'].replace('{seconds}', String(json.retryIn ?? 15));
    case 'invalid_email':
      return dict['validation.email'];
    case 'invalid_phone':
      return dict['validation.phone'];
    case 'invalid_sqd':
      return dict['sqd.error'];
    case 'missing_field':
    case 'invalid_enum': {
      const key = json.field ? SERVER_FIELD_KEYS[json.field] : undefined;
      return key ? dict[key] : dict['toast.failed'];
    }
    case 'invalid_json':
    case 'invalid_body':
    case 'method_not_allowed':
    case 'server_config_error':
    case 'submit_failed':
    default:
      return dict['toast.failed'];
  }
}

/* ─── Main submit ─── */
export interface SubmitResult {
  ok: boolean;
  refNumber: string;
  error?: string;
  /** Server error code (e.g. 'rate_limit', 'submit_failed') — used for retry decisions. */
  code?: string;
}

export interface SubmitOptions {
  /** Skip the client-side cooldown — used for the single auto-retry. */
  isRetry?: boolean;
}

export async function submitSurvey(
  data: FormData,
  refNumber: string,
  lang: Language = 'tl',
  opts: SubmitOptions = {},
): Promise<SubmitResult> {
  const dict = translations[lang];

  // Client-side rate limiting (bypassed on the auto-retry)
  const now = Date.now();
  if (!opts.isRetry && now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
    const remaining = Math.ceil((SUBMIT_COOLDOWN_MS - (now - lastSubmitTime)) / 1000);
    return {
      ok: false,
      refNumber,
      error: dict['error.rateLimit'].replace('{seconds}', String(remaining)),
      code: 'rate_limit',
    };
  }
  lastSubmitTime = now;

  try {
    const sanitized = sanitizeForm(data);
    const startedAt = Date.now();

    // Retries get a longer window: the first attempt may be waiting out a cold
    // Apps Script start (~27-40s). By the time we retry, the instance is usually
    // warm, but give the retry room so it can't abort while the server finishes
    // waking up (the row may still be saved server-side either way).
    const timeoutMs = opts.isRetry ? 45_000 : SUBMIT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let json: { ok?: boolean; error?: string; refNumber?: string; retryIn?: number; field?: string } | null = null;
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sanitized, refNumber, lang }),
        signal: controller.signal,
      });
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }

    if (json && !json.ok && json.error) {
      console.debug(`[submit] failed in ${Date.now() - startedAt}ms code=${json.error}`);
      return { ok: false, refNumber, error: mapServerError(json, dict), code: json.error };
    }
    console.debug(`[submit] ok in ${Date.now() - startedAt}ms`);
    return { ok: true, refNumber: json?.refNumber || refNumber };
  } catch (e) {
    const aborted = e && typeof e === 'object' && (e as { name?: string }).name === 'AbortError';
    console.error(`Submit failed${aborted ? ' (client timeout)' : ''}:`, e);
    return { ok: false, refNumber, error: dict['toast.failed'], code: 'fetch_error' };
  }
}
  