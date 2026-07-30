import type { FormData } from '../types';

// Always posts to /api/submit — in dev this is proxied by Vite, in production by Vercel.
// The Google Apps Script URL is NEVER exposed to the browser.

/* ─── Client-side rate limiting (belt-and-suspenders with server-side) ─── */
const SUBMIT_COOLDOWN_MS = 15_000;
let lastSubmitTime = 0;

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

/* ─── Main submit ─── */
export async function submitSurvey(
  data: FormData,
  refNumber: string,
): Promise<{ ok: boolean; refNumber: string; error?: string }> {
  // Client-side rate limiting
  const now = Date.now();
  if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
    const remaining = Math.ceil((SUBMIT_COOLDOWN_MS - (now - lastSubmitTime)) / 1000);
    return { ok: false, refNumber, error: `Masyadong mabilis. Pakihintay ng ${remaining} segundo.` };
  }
  lastSubmitTime = now;

  try {
    const sanitized = sanitizeForm(data);

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sanitized, refNumber }),
    });

    const json = await res.json();
    return json;
  } catch (e) {
    console.error('Submit failed:', e);
    return { ok: false, refNumber, error: 'Hindi makapag-submit. Pakisubukan muli.' };
  }
}
  