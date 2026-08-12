import { createSign } from 'node:crypto';
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
// submit, but a cold instance can still exceed 40s. The POST below uses
// per-attempt budgets that stay safely under the 60s maxDuration in vercel.json.
// Readiness probe timeout. A cold Apps Script instance can take up to ~40s to
// boot; the client's pre-submit gate waits on this GET until the instance
// answers (so the POST that follows is fast). 45s stays safely under the 60s
// maxDuration in vercel.json.
const WARMUP_TIMEOUT_MS = 45_000;
const MAX_BODY_BYTES = 64 * 1024;

// Google's Apps Script /exec edge runs bot protection: it 404s datacenter
// POSTs that carry no browser-like User-Agent (verified live — a 404 ppConfig
// challenge page without this header, 200 with it). The fetch() default UA
// (none) was silently breaking submissions from Vercel.
const UPSTREAM_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
// Full browser-ish header set. Google's challenge sometimes keys on more than
// the UA alone, so mimic a Chrome fetch as closely as a server can.
const UPSTREAM_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'User-Agent': UPSTREAM_UA,
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

/* ═══ Sheets API v4 fast path ═══
 * Writes survey rows directly to the spreadsheet via Google's Sheets API,
 * bypassing the Apps Script web-app edge. Google's bot protection intermittently
 * slow-paths /exec requests from datacenter IPs (measured 2-40s variance vs ~1s
 * for the same call); the Sheets API is authenticated, so datacenter traffic is
 * treated normally — ~1-2s and deterministic.
 *
 * Configure (Vercel env; also usable in .env for `vercel dev`):
 *   GOOGLE_SA_KEY    — base64 (or raw JSON) of a Google Cloud service-account
 *                      key that has Editor access to the survey spreadsheet.
 *   SPREADSHEET_ID   — the id from the spreadsheet URL (/spreadsheets/d/<id>/).
 *   SHEET_TAB_NAME   — optional: pin the tab (default: 'Form Responses 1' if it
 *                      has the survey headers, else the first tab with them).
 *
 *   Aliases: SERVICE_ACCOUNT_KEY and SHEETS_FAST_PATH_SPREADSHEET_ID (older
 *   documentation) are honored as fallbacks for GOOGLE_SA_KEY / SPREADSHEET_ID,
 *   so a deployment configured under either naming scheme enables the fast path.
 *
 * Fallback: ANY failure here (missing env, token error, API error, tab/headers
 * not found) falls through to the existing Apps Script write — the fast path is
 * strictly additive and can never lose a submission.
 * Rollback: unset GOOGLE_SA_KEY / SPREADSHEET_ID → behavior reverts to today.
 */
let sheetsToken: { token: string; exp: number } | null = null;
let sheetsMeta: { tab: string; headers: string[]; refCol: number; checkedAt: number } | null = null;
const SHEETS_META_TTL_MS = 5 * 60_000;

// Env-var aliases: current canonical names plus the ones earlier AGENTS.md
// versions documented — either set enables the fast path.
const FAST_PATH_SA_KEY = process.env.GOOGLE_SA_KEY || process.env.SERVICE_ACCOUNT_KEY || '';
const FAST_PATH_SHEET_ID = process.env.SPREADSHEET_ID || process.env.SHEETS_FAST_PATH_SPREADSHEET_ID || '';

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function parseServiceAccount(raw: string): { client_email: string; private_key: string } | null {
  try {
    let json = raw.trim();
    if (!json.startsWith('{')) json = Buffer.from(json, 'base64').toString('utf8');
    const sa = JSON.parse(json);
    if (typeof sa.client_email === 'string' && typeof sa.private_key === 'string') {
      return { client_email: sa.client_email, private_key: sa.private_key };
    }
  } catch {
    /* not a valid service account */
  }
  return null;
}

