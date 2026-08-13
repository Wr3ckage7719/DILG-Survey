import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/* ─── Admin API (Vercel serverless, single self-contained file) ───
 * Serves /api/admin/login, /api/admin/responses and /api/admin/print
 * (URLs are mapped onto this one function via rewrites in vercel.json;
 * the internal router dispatches by path). Everything lives in this file
 * because Vercel compiles each api/* file standalone and does NOT trace
 * local imports — shared modules placed anywhere else (api/ or lib/) are
 * missing at runtime (ERR_MODULE_NOT_FOUND). Only node: builtins are
 * imported, which always resolve.
 *
 * Keeps the Google Apps Script URL hidden (the browser only ever talks to
 * the Vercel functions) and adds a login rate limit on top of the Apps
 * Script's own password check.
 *
 * Env vars (Vercel -> Settings -> Environment Variables):
 *   APPS_SCRIPT_URL  — the Google Apps Script web app URL (same as submit.ts)
 *   ADMIN_GS_SECRET  — shared secret; MUST match the Apps Script script
 *                      property ADMIN_API_SECRET
 *   ADMIN_PASSWORD   — (optional) local first-line login check
 *
 * Tokens are HMAC-SHA256 over a { exp } payload, signed with ADMIN_GS_SECRET,
 * minted AND verified by the Apps Script (single implementation). This layer
 * re-verifies before forwarding as defense in depth. ─── */

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const ADMIN_GS_SECRET = process.env.ADMIN_GS_SECRET || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// Login throttle: 5 attempts per IP per 15 min (in-memory — resets on cold start).
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, number[]>();

// Responses throttle: 30 list reads per IP per minute. Bounds how much PII a
// lifted token can pull from one address before the 4h expiry kicks in.
const RESPONSES_MAX_PER_MIN = 30;
const responseCalls = new Map<string, number[]>();

// Bounded-memory ceiling for both throttle maps (same pattern as api/submit.ts).
const THROTTLE_MAP_CAP = 1000;

const UPSTREAM_TIMEOUT_MS = 58_000; // < maxDuration (60s, Vercel Hobby ceiling) — doc generation may still finish on Google's side after this; the file appears in the Drive output folder either way.
const MAX_BODY_BYTES = 16 * 1024;
// Batch doc generation runs in chunks (the client sends ~8 rows per call and
// continues with the returned masterDocId). This cap guards the upstream call
// against a misbehaving client, not a feature limit.
const MAX_BATCH_ROWS_PER_CALL = 12;

// Google's Apps Script /exec edge runs bot protection: it 404s datacenter
// POSTs that carry no browser-like User-Agent (verified live — the fetch was
// answered with a 404 ppConfig challenge page, and 200 with this header).
// The fetch() default UA (none) silently broke the admin API from Vercel.
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

/* ─── Helpers ─── */
function sendJson(res: ServerResponse, status: number, obj: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    // Admin responses carry PII — never cache them anywhere.
    'Cache-Control': 'no-store, private',
  });
  res.end(JSON.stringify(obj));
}

/** Constant-time password comparison (compare SHA-256 digests). */
function constantTimeEquals(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest(),
  );
}

/** Record a failed login, pruning the map when it outgrows the cap. */
function recordLoginFailure(ip: string, now: number, recent: number[]): void {
  loginAttempts.set(ip, [...recent, now]);
  if (loginAttempts.size > THROTTLE_MAP_CAP) {
    for (const key of loginAttempts.keys()) {
      const times = loginAttempts.get(key) || [];
      if (!times.length || now - times[times.length - 1] >= LOGIN_WINDOW_MS) loginAttempts.delete(key);
    }
  }
}

/** Prune + record a responses read, bounding map size. */
function recordResponseCall(ip: string, now: number, recent: number[]): void {
  responseCalls.set(ip, [...recent, now]);
  if (responseCalls.size > THROTTLE_MAP_CAP) {
    for (const key of responseCalls.keys()) {
      const times = responseCalls.get(key) || [];
      if (!times.length || now - times[times.length - 1] >= 60_000) responseCalls.delete(key);
    }
  }
}

