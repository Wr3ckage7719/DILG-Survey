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
  sqd: string[]; // 9 items: SQD0–SQD8
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
  | 'invalid_enum'
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
// Apps Script web apps take ~27s+ to wake from a cold start (measured 40.7s in
// one production test). The browser fires warm-up GETs on page load and before
// submit, but a cold instance can still exceed 40s, so the upstream timeout is
// 55s — under the 60s maxDuration set in vercel.json. No retry server-side: a
// retry would hit the same still-cold instance. The client does one retry.
const UPSTREAM_TIMEOUT_MS = 55_000;
// Warm-up GET timeout — a hung instance must not stall the health check.
const WARMUP_TIMEOUT_MS = 25_000;
const MAX_BODY_BYTES = 64 * 1024;

/* ─── Option allow-lists (canonical Tagalog + English — the form stores the
 * respondent's chosen language, so both variants are valid inputs) ─── */
const OFFICES = [
  'DILG Camarines Norte (Records)',
  'Local Government Monitoring and Evaluation Section (LGMES)',
  'Local Government Capability and Development Section (LGCDS)',
  'Project Development and Monitoring Unit (PDMU)',
  'Finance and Administrative Section (FAS)',
];

const REGIONS = [
  'National Capital Region (NCR) – Metro Manila',
  'Cordillera Administrative Region (CAR)',
  'Region I – Ilocos Region',
  'Region II – Cagayan Valley',
  'Region III – Central Luzon',
  'Region IV-A – CALABARZON',
  'Region IV-B – MIMAROPA',
  'Region V – Bicol Region',
  'Region VI – Western Visayas',
  'Region VII – Central Visayas',
  'Region VIII – Eastern Visayas',
  'Region IX – Zamboanga Peninsula',
  'Region X – Northern Mindanao',
  'Region XI – Davao Region',
  'Region XII – SOCCSKSARGEN',
  'Region XIII – Caraga',
  'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
];

const KLIYENTE = [
  'Mamamayan',
  'Negosyo',
  'Gobyerno (empleyado o mula sa ibang ahensiya)',
  'Citizen',
  'Business',
  'Government (employee or from another agency)',
];

const EDAD = [
  'Mas mababa sa 18 y/o',
  '18-24 y/o',
  '25-34 y/o',
  '35-44 y/o',
  '45-54 y/o',
  '55-64 y/o',
  '65 y/o pataas',
  'Below 18 y/o',
  '18-24 y/o',
  '25-34 y/o',
  '35-44 y/o',
  '45-54 y/o',
  '55-64 y/o',
  '65 y/o and above',
];

const KASARIAN = [
  'Lalaki',
  'Babae',
  'LGBTQIA+',
  'Hindi nais sabihin',
  'Man',
  'Woman',
  'LGBTQIA+',
  'Prefer not to say',
];

const CC1_OPTIONS = [
  'Alam ko kung ano ang Gabay, at nakita ko ang Gabay ng tanggapang ito.',
  'Alam ko kung ano ang Gabay, ngunit hindi ko nakita ang Gabay ng tanggapang ito.',
  'Nalaman ko kung ano ang Gabay noong nakita ko ang Gabay ng tanggapang ito.',
  'Hindi ko alam kung ano ang Gabay, at hindi ako nakakita ng Gabay sa tanggapang ito. (Piliin ang N/A sa CC2 at CC3.)',
  'I know what a CC is and I saw this office\u2019s CC.',
  'I know what a CC is but I did NOT see this office\u2019s CC.',
  'I learned of the CC only when I saw this office\u2019s CC.',
  'I do not know what a CC is and I did not see one in this office. (Answer \u2018N/A\u2019 on CC2 and CC3)',
];

const CC2_OPTIONS = [
  'Madaling makita',
  'Bahagyang nakikita',
  'Mahirap makita',
  'Hindi makita',
  'N/A',
  'Easy to see',
  'Somewhat easy to see',
  'Difficult to see',
  'Not visible at all',
  'N/A',
];

const CC3_OPTIONS = [
  'Lubos na nakatulong',
  'Bahagyang nakatulong',
  'Hindi nakatulong',
  'N/A',
  'Helped very much',
  'Somewhat helped',
  'Did not help',
  'N/A',
];

