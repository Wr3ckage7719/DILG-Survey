import type { IncomingMessage, ServerResponse } from 'node:http';

/* ─── Types ─── */
interface FormData {
  pangalanNgTanggapan: string;
  serbisyongIbinigay: string;
  serbisyongIba: string;
  uriNgKliyente: string;
  edad: string;
  kasarian: string;
  rehiyon: string;
  cc1: string;
  cc2: string;
  cc3: string;
  sqd: string[];
  mgaMungkahi: string;
  pangalan: string;
  contactNumber: string;
  emailAddress: string;
  refNumber: string;
  lang?: string;
}

/* ─── Error codes (localized client-side) ─── */
type ErrorCode =
  | 'method_not_allowed'
  | 'invalid_body'
  | 'invalid_json'
  | 'server_config_error'
  | 'rate_limit'
  | 'missing_field'
  | 'invalid_sqd'
  | 'invalid_email'
  | 'invalid_phone'
  | 'submit_failed';

function sendError(res: ServerResponse, status: number, error: ErrorCode, extra?: Record<string, unknown>): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error, ...extra }));
}

/* ─── Config ─── */
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const SUBMIT_COOLDOWN_MS = 15_000;

/* ─── In-memory rate limit (resets on cold start) ─── */
const rateLimitMap = new Map<string, number>();

/* ─── Helpers ─── */
function sanitize(str: string): string {
  return str
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

function validateEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^[\d\s\-+()]{7,20}$/.test(phone);
}

/* ─── CORS headers (allows your domain to call this) ─── */
function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/* ─── Handler ─── */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  setCorsHeaders(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    sendError(res, 405, 'method_not_allowed');
    return;
  }

  // Verify Apps Script URL is configured
  if (!APPS_SCRIPT_URL) {
    console.error('APPS_SCRIPT_URL environment variable is not set');
    sendError(res, 500, 'server_config_error');
    return;
  }

  // Parse body
  let bodyStr = '';
  try {
    for await (const chunk of req) {
      bodyStr += chunk;
    }
  } catch {
    sendError(res, 400, 'invalid_body');
    return;
  }

  let data: FormData;
  try {
    data = JSON.parse(bodyStr);
  } catch {
    sendError(res, 400, 'invalid_json');
    return;
  }

  // ─── IP-based rate limiting ───
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  const now = Date.now();
  const lastHit = rateLimitMap.get(ip);
  if (lastHit && now - lastHit < SUBMIT_COOLDOWN_MS) {
    const remaining = Math.ceil((SUBMIT_COOLDOWN_MS - (now - lastHit)) / 1000);
    sendError(res, 429, 'rate_limit', { retryIn: remaining });
    return;
  }
  rateLimitMap.set(ip, now);

  // Clean old entries every 100 requests
  if (rateLimitMap.size > 100) {
    const cutoff = now - 60_000;
    for (const [key, val] of rateLimitMap) {
      if (val < cutoff) rateLimitMap.delete(key);
    }
  }

  // ─── Validate required fields ───
  const required: (keyof FormData)[] = [
    'pangalanNgTanggapan',
    'serbisyongIbinigay',
    'uriNgKliyente',
    'edad',
    'kasarian',
    'rehiyon',
    'cc1',
    'cc2',
    'cc3',
  ];

  for (const field of required) {
    const val = data[field];
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      sendError(res, 400, 'missing_field', { field });
      return;
    }
  }

  // Validate SQD array
  if (!Array.isArray(data.sqd) || data.sqd.length !== 9) {
    sendError(res, 400, 'invalid_sqd');
    return;
  }

  // ─── Validate email/phone ───
  if (!validateEmail(data.emailAddress)) {
    sendError(res, 400, 'invalid_email');
    return;
  }
  if (!validatePhone(data.contactNumber)) {
    sendError(res, 400, 'invalid_phone');
    return;
  }

  // ─── Sanitize text fields ───
  const sanitized: FormData = {
    ...data,
    mgaMungkahi: sanitize(data.mgaMungkahi),
    pangalan: sanitize(data.pangalan),
    contactNumber: sanitize(data.contactNumber),
    emailAddress: sanitize(data.emailAddress),
    serbisyongIba: sanitize(data.serbisyongIba),
  };

  // ─── Forward to Google Apps Script ───
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized),
    });

    if (!response.ok) {
      console.error('Apps Script returned:', response.status);
      sendError(res, 502, 'submit_failed');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        refNumber: data.refNumber,
      }),
    );
  } catch (err) {
    console.error('Forward to Apps Script failed:', err);
    sendError(res, 502, 'submit_failed');
  }
}