/** CORS: allow only the survey origin (+ Vercel preview domains + localhost). */
function setCorsHeaders(res: ServerResponse, origin?: string): void {
  const allowed =
    origin &&
    (origin === 'https://dilg-survey-web.vercel.app' ||
      /^https:\/\/dilg-survey-web(-[a-z0-9]+)?\.vercel\.app$/.test(origin) ||
      /^https?:\/\/localhost:\d+$/.test(origin));
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

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

async function readBody(req: IncomingMessage): Promise<string | null> {
  let bodyStr = '';
  try {
    for await (const chunk of req) {
      bodyStr += chunk;
      if (bodyStr.length > MAX_BODY_BYTES) return null;
    }
  } catch {
    return null;
  }
  return bodyStr;
}

function signPayload(payloadStr: string): string {
  return createHmac('sha256', ADMIN_GS_SECRET).update(payloadStr).digest('hex');
}

/** Verify the HMAC token minted by the Apps Script (same secret). */
function verifyToken(token: unknown): boolean {
  if (typeof token !== 'string' || !ADMIN_GS_SECRET) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  let payloadStr: string;
  try {
    payloadStr = Buffer.from(parts[0], 'base64url').toString('utf8');
  } catch {
    return false;
  }
  const expected = signPayload(payloadStr);
  const provided = parts[1];
  if (expected.length !== provided.length) return false;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return false;
  try {
    const payload = JSON.parse(payloadStr) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

/** Forward an admin action to the Apps Script web app, injecting the secret. */
async function forwardToAppsScript(
  action: string,
  payload: Record<string, unknown>,
  options: { attempts?: number; attemptTimeoutMs?: number; retryOnTimeout?: boolean } = {},
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  if (!APPS_SCRIPT_URL) return { status: 500, json: { ok: false, error: 'server_config_error' } };
  const attempts = options.attempts ?? 1;
  const attemptTimeoutMs = options.attemptTimeoutMs ?? UPSTREAM_TIMEOUT_MS;
  const retryOnTimeout = options.retryOnTimeout ?? false;
  const url = `${APPS_SCRIPT_URL}?action=${encodeURIComponent(action)}&secret=${encodeURIComponent(ADMIN_GS_SECRET)}`;
  const body = JSON.stringify(payload);

  let last: { status: number; json: Record<string, unknown> | null } | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * attempt));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), attemptTimeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: UPSTREAM_HEADERS,
        body,
        signal: controller.signal,
      });
      const text = await res.text().catch(() => '');
      let json: Record<string, unknown> | null = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      // A real Apps Script JSON answer is never retried — later attempts could
      // double-execute side effects (row writes, doc creation).
      if (json) return { status: res.status, json };
      // Non-JSON upstream body = Google served an error page instead of the
      // API ("This content is blocked" HTML, a 404 page, or the intermittent
      // datacenter bot-challenge that 404s with an HTML page — verified live:
      // the same POST returns 200 JSON from some Vercel egress IPs and a 404
      // HTML challenge from others). Not a real answer, so retry when budget
      // remains: the next invocation may egress from a different IP.
      last = {
        status: res.status,
        json: {
          ok: false,
          error: 'upstream_bad_response',
          detail: `upstream_http_${res.status}`,
        },
      };
    } catch (err) {
      const aborted = err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError';
      last = {
        status: aborted ? 504 : 502,
        json: {
          ok: false,
          error: aborted ? 'upstream_timeout' : 'upstream_unreachable',
          detail: aborted ? 'timeout' : 'network',
        },
      };
      // Timeouts on side-effecting actions are ambiguous (the doc/row may land
      // anyway) — stop retrying those. Read-only actions (login, responses)
      // retry freely, since a re-check is always safe.
      if (aborted && !retryOnTimeout) break;
    } finally {
      clearTimeout(timer);
    }
  }
  return last || { status: 502, json: { ok: false, error: 'upstream_unreachable', detail: 'network' } };
}

/* ─── Route handlers ─── */

async function handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
    return;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const recent = (loginAttempts.get(ip) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
  if (recent.length >= LOGIN_MAX_ATTEMPTS) {
    sendJson(res, 429, { ok: false, error: 'too_many_attempts' });
    return;
  }

  const bodyStr = await readBody(req);
  if (!bodyStr) {
    sendJson(res, 400, { ok: false, error: 'invalid_body' });
    return;
  }
  let body: { password?: string };
  try {
    body = JSON.parse(bodyStr);
  } catch {
    sendJson(res, 400, { ok: false, error: 'invalid_json' });
    return;
  }

  // First line of defense when ADMIN_PASSWORD is configured here (optional):
  // block before spending an upstream call. The Apps Script's own password
  // check remains authoritative.
  if (ADMIN_PASSWORD && !constantTimeEquals(body.password || '', ADMIN_PASSWORD)) {
    recordLoginFailure(ip, now, recent);
    sendJson(res, 401, { ok: false, error: 'invalid_credentials' });
    return;
  }

  // Read-only upstream check — retry freely through transient bot-challenges.
  // 3 × 19s ≈ 57s stays under the 60s Hobby ceiling.
  const upstream = await forwardToAppsScript(
    'login',
    { password: body.password || '' },
    { attempts: 3, attemptTimeoutMs: 19_000, retryOnTimeout: true },
  );
  const json = upstream.json || { ok: false, error: 'upstream_error' };
  if (json.ok !== true) {
    recordLoginFailure(ip, now, recent);
    const status = json.error === 'invalid_credentials' ? 401 : upstream.status;
    sendJson(res, status, json);
    return;
  }
  // Success: clear this IP's failure history.
  if (recent.length) loginAttempts.delete(ip);
  sendJson(res, 200, json);
}