const SQD_OPTIONS = [
  'Lubos na sang-ayon',
  'Sang-ayon',
  'Walang kinikilingan',
  'Hindi sang-ayon',
  'Lubos na hindi sang-ayon',
  'N/A',
  'Strongly agree',
  'Agree',
  'Neither agree nor disagree',
  'Disagree',
  'Strongly disagree',
  'N/A',
];

/* ─── In-memory rate limit (resets on cold start) ─── */
const rateLimitMap = new Map<string, number>();

/* ─── Helpers ─── */
function sanitize(str: string): string {
  return str
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

/** For free-text fields: also strip spreadsheet-formula prefixes (=, +, -, @). */
function sanitizeText(str: string): string {
  return sanitize(str)
    .replace(/^\s*[=+\-@]/g, '')
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

function inList(value: string, list: string[]): boolean {
  return list.includes(value);
}

/** Real client IP: Vercel appends its own value; never trust the first x-forwarded-for entry. */
function getClientIp(req: IncomingMessage): string {
  const vercel = req.headers['x-vercel-forwarded-for'];
  if (typeof vercel === 'string' && vercel.trim()) return vercel.trim().split(',')[0].trim();
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    const parts = fwd.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.socket.remoteAddress || 'unknown';
}

/** CORS: allow only the survey origin (+ Vercel preview domains). */
function setCorsHeaders(res: ServerResponse, origin?: string): void {
  const allowed =
    origin &&
    (origin === 'https://dilg-survey-web.vercel.app' ||
      origin === 'https://dilg-survey-web.vercel.app/' ||
      /^https:\/\/dilg-survey-web(-[a-z0-9]+)?\.vercel\.app$/.test(origin) ||
      /^https?:\/\/localhost:\d+$/.test(origin));
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/* ─── Handler ─── */
/* ─── Forward to Google Apps Script; only treat as success when the upstream
 * body explicitly confirms it ({ success: true } or { ok: true }). Apps Script
 * returns HTTP 200 even for its error branch, so an HTTP-only check could
 * silently lose a row. ─── */
async function postToAppsScript(url: string, body: string): Promise<{ ok: boolean; detail: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    const text = await res.text().catch(() => '');
    let parsed: { success?: boolean; ok?: boolean; error?: string } | null = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    const confirmed =
      res.ok && parsed && (parsed.success === true || parsed.ok === true);
    if (confirmed) return { ok: true, detail: '' };
    console.error(
      'Apps Script did not confirm success:',
      res.status,
      (parsed && parsed.error) || text.slice(0, 300),
    );
    return {
      ok: false,
      detail: (parsed && parsed.error) || `upstream_http_${res.status}`,
    };
  } catch (err) {
    const aborted = err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError';
    console.error('Forward to Apps Script failed:', aborted ? 'timeout' : err instanceof Error ? err.message : String(err));
    return { ok: false, detail: aborted ? 'timeout' : 'fetch_error' };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const origin = (req.headers.origin as string | undefined) || undefined;
  setCorsHeaders(res, origin);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Warm-up: the client pings this with GET on page load and before submit
  // to keep the function + Apps Script instance warm (cold start ≈ 27-40s).
  // Best-effort — failures are non-fatal. Bounded by WARMUP_TIMEOUT_MS.
  if (req.method === 'GET') {
    if (APPS_SCRIPT_URL) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);
      try {
        await fetch(APPS_SCRIPT_URL, { method: 'GET', signal: controller.signal });
      } catch {
        // warm-up failure is fine
      } finally {
        clearTimeout(timer);
      }
    }
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

  // ─── IP-based rate limit: check EARLY (before any work) so a recent success
  // blocks duplicates, but only SET the timestamp after a successful forward.
  // This way malformed/failed requests never lock an IP out. ───
  const ip = getClientIp(req);
  const now = Date.now();
  const lastHit = rateLimitMap.get(ip);
  if (lastHit && now - lastHit < SUBMIT_COOLDOWN_MS) {
    const remaining = Math.ceil((SUBMIT_COOLDOWN_MS - (now - lastHit)) / 1000);
    sendError(res, 429, 'rate_limit', { retryIn: remaining });
    return;
  }

  // Parse body (capped — prevents memory exhaustion)
  let bodyStr = '';
  try {
    for await (const chunk of req) {
      bodyStr += chunk;
      if (bodyStr.length > MAX_BODY_BYTES) {
        sendError(res, 400, 'invalid_body');
        return;
      }
    }
  } catch {
    sendError(res, 400, 'invalid_body');
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(bodyStr);
  } catch {
    sendError(res, 400, 'invalid_json');
    return;
  }

  // JSON.parse('null'|'42'|'"x"') yields non-objects — reject them cleanly.
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    sendError(res, 400, 'invalid_json');
    return;
  }
  const form = data as FormData;

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
    const val = form[field];
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      sendError(res, 400, 'missing_field', { field });
      return;
    }
  }

  // ─── Enum allow-lists (prevents arbitrary strings/formula prefixes in the Sheet) ───
  if (!inList(form.pangalanNgTanggapan, OFFICES)) {
    sendError(res, 400, 'invalid_enum', { field: 'pangalanNgTanggapan' });
    return;
  }
  if (!inList(form.rehiyon, REGIONS)) {
    sendError(res, 400, 'invalid_enum', { field: 'rehiyon' });
    return;
  }
  if (!inList(form.uriNgKliyente, KLIYENTE)) {
    sendError(res, 400, 'invalid_enum', { field: 'uriNgKliyente' });
    return;
  }
  if (!inList(form.edad, EDAD)) {
    sendError(res, 400, 'invalid_enum', { field: 'edad' });
    return;
  }
  if (!inList(form.kasarian, KASARIAN)) {
    sendError(res, 400, 'invalid_enum', { field: 'kasarian' });
    return;
  }
  if (!inList(form.cc1, CC1_OPTIONS)) {
    sendError(res, 400, 'invalid_enum', { field: 'cc1' });
    return;
  }
  if (!inList(form.cc2, CC2_OPTIONS)) {
    sendError(res, 400, 'invalid_enum', { field: 'cc2' });
    return;
  }
  if (!inList(form.cc3, CC3_OPTIONS)) {
    sendError(res, 400, 'invalid_enum', { field: 'cc3' });
    return;
  }

  // Validate SQD array: exactly 9 items, each from the option list.
  if (!Array.isArray(form.sqd) || form.sqd.length !== 9) {
    sendError(res, 400, 'invalid_sqd');
    return;
  }
  for (const item of form.sqd) {
    if (!inList(item, SQD_OPTIONS)) {
      sendError(res, 400, 'invalid_sqd');
      return;
    }
  }

  // ─── Validate email/phone ───
  if (!validateEmail(form.emailAddress)) {
    sendError(res, 400, 'invalid_email');
    return;
  }
  if (!validatePhone(form.contactNumber)) {
    sendError(res, 400, 'invalid_phone');
    return;
  }

  // ─── Sanitize text fields (free-text gets formula-prefix stripping) ───
  const sanitized: FormData = {
    ...form,
    mgaMungkahi: sanitizeText(form.mgaMungkahi),
    pangalan: sanitizeText(form.pangalan),
    serbisyongIba: sanitizeText(form.serbisyongIba),
    serbisyongIbinigay: sanitizeText(form.serbisyongIbinigay),
    contactNumber: sanitize(form.contactNumber),
    emailAddress: sanitize(form.emailAddress),
  };

  // ─── Forward to Google Apps Script ───
  const upstream = await postToAppsScript(APPS_SCRIPT_URL, JSON.stringify(sanitized));
  if (!upstream.ok) {
    sendError(res, 502, 'submit_failed', { detail: upstream.detail });
    return;
  }

  // Successful submission: record the timestamp (the early check above uses it
  // to block duplicates). Clean old entries every 100 requests.
  rateLimitMap.set(ip, Date.now());
  if (rateLimitMap.size > 100) {
    const cutoff = Date.now() - 60_000;
    for (const [key, val] of rateLimitMap) {
      if (val < cutoff) rateLimitMap.delete(key);
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      ok: true,
      refNumber: form.refNumber,
    }),
  );
}