/** Mint (and cache) an OAuth2 access token from the service account key. */
async function getSheetsToken(): Promise<string> {
  const rawKey = FAST_PATH_SA_KEY;
  if (!rawKey) throw new Error('fastpath_disabled');
  if (sheetsToken && sheetsToken.exp > Date.now() + 60_000) return sheetsToken.token;
  const sa = parseServiceAccount(rawKey);
  if (!sa) throw new Error('fastpath_bad_key');
  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  signer.end();
  const assertion = `${header}.${claims}.${base64url(signer.sign(sa.private_key))}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!tokenJson || !tokenJson.access_token) throw new Error('fastpath_token_failed');
  const expiresIn = (tokenJson.expires_in ?? 3600) * 1000;
  sheetsToken = { token: tokenJson.access_token, exp: Date.now() + expiresIn };
  return sheetsToken.token;
}

function fastPathConfigured(): boolean {
  return !!(FAST_PATH_SA_KEY && FAST_PATH_SHEET_ID);
}

async function sheetsFetch(
  spreadsheetId: string,
  token: string,
  path: string,
  init?: { method?: string; body?: string },
): Promise<Response> {
  return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

async function readHeaderRow(spreadsheetId: string, token: string, tab: string): Promise<string[]> {
  const res = await sheetsFetch(spreadsheetId, token, `/values/${encodeURIComponent(`${tab}!1:1`)}`);
  const json = (await res.json().catch(() => null)) as { values?: unknown[][] } | null;
  const row = json?.values?.[0] || [];
  return row.map((v) => String(v ?? ''));
}

/** Locate the survey tab: pinned env name > 'Form Responses 1' > first tab with
 *  the survey header. Never writes; throws when not found (→ Apps Script fallback). */
async function detectSurveyTab(spreadsheetId: string, token: string): Promise<string> {
  const explicit = process.env.SHEET_TAB_NAME;
  const metaRes = await sheetsFetch(spreadsheetId, token, '?fields=sheets.properties.title');
  const metaJson = (await metaRes.json().catch(() => null)) as { sheets?: { properties?: { title?: string } }[] } | null;
  const tabs = (metaJson?.sheets || []).map((s) => s.properties?.title).filter((t): t is string => !!t);
  if (explicit && tabs.includes(explicit)) return explicit;
  if (tabs.includes('Form Responses 1')) return 'Form Responses 1';
  for (const tab of tabs) {
    const headers = await readHeaderRow(spreadsheetId, token, tab);
    if (headers.includes('Reference Number')) return tab;
  }
  throw new Error('fastpath_tab_not_found');
}

/** Load (and cache, TTL'd) the survey tab + its header row + ref column index. */
async function ensureSheetsMeta(spreadsheetId: string, token: string): Promise<{ tab: string; headers: string[]; refCol: number }> {
  if (sheetsMeta && Date.now() - sheetsMeta.checkedAt < SHEETS_META_TTL_MS) return sheetsMeta;
  const tab = await detectSurveyTab(spreadsheetId, token);
  const headers = await readHeaderRow(spreadsheetId, token, tab);
  const refCol = headers.findIndex((h) => h.indexOf('Reference Number') !== -1);
  if (refCol === -1 || !headers.some((h) => h.indexOf('Pangalan ng tanggapan') !== -1)) {
    throw new Error('fastpath_headers_unexpected');
  }
  sheetsMeta = { tab, headers, refCol, checkedAt: Date.now() };
  return sheetsMeta;
}

function columnLetter(index: number): string {
  let s = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Mirror of the Apps Script mapField() — builds the row in the sheet's own
 *  header order so the data lands in exactly the same columns. */
function mapRowValues(headers: string[], data: FormData): string[] {
  const now = new Date(Date.now() + 8 * 3600 * 1000); // Asia/Manila = UTC+8, no DST
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getUTCFullYear()}/${pad(now.getUTCMonth() + 1)}/${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  return headers.map((h) => {
    if (h === 'Timestamp' || h === 'Petsa') return timestamp;
    if (h.indexOf('Reference Number') !== -1) return data.refNumber || '';
    if (h.indexOf('Wika') !== -1) return data.lang === 'en' ? 'English' : 'Tagalog';
    const sqdMatch = h.match(/^SQD(\d+)\./);
    if (sqdMatch) return (data.sqd && data.sqd[parseInt(sqdMatch[1], 10)]) || '';
    if (h.indexOf('Pangalan ng tanggapan') !== -1) return data.pangalanNgTanggapan || '';
    if (h.indexOf('Serbisyong ibinigay') !== -1) return data.serbisyongIbinigay || '';
    if (h.indexOf('Serbisyong iba') !== -1) return data.serbisyongIba || '';
    if (h.indexOf('Uri ng Kliyente') !== -1) return data.uriNgKliyente || '';
    if (h.indexOf('Edad') !== -1) return data.edad || '';
    if (h.indexOf('Kasarian') !== -1) return data.kasarian || '';
    if (h.indexOf('Rehiyon') !== -1) return data.rehiyon || '';
    if (h.indexOf('CC1') !== -1) return data.cc1 || '';
    if (h.indexOf('CC2') !== -1) return data.cc2 || '';
    if (h.indexOf('CC3') !== -1) return data.cc3 || '';
    if (h.indexOf('mungkahi') !== -1) return data.mgaMungkahi || '';
    if (h.indexOf('Pangalan (optional)') !== -1) return data.pangalan || '';
    if (h.indexOf('Contact number') !== -1) return data.contactNumber || '';
    if (h.indexOf('Email address') !== -1) return data.emailAddress || '';
    return '';
  });
}

/** True when `ref` already appears in the sheet's Reference Number column. */
async function sheetsRefExists(spreadsheetId: string, token: string, tab: string, refCol: number, ref: string): Promise<boolean> {
  const letter = columnLetter(refCol);
  const res = await sheetsFetch(spreadsheetId, token, `/values/${encodeURIComponent(`${tab}!${letter}:${letter}`)}`);
  const json = (await res.json().catch(() => null)) as { values?: unknown[][] } | null;
  const col = json?.values || [];
  for (const cell of col) {
    if (String(cell[0] ?? '') === ref) return true;
  }
  return false;
}

/** Fast-path write. Returns ok=false on ANY problem → caller falls back to the
 *  Apps Script write. Dedupe mirrors doPost: an existing ref is a success. */
async function writeRowViaSheets(data: FormData): Promise<{ ok: boolean; ms: number; dedupe: boolean }> {
  const started = Date.now();
  try {
    const spreadsheetId = FAST_PATH_SHEET_ID;
    const token = await getSheetsToken();
    const { tab, headers, refCol } = await ensureSheetsMeta(spreadsheetId, token);
    if (data.refNumber && (await sheetsRefExists(spreadsheetId, token, tab, refCol, data.refNumber))) {
      return { ok: true, ms: Date.now() - started, dedupe: true };
    }
    const values = mapRowValues(headers, data);
    const appendRes = await sheetsFetch(
      spreadsheetId,
      token,
      `/values/${encodeURIComponent(`${tab}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ majorDimension: 'ROWS', values: [values] }) },
    );
    if (!appendRes.ok) throw new Error(`fastpath_append_${appendRes.status}`);
    return { ok: true, ms: Date.now() - started, dedupe: false };
  } catch (err) {
    console.error(`[fastpath] falling back to Apps Script: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, ms: Date.now() - started, dedupe: false };
  }
}