async function handleResponses(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
    return;
  }
  const bodyStr = await readBody(req);
  if (!bodyStr) {
    sendJson(res, 400, { ok: false, error: 'invalid_body' });
    return;
  }
  let body: { token?: string };
  try {
    body = JSON.parse(bodyStr);
  } catch {
    sendJson(res, 400, { ok: false, error: 'invalid_json' });
    return;
  }
  if (!verifyToken(body.token)) {
    sendJson(res, 401, { ok: false, error: 'unauthorized' });
    return;
  }
  // PII throttle — only authenticated requests count (garbage tokens can't
  // burn a legitimate admin's quota).
  const ip = getClientIp(req);
  const now = Date.now();
  const recent = (responseCalls.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= RESPONSES_MAX_PER_MIN) {
    sendJson(res, 429, { ok: false, error: 'rate_limited' });
    return;
  }
  recordResponseCall(ip, now, recent);
  // Read-only upstream call — retry freely through transient bot-challenges.
  const upstream = await forwardToAppsScript(
    'responses',
    { token: body.token },
    { attempts: 3, attemptTimeoutMs: 19_000, retryOnTimeout: true },
  );
  const json = upstream.json || { ok: false, error: 'upstream_error' };
  sendJson(res, json.ok === true ? 200 : upstream.status, json);
}

async function handlePrint(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
    return;
  }
  const bodyStr = await readBody(req);
  if (!bodyStr) {
    sendJson(res, 400, { ok: false, error: 'invalid_body' });
    return;
  }
  let body: { token?: string; row?: number; tpl?: string; rows?: number[]; masterDocId?: string; final?: boolean; pdfDocId?: string; resume?: boolean };
  try {
    body = JSON.parse(bodyStr);
  } catch {
    sendJson(res, 400, { ok: false, error: 'invalid_json' });
    return;
  }
  if (!verifyToken(body.token)) {
    sendJson(res, 401, { ok: false, error: 'unauthorized' });
    return;
  }

  // Batch mode: rows[] → one document with one filled form per row. The client
  // splits a large selection into chunks and threads the masterDocId through;
  // the last chunk sets final=true and receives the document URL.
  if (Array.isArray(body.rows)) {
    const rows = body.rows.map(Number);
    if (rows.length === 0 || rows.some((r) => !Number.isInteger(r) || r < 2)) {
      sendJson(res, 400, { ok: false, error: 'invalid_rows' });
      return;
    }
    if (rows.length > MAX_BATCH_ROWS_PER_CALL) {
      sendJson(res, 400, {
        ok: false,
        error: 'batch_too_large',
        detail: `Select ${MAX_BATCH_ROWS_PER_CALL} or fewer responses per batch step.`,
      });
      return;
    }
    const upstream = await forwardToAppsScript('print', {
      token: body.token,
      rows,
      masterDocId: body.masterDocId || '',
      final: body.final === true,
      tpl: body.tpl || 'auto',
      resume: body.resume === true,
    });
    const json = upstream.json || { ok: false, error: 'upstream_error' };
    sendJson(res, json.ok === true ? 200 : upstream.status, json);
    return;
  }

  // PDF-only export for an already-finished batch document. The client calls
  // this after the final merge chunk so the heavy conversion never sits inside
  // the same 58s budget as the merges (which is what timed batch runs out).
  if (body.pdfDocId) {
    const upstream = await forwardToAppsScript('print', {
      token: body.token,
      pdfDocId: body.pdfDocId,
    });
    const json = upstream.json || { ok: false, error: 'upstream_error' };
    sendJson(res, json.ok === true ? 200 : upstream.status, json);
    return;
  }

  const row = Number(body.row);
  if (!Number.isInteger(row) || row < 2) {
    sendJson(res, 400, { ok: false, error: 'invalid_row' });
    return;
  }
  const upstream = await forwardToAppsScript('print', { token: body.token, row, tpl: body.tpl || 'auto' });
  const json = upstream.json || { ok: false, error: 'upstream_error' };
  sendJson(res, json.ok === true ? 200 : upstream.status, json);
}

/* ─── Router ───
 * Dispatch on the path tail so routing works whether the runtime hands us
 * the original URL (/api/admin/login) or the rewritten destination
 * (/api/admin?route=login from vercel.json). */
async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', 'http://internal');
  const viaQuery = url.searchParams.get('route');
  if (viaQuery === 'login') return handleLogin(req, res);
  if (viaQuery === 'responses') return handleResponses(req, res);
  if (viaQuery === 'print') return handlePrint(req, res);
  const path = url.pathname;
  if (path.endsWith('/login')) return handleLogin(req, res);
  if (path.endsWith('/responses')) return handleResponses(req, res);
  if (path.endsWith('/print')) return handlePrint(req, res);
  if (path.endsWith('/admin')) return handleLogin(req, res);
  sendJson(res, 404, { ok: false, error: 'not_found' });
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCorsHeaders(res, req.headers.origin as string | undefined);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  await route(req, res);
}
