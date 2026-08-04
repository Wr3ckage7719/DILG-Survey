import type { FormData, Language } from '../types';
import type { TranslationKey } from '../i18n/translations';
import { translations } from '../i18n/translations';

// Always posts to /api/submit — in dev this is proxied by Vite, in production by Vercel.
// The Google Apps Script URL is NEVER exposed to the browser.

/* ─── Client-side rate limiting (belt-and-suspenders with server-side) ─── */
const SUBMIT_COOLDOWN_MS = 15_000;
let lastSubmitTime = 0;

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

/* ─── Map server error codes → localized messages ─── */
function mapServerError(
  json: { ok?: boolean; error?: string; retryIn?: number },
  dict: Record<TranslationKey, string>,
): string {
  switch (json?.error) {
    case 'rate_limit':
      return dict['error.rateLimit'].replace('{seconds}', String(json.retryIn ?? 15));
    case 'invalid_email':
      return dict['validation.email'];
    case 'invalid_phone':
      return dict['validation.phone'];
    case 'missing_field':
    case 'invalid_sqd':
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

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sanitized, refNumber, lang }),
    });

    const json = await res.json();
    if (!json.ok && json.error) {
      return { ok: false, refNumber, error: mapServerError(json, dict), code: json.error };
    }
    return { ok: true, refNumber: json.refNumber || refNumber };
  } catch (e) {
    console.error('Submit failed:', e);
    return { ok: false, refNumber, error: dict['toast.failed'], code: 'fetch_error' };
  }
}
  