/** Fast-path saved-check for the GET ?ref= handler. Returns true/false when the
 *  fast path answered, null when it can't (→ caller uses the Apps Script hop). */
async function sheetsRefLookup(ref: string): Promise<boolean | null> {
  if (!fastPathConfigured()) return null;
  try {
    const spreadsheetId = FAST_PATH_SHEET_ID;
    const token = await getSheetsToken();
    const { tab, refCol } = await ensureSheetsMeta(spreadsheetId, token);
    return await sheetsRefExists(spreadsheetId, token, tab, refCol, ref);
  } catch (err) {
    console.error(`[fastpath] ref lookup falling back: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

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
 * silently lose a row.
 *
 * Lost-response recovery: Google's edge intermittently drops/404s the response
 * when the instance is cold (measured in production) — sometimes AFTER the
 * script already executed and wrote the row. When a POST goes unconfirmed, we
 * ask the Apps Script directly ("was this reference number recorded?") before
 * giving up; a warm instance answers that read-only lookup in ~1-3s. Retries
 * reuse the same body and Reference Number, so the Apps Script dedupe collapses
 * any repeated write to a single row. Per-attempt budgets keep the whole
 * function safely under the 60s maxDuration set in vercel.json. ─── */
async function postToAppsScript(
  url: string,
  body: string,
  ref: string,
): Promise<{ ok: boolean; detail: string; upstreamMs: number }> {
  const startedAt = Date.now();
  let lastDetail = 'upstream_unreachable';

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** POST the body; resolves whether the upstream body explicitly confirmed it. */
  const postOnce = async (budgetMs: number): Promise<{ confirmed: boolean; detail: string }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budgetMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: UPSTREAM_HEADERS,
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
      const confirmed = res.ok && !!parsed && (parsed.success === true || parsed.ok === true);
      const detail = (parsed && parsed.error) || `upstream_http_${res.status}`;
      return { confirmed, detail };
    } catch (err) {
      const aborted = err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError';
      return { confirmed: false, detail: aborted ? 'timeout' : 'fetch_error' };
    } finally {
      clearTimeout(timer);
    }
  };

  /** Read-only "was this ref recorded?" check — cheap when the instance is warm. */
  const lookupSaved = async (budgetMs: number): Promise<boolean> => {
    if (!ref.trim()) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budgetMs);
    try {
      const res = await fetch(`${url}?ref=${encodeURIComponent(ref)}`, { method: 'GET', headers: UPSTREAM_HEADERS, signal: controller.signal });
      const text = await res.text().catch(() => '');
      let parsed: { saved?: boolean } | null = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      return !!(parsed && parsed.saved);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  // Attempt 1 — the long shot that covers a cold start (~27-40s). Worst-case
  // budget math below: 30 + 1.5 + 8 + 10 + 1.5 + 5 = 56s < 60s Vercel cap.
  const a1 = await postOnce(30_000);
  if (a1.confirmed) {
    console.log(`[upstream] ok attempt=1 in ${Date.now() - startedAt}ms`);
    return { ok: true, detail: '', upstreamMs: Date.now() - startedAt };
  }
  lastDetail = a1.detail;
  console.error(`[upstream] attempt=1 not confirmed: ${a1.detail} in ${Date.now() - startedAt}ms`);

  // Attempt 1 ran (or ran long enough that it probably executed) but the
  // response was lost at Google's edge — the row may already be in the sheet.
  await sleep(1_500);
  if (await lookupSaved(8_000)) {
    console.log(`[upstream] confirmed by ref-lookup after attempt=1 in ${Date.now() - startedAt}ms`);
    return { ok: true, detail: '', upstreamMs: Date.now() - startedAt };
  }

  // Attempt 2 — attempt 1 woke the instance, so a fresh POST either writes the
  // row or dedupes the retry in seconds.
  const a2 = await postOnce(10_000);
  if (a2.confirmed) {
    console.log(`[upstream] ok attempt=2 in ${Date.now() - startedAt}ms`);
    return { ok: true, detail: '', upstreamMs: Date.now() - startedAt };
  }
  lastDetail = a2.detail;
  console.error(`[upstream] attempt=2 not confirmed: ${a2.detail} in ${Date.now() - startedAt}ms`);

  // Attempt 2 may also have written the row before losing the response.
  await sleep(1_500);
  if (await lookupSaved(5_000)) {
    console.log(`[upstream] confirmed by ref-lookup after attempt=2 in ${Date.now() - startedAt}ms`);
    return { ok: true, detail: '', upstreamMs: Date.now() - startedAt };
  }

  return { ok: false, detail: lastDetail, upstreamMs: Date.now() - startedAt };
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
  // With ?ref= it doubles as the saved-confirmation check: the client asks
  // "was this reference number recorded?" when a POST response was lost.
  if (req.method === 'GET') {
    const query = new URL(req.url ?? '/', 'http://localhost').searchParams;
    const ref = query.get('ref');
    if (ref) {
      if (!APPS_SCRIPT_URL) {
        sendError(res, 500, 'server_config_error');
        return;
      }
      // Sheets-API fast path: answer from the sheet directly — no slow /exec hop.
      const viaSheets = await sheetsRefLookup(ref);
      if (viaSheets !== null) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, saved: viaSheets, via: 'sheets' }));
        return;
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);
        const up = await fetch(`${APPS_SCRIPT_URL}?ref=${encodeURIComponent(ref)}`, {
          method: 'GET',
          headers: UPSTREAM_HEADERS,
          signal: controller.signal,
        });
        const text = await up.text().catch(() => '');
        clearTimeout(timer);
        let parsed: { saved?: boolean } | null = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = null;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, saved: !!(parsed && parsed.saved) }));
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, saved: false }));
      }
      return;
    }
    // Plain GET doubles as the readiness probe the client waits on before its
    // first POST: fetch the Apps Script and report whether it answered (`warm`)
    // and how long it took. A cold instance can take up to WARMUP_TIMEOUT_MS to
    // boot; once it answers, the instance is warm for the POST that follows.
    const startedAt = Date.now();
    let warm = false;
    if (APPS_SCRIPT_URL) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);
      try {
        const up = await fetch(APPS_SCRIPT_URL, { method: 'GET', headers: UPSTREAM_HEADERS, signal: controller.signal });
        warm = up.ok;
      } catch {
        // warm-up failure is fine — the POST flow has its own cold-start recovery
      } finally {
        clearTimeout(timer);
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, warm, upstreamMs: Date.now() - startedAt }));
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

  // ─── Forward to the spreadsheet. Fast path: Sheets API v4 directly (bypasses
  // Google's bot-protected /exec edge — the source of the 15-40s round trips).
  // Any failure falls back to the Apps Script write, which also re-confirms by
  // ref lookup when a cold instance loses the POST response. ───
  let upstream: { ok: boolean; detail: string; upstreamMs: number };
  let via = 'apps-script';
  if (fastPathConfigured()) {
    // Sanitized body: with valueInputOption=USER_ENTERED, an unstripped leading
    // "=" in a free-text field would be executed as a formula. Same guarantee
    // the Apps Script path has.
    const fast = await writeRowViaSheets(sanitized);
    if (fast.ok) {
      via = fast.dedupe ? 'sheets-dedupe' : 'sheets';
      upstream = { ok: true, detail: '', upstreamMs: fast.ms };
    } else {
      upstream = await postToAppsScript(APPS_SCRIPT_URL, JSON.stringify(sanitized), form.refNumber);
    }
  } else {
    upstream = await postToAppsScript(APPS_SCRIPT_URL, JSON.stringify(sanitized), form.refNumber);
  }
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
      upstreamMs: upstream.upstreamMs,
      via,
    }),
  );
}
