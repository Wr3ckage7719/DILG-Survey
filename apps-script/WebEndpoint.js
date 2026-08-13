/**
 * WebEndpoint.gs
 * Web App endpoint for the Vercel-hosted survey.
 * Receives POST JSON, appends a row to the linked spreadsheet.
 *
 * Deploy: Publish → Deploy as web app
 *   - Execute as: Me
 *   - Who has access: Anyone
 *   - Copy the web app URL into the Vercel .env as VITE_APPS_SCRIPT_URL
 */

// ──────────────────────────────────
// Keep-warm (cold-start mitigation)
// ──────────────────────────────────
// The Apps Script web app sleeps after ~6 minutes of idle time; a cold POST
// takes ~27-40s. A time-driven trigger pings this URL every minute so the
// deployment never goes idle (warm POSTs complete in ~1-3s). The URL constant
// below is the LIVE deployment — it MUST match the deployment that Vercel's
// APPS_SCRIPT_URL points to. If a new deployment is ever created, update BOTH
// this constant (or the script property 'WEBAPP_URL') AND the Vercel env var
// BEFORE switching. A stale constant lets the live deployment go cold, which
// was the root cause of the "admin is slow" reports (20-40s on every login
// and data fetch even though the keep-warm trigger was installed).
var WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxGAbSu3N1x0iVaKGLmLIi8JgrR6mpmAdH00-rjCJZDldT_n6R1iUlqtz-sPPDjRUH3/exec';

function getWebAppUrl() {
  var prop = SCRIPT_PROP ? SCRIPT_PROP.getProperty('WEBAPP_URL') : null;
  return prop || WEBAPP_URL;
}

function keepWarm() {
  var url = getWebAppUrl();
  try {
    UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    Logger.log('keepWarm: pinged ' + url);
  } catch (err) {
    Logger.log('keepWarm error: ' + err);
  }
}

function installKeepWarmTrigger() {
  // Remove any existing keep-warm triggers first (avoids duplicates on re-run)
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === 'keepWarm') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // Every minute (the tightest interval Apps Script allows — everyMinutes only
  // accepts 1, 5, 10, 15, 30). The instance idle timeout is ~6 min, so a 1-min
  // ping keeps the deployment permanently warm.
  ScriptApp.newTrigger('keepWarm')
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log('keepWarm trigger installed (every minute).');
}

// One menu action installs every time-based trigger the deployment needs:
// keep-warm (every minute) + daily duplicate cleanup. Both are idempotent.
function installAllTriggers() {
  installKeepWarmTrigger();
  installCleanupTrigger();
  return 'Installed: keep-warm (every minute) + duplicate cleanup (daily 3 AM).';
}

// ──────────────────────────────────
// Bounded ref lookups
// ──────────────────────────────────
// Every write-then-confirm flow (retry dedupe, lost-response ref lookup) targets
// a reference written moments ago, so those scans only need the most recent
// rows — reading the whole column on every poll is wasted work. The daily
// cleanupDuplicateRefs() safety net keeps a full scan on purpose.
var DEFAULT_REF_SCAN_WINDOW = 200;

// Returns true if `ref` appears among the most recent rows' Reference Numbers.
function refExists(sheet, refCol, ref) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var numRows = Math.min(lastRow - 1, DEFAULT_REF_SCAN_WINDOW);
  var startRow = lastRow - numRows + 1;
  var vals = sheet.getRange(startRow, refCol + 1, numRows, 1).getValues();
  for (var r = 0; r < vals.length; r++) {
    if (String(vals[r][0]) === String(ref)) return true;
  }
  return false;
}

// ──────────────────────────────────
// Admin API (web app): login / responses / print
// ──────────────────────────────────
// All admin actions require the shared ADMIN_API_SECRET script property, sent
// as a ?secret= query parameter by the Vercel proxy (api/admin.ts) — or by the
// Vite dev proxy — so the Google Apps Script URL can never be called directly
// by a browser. Login additionally checks ADMIN_PASSWORD and mints an expiring
// HMAC token; responses/print verify that token (defense in depth: the Vercel
// function re-verifies it too before forwarding).
//
// Script Properties to configure (Extensions → Properties → Script properties):
//   ADMIN_PASSWORD      — the admin dashboard password
//   ADMIN_API_SECRET    — shared secret with the Vercel env ADMIN_GS_SECRET
//   RESPONSES_TAB_NAME  — optional: pin the tab that holds survey responses
//                         (mirrors Vercel's SHEET_TAB_NAME). Default detection:
//                         'Form Responses 1' → first tab with Reference Number.
//   WEBAPP_URL          — optional: live web app URL for keep-warm (falls back
//                         to the WEBAPP_URL constant above)

var ADMIN_TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (shorter = smaller PII exposure window)
var ADMIN_LOGIN_MAX_FAILS = 10;
var ADMIN_LOGIN_WINDOW_MIN = 10;

// Responses list: short-TTL script-cache so repeat loads (page open, refresh,
// search) don't re-read the whole sheet every time. Script cache is project-
// scoped; the endpoint stays rate-limited and the Vercel layer still sends
// Cache-Control: no-store to the browser.
var RESPONSES_CACHE_KEY = 'ADMIN_RESPONSES_V1';
var RESPONSES_CACHE_TTL_SECONDS = 12;

function adminSecret() {
  return SCRIPT_PROP.getProperty('ADMIN_API_SECRET') || '';
}

function adminPassword() {
  return SCRIPT_PROP.getProperty('ADMIN_PASSWORD') || '';
}

// The responses live on the sheet the survey writes to. The submit fast path
// pins its tab via Vercel's SHEET_TAB_NAME (e.g. 'Survey Data'); the Apps
// Script mirrors that with the RESPONSES_TAB_NAME script property. Detection
// order:
//   1. RESPONSES_TAB_NAME property (when set),
//   2. the conventional Google-Forms-linked 'Form Responses 1' — only when its
//      header row contains the Reference Number column (an empty or foreign
//      tab must not shadow the real data),
//   3. the first tab whose header row has Reference Number (the fast path's
//      own marker — guarantees the admin list and doc generation agree with
//      where submissions land),
//   4. fallback: the active sheet (historical behavior).
function getResponseSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pinned = SCRIPT_PROP.getProperty('RESPONSES_TAB_NAME');
  if (pinned) {
    var p = ss.getSheetByName(pinned);
    if (p) return p;
  }
  var named = ss.getSheetByName('Form Responses 1');
  if (named && sheetHasSurveyHeaders(named)) return named;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheetHasSurveyHeaders(sheets[i])) return sheets[i];
  }
  return named || SpreadsheetApp.getActiveSheet();
}

// Whether a tab's header row contains the survey's idempotency marker column.
function sheetHasSurveyHeaders(sheet) {
  try {
    if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return false;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).indexOf('Reference Number') !== -1) return true;
    }
  } catch (e) { /* best-effort — treat unreadable sheets as non-matching */ }
  return false;
}

function signPayload(payloadStr) {
  var sig = Utilities.computeHmacSha256Signature(payloadStr, adminSecret());
  var hex = [];
  for (var i = 0; i < sig.length; i++) {
    hex.push(('0' + (sig[i] & 0xff).toString(16)).slice(-2));
  }
  return hex.join('');
}

function createAdminToken() {
  var payload = JSON.stringify({ exp: Date.now() + ADMIN_TOKEN_TTL_MS });
  return Utilities.base64EncodeWebSafe(payload) + '.' + signPayload(payload);
}

function verifyAdminToken(token) {
  if (!token || !adminSecret()) return false;
  var parts = String(token).split('.');
  if (parts.length !== 2) return false;
  var payloadStr = '';
  try {
    payloadStr = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();
  } catch (err) {
    return false;
  }
  if (signPayload(payloadStr) !== parts[1]) return false;
  var payload = null;
  try {
    payload = JSON.parse(payloadStr);
  } catch (err) {
    return false;
  }
  return !!payload && payload.exp > Date.now();
}

function loginFailCount() {
  var cache = CacheService.getScriptCache();
  return parseInt(cache.get('ADMIN_LOGIN_FAILS') || '0', 10);
}

function doAdminLogin(body, e) {
  if (!adminSecret()) {
    return jsonOut({ ok: false, error: 'not_configured' });
  }
  if (String(e.parameter.secret || '') !== adminSecret()) {
    return jsonOut({ ok: false, error: 'forbidden' });
  }
  if (loginFailCount() >= ADMIN_LOGIN_MAX_FAILS) {
    return jsonOut({ ok: false, error: 'too_many_attempts' });
  }
  var pw = adminPassword();
  if (!pw) {
    return jsonOut({ ok: false, error: 'not_configured' });
  }
  if (!body.password || String(body.password) !== pw) {
    var cache = CacheService.getScriptCache();
    cache.put('ADMIN_LOGIN_FAILS', String(loginFailCount() + 1), ADMIN_LOGIN_WINDOW_MIN * 60);
    return jsonOut({ ok: false, error: 'invalid_credentials' });
  }
  CacheService.getScriptCache().remove('ADMIN_LOGIN_FAILS');
  return jsonOut({ ok: true, token: createAdminToken() });
}

function doAdminResponses(body, e) {
  if (!adminSecret()) {
    return jsonOut({ ok: false, error: 'not_configured' });
  }
  if (String(e.parameter.secret || '') !== adminSecret()) {
    return jsonOut({ ok: false, error: 'forbidden' });
  }
  if (!verifyAdminToken(body.token)) {
    return jsonOut({ ok: false, error: 'unauthorized' });
  }
  // Short-TTL cache hit: the list is read in full on every call and repeat
  // loads are the common case. Fresh enough that a just-submitted response
  // appears on the next load; on a miss the sheet is read as before.
  var cache = CacheService.getScriptCache();
  var cached = cache.get(RESPONSES_CACHE_KEY);
  if (cached) {
    try {
      var cachedPayload = JSON.parse(cached);
      if (cachedPayload && cachedPayload.rows) return jsonOut(cachedPayload);
    } catch (e) { /* malformed cache — fall through to a fresh read */ }
  }
  try {
    var sheet = getResponseSheet();
    var lastCol = sheet.getLastColumn();
    var lastRow = sheet.getLastRow();
    if (lastRow < 1) return jsonOut({ ok: true, rows: [], headers: [], count: 0 });
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    var rows = [];
    if (lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var r = 0; r < values.length; r++) {
        var obj = { __row: r + 2 }; // spreadsheet row number (header = 1) — used by print
        for (var c = 0; c < headers.length; c++) {
          var v = values[r][c];
          if (v instanceof Date) {
            v = Utilities.formatDate(v, 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss');
          } else if (v === null || v === undefined) {
            v = '';
          } else {
            v = String(v);
          }
          obj[headers[c]] = v;
        }
        rows.push(obj);
      }
    }
    var payload = { ok: true, headers: headers, rows: rows, count: rows.length };
    try {
      cache.put(RESPONSES_CACHE_KEY, JSON.stringify(payload), RESPONSES_CACHE_TTL_SECONDS);
    } catch (e) { /* cache is best-effort */ }
    return jsonOut(payload);
  } catch (err) {
    Logger.log('doAdminResponses error: ' + err);
    return jsonOut({ ok: false, error: 'list_failed', detail: err.toString() });
  }
}

function doAdminPrint(body, e) {
  if (!adminSecret()) {
    return jsonOut({ ok: false, error: 'not_configured' });
  }
  if (String(e.parameter.secret || '') !== adminSecret()) {
    return jsonOut({ ok: false, error: 'forbidden' });
  }
  if (!verifyAdminToken(body.token)) {
    return jsonOut({ ok: false, error: 'unauthorized' });
  }

  // PDF-only export for an ALREADY-finished batch document (exportBatchPdf in
  // TemplateEngine.js). The client fires this after the final merge chunk so
  // the heavy PDF conversion never competes with merge work inside the Vercel
  // relay window — merging AND converting in one call was what timed batches out.
  if (body.pdfDocId) {
    try {
      return jsonOut(exportBatchPdf(String(body.pdfDocId)));
    } catch (err) {
      Logger.log('doAdminPrint (pdf) error: ' + err);
      return jsonOut({ ok: false, error: 'generate_failed', detail: err.toString() });
    }
  }

  // Batch mode: ONE document containing one filled form per selected response.
  // The client sends rows in chunks (masterDocId + final mark the boundaries);
  // each chunk returns the master doc id, the last one also the PDF URL.
  if (Array.isArray(body.rows) && body.rows.length > 0) {
    try {
      var rows = body.rows.map(function (r) { return parseInt(r, 10); });
      var batch = generateBatchPrintable(
        rows,
        body.tpl || 'auto',
        String(body.masterDocId || ''),
        body.final === true,
        getResponseSheet(),
        body.resume === true
      );
      return jsonOut(batch);
    } catch (err) {
      Logger.log('doAdminPrint (batch) error: ' + err);
      return jsonOut({ ok: false, error: 'generate_failed', detail: err.toString() });
    }
  }

  var row = parseInt(body.row, 10);
  if (!row || row < 2) return jsonOut({ ok: false, error: 'invalid_row' });
  try {
    // Same engine the spreadsheet menu uses ("Generate Printable Sheet").
    // Returns a Google Doc URL (or an error message string). The sheet is
    // pinned so the doc is generated from the SAME sheet the list came from.
    var result = generatePrintableForRow(row, body.tpl || 'auto', getResponseSheet());
    if (result && result.indexOf('https://') === 0) {
      var out = { ok: true, url: result };
      // Surface any unfilled {{...}} (e.g. letterhead keys in the document
      // header section, which body-only replaceText cannot reach) instead of
      // silently shipping a raw placeholder.
      try {
        var leftovers = countLeftoverPlaceholders(DocumentApp.openByUrl(result));
        if (leftovers.length) out.leftovers = leftovers;
      } catch (e) { /* leftover check is best-effort */ }
      return jsonOut(out);
    }
    return jsonOut({ ok: false, error: 'generate_failed', detail: String(result || '') });
  } catch (err) {
    Logger.log('doAdminPrint error: ' + err);
    return jsonOut({ ok: false, error: 'generate_failed', detail: err.toString() });
  }
}

function doPost(e) {
  // Admin API dispatch (login / responses / print). Survey submissions have no
  // `action` field, so the submit path below is untouched. The action arrives
  // ONLY as a ?action= query parameter from the Vercel/Vite proxy (which also
  // injects the shared secret) — a body `action` key is never honored, so a
  // future survey field named "action" can never silently divert submissions.
  var body = {};
  try {
    body = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    body = {};
  }
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'login') return doAdminLogin(body, e);
  if (action === 'responses') return doAdminResponses(body, e);
  if (action === 'print') return doAdminPrint(body, e);

  try {
    var data = body;
    var sheet = SpreadsheetApp.getActiveSheet();
    var t0 = Date.now();

    // Ensure response sheet has headers
    var headers = getOrCreateHeaders(sheet, data);

    // Ensure the Language column exists (sheets created before this feature)
    var langCol = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).indexOf('Wika') !== -1) { langCol = i; break; }
    }
    if (langCol === -1) {
      headers.push('Wika ng sarbey');
      langCol = headers.length - 1;
      sheet.getRange(1, headers.length).setValue('Wika ng sarbey');
    }

    // Ensure the Reference Number column exists — the idempotency key that lets
    // the client retry a lost response without ever writing a duplicate row.
    var refCol = -1;
    for (var j = 0; j < headers.length; j++) {
      if (String(headers[j]).indexOf('Reference Number') !== -1) { refCol = j; break; }
    }
    if (refCol === -1 && data.refNumber) {
      headers.push('Reference Number');
      refCol = headers.length - 1;
      sheet.getRange(1, headers.length).setValue('Reference Number');
    }

    // Build row in header order
    var row = [];
    var petsaDate = new Date(); // submission timestamp
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h === 'Timestamp') {
        row.push(petsaDate);
      } else if (h === 'Petsa') {
        row.push(petsaDate); // use submission time
      } else if (h.indexOf('SQD') === 0 && h.indexOf('.') !== -1) {
        // SQD columns: extract row index from header "SQD0. Nasiyahan..."
        var m = h.match(/^SQD(\d+)\./);
        if (m && data.sqd && data.sqd[parseInt(m[1], 10)] !== undefined) {
          row.push(data.sqd[parseInt(m[1], 10)]);
        } else {
          row.push(''); // blank if not filled
        }
      } else {
        row.push(mapField(h, data));
      }
    }

    // Serialize writes: a retry can arrive while the original request is still
    // being processed. Without a lock, both could pass the dedupe check below
    // and append a duplicate row. The lock only guards this critical section.
    var lock = LockService.getScriptLock();
    var locked = false;
    try {
      locked = lock.tryLock(20000);
    } catch (lockErr) {
      locked = false; // degraded mode — proceed as before, no worse than today
    }
    try {
      // Idempotency: if this reference number is already recorded, treat the
      // resend as a success without writing another row.
      if (refCol !== -1 && data.refNumber && refExists(sheet, refCol, data.refNumber)) {
        Logger.log('dedupe: ref ' + data.refNumber + ' already recorded');
        return okResponse(true, Date.now() - t0);
      }

      sheet.appendRow(row);
      // Commit immediately so a concurrent request (possibly on another web app
      // instance) doing its own dedupe read can see this row right away.
      SpreadsheetApp.flush();
      Logger.log('doPost ok in ' + (Date.now() - t0) + 'ms ref=' + data.refNumber);
      return okResponse(false, Date.now() - t0);
    } finally {
      if (locked) lock.releaseLock();
    }
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return jsonOut({ success: false, error: err.toString(), durationMs: Date.now() - t0 });
  }
}

function okResponse(dedupe, durationMs) {
  return jsonOut(
    dedupe
      ? { success: true, dedupe: true, durationMs: durationMs }
      : { success: true, durationMs: durationMs }
  );
}

function getOrCreateHeaders(sheet, data) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    // First submission — write headers
    var hdrs = buildHeaders(data);
    sheet.appendRow(hdrs);
    return hdrs;
  }
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

function buildHeaders(data) {
  return [
    'Timestamp',
    'Pangalan ng tanggapan / operating unit',
    'Serbisyong ibinigay',
    'Serbisyong iba',
    'Uri ng Kliyente',
    'Edad',
    'Kasarian',
    'Rehiyon ng tirahan',
    'CC1. Alin sa mga sumusunod ang naglalarawan ng iyong kaalaman sa CC/Gabay?',
    'CC2. Kung alam ang Gabay, masasabi mo ba na ang Gabay ng tanggapang ito ay:',
    'CC3. Kung alam ang Gabay, gaano nakatulong ang Gabay sa iyong transaksiyon?',
    'SQD0. Nasiyahan ako sa serbisyo na aking hiniling.',
    'SQD1. Makatuwiran ang oras na aking inilaan para sa transaksiyon.',
    'SQD2. Sinunod ng tanggapan ang mga kahilingan at hakbang batay sa impormasyong ibinigay.',
    'SQD3. Ang mga hakbang sa pagproseso, kasama na ang pagbayad ay madali at simple lamang.',
    'SQD4. Madali kong nahanap ang impormasyon tungkol sa aking transaksiyon mula sa tanggapan o kanilang website.',
    'SQD5. Nagbayad ako ng makatuwirang halaga para sa aking transaksyon. (Kung ang serbisyo ay libre, piliin ang N/A)',
    'SQD6. Pakiramdam ko ay patas sa lahat o walang palakasan sa tanggapan para sa aking transaksiyon.',
    'SQD7. Matulungin at magalang ang pakikitungo sa akin ng mga kawani.',
    'SQD8. Nakuha ko ang kinakailangan ko mula sa tanggapan. (Kung tinanggihan man, sapat na ipinaliwanag.)',
    'Pangalan (optional)',
    'Contact number',
    'Email address',
    'Wika ng sarbey',
  ];
}

function mapField(header, data) {
  // Simple text fields
  if (header.indexOf('Reference Number') !== -1) return data.refNumber || '';
  if (header.indexOf('Wika') !== -1) return data.lang === 'en' ? 'English' : 'Tagalog';
  if (header.indexOf('Pangalan ng tanggapan') !== -1) return data.pangalanNgTanggapan || '';
  if (header.indexOf('Serbisyong ibinigay') !== -1) return data.serbisyongIbinigay || '';
  if (header.indexOf('Serbisyong iba') !== -1) return data.serbisyongIba || '';
  if (header.indexOf('Uri ng Kliyente') !== -1) return data.uriNgKliyente || '';
  if (header.indexOf('Edad') !== -1) return data.edad || '';
  if (header.indexOf('Kasarian') !== -1) return data.kasarian || '';
  if (header.indexOf('Rehiyon') !== -1) return data.rehiyon || '';
  if (header.indexOf('CC1') !== -1) return data.cc1 || '';
  if (header.indexOf('CC2') !== -1) return data.cc2 || '';
  if (header.indexOf('CC3') !== -1) return data.cc3 || '';
  if (header.indexOf('mungkahi') !== -1) return data.mgaMungkahi || '';
  if (header.indexOf('Pangalan (optional)') !== -1) return data.pangalan || '';
  if (header.indexOf('Contact number') !== -1) return data.contactNumber || '';
  if (header.indexOf('Email address') !== -1) return data.emailAddress || '';
  return '';
}

function doGet(e) {
  // Ref lookup: GET .../exec?ref=DILG-XXXX — read-only confirmation used by the
  // client as a final safety net ("was my submission recorded?") when a POST
  // response was lost (e.g. after a cold start). Never writes.
  if (e && e.parameter && e.parameter.ref) {
    return lookupRefResponse(String(e.parameter.ref));
  }
  // Status/diagnostics: GET .../exec?status=1 — shows whether the keep-warm and
  // daily-cleanup triggers are installed (used by the dev workflow + health checks).
  if (e && e.parameter && e.parameter.status) {
    return jsonOut(triggerStatus());
  }
  return ContentService
    .createTextOutput('DILG Survey Web Endpoint is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function triggerStatus() {
  var hasKeepWarm = false;
  var hasCleanup = false;
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var h = triggers[i].getHandlerFunction();
      if (h === 'keepWarm') hasKeepWarm = true;
      if (h === 'cleanupDuplicateRefs') hasCleanup = true;
    }
  } catch (err) {
    Logger.log('triggerStatus error: ' + err);
  }
  // mergeVersion + responsesTab let a deployment's actual code age be verified
  // from the outside (?status=1) — a stale saved deployment keeps serving its
  // old engine (e.g. pre-v9.4 code cannot fill short-key templates, which is
  // how "spreadsheet works but web prints placeholders" happened). If the URL
  // you open still reports an old MERGE_VERSION after a redeploy, the
  // deployment was not updated to a new version.
  var mergeVersion = 'unknown';
  var responsesTab = 'unknown';
  try {
    if (typeof MERGE_VERSION !== 'undefined') mergeVersion = MERGE_VERSION;
  } catch (e) { /* pre-v9.4 code has no MERGE_VERSION — itself a symptom */ }
  try {
    responsesTab = getResponseSheet().getName();
  } catch (e) { /* best-effort */ }
  return {
    status: 'ok',
    version: 'v11',
    mergeVersion: mergeVersion,
    responsesTab: responsesTab,
    keepWarmTriggerInstalled: hasKeepWarm,
    cleanupTriggerInstalled: hasCleanup,
    time: new Date().toISOString(),
  };
}

function lookupRefResponse(ref) {
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var refCol = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).indexOf('Reference Number') !== -1) { refCol = i; break; }
    }
    if (refCol === -1) return jsonOut({ saved: false });
    return jsonOut({ saved: refExists(sheet, refCol, ref) });
  } catch (err) {
    Logger.log('lookupRef error: ' + err);
    return jsonOut({ saved: false, error: err.toString() });
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ──────────────────────────────────
// Data-layer safety net: duplicate cleanup
// ──────────────────────────────────
// LockService is not reliably shared across web app instances (known Google
// issue), so the in-request dedupe in doPost is best-effort. This daily trigger
// scans the Reference Number column and removes any duplicate rows (keeping the
// first), guaranteeing the sheet can never keep a duplicated submission even in
// a worst-case race. Run it any time via the Advanced menu.
function cleanupDuplicateRefs() {
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var refCol = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).indexOf('Reference Number') !== -1) { refCol = i; break; }
    }
    if (refCol === -1) return 0;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return 0;
    var vals = sheet.getRange(2, refCol + 1, lastRow - 1, 1).getValues();
    var seen = {};
    var toDelete = [];
    for (var r = 0; r < vals.length; r++) {
      var v = String(vals[r][0]).trim();
      if (v === '') continue;
      if (seen[v]) {
        toDelete.push(r + 2); // sheet row (1-based; header is row 1)
      } else {
        seen[v] = true;
      }
    }
    // Delete bottom-up so earlier row indexes stay valid.
    toDelete.sort(function (a, b) { return b - a; });
    for (var d = 0; d < toDelete.length; d++) {
      sheet.deleteRow(toDelete[d]);
    }
    Logger.log('cleanupDuplicateRefs: removed ' + toDelete.length + ' duplicate rows');
    return toDelete.length;
  } catch (err) {
    Logger.log('cleanupDuplicateRefs error: ' + err);
    return -1;
  }
}

function installCleanupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === 'cleanupDuplicateRefs') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('cleanupDuplicateRefs')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  Logger.log('cleanup trigger installed (daily 3 AM).');
}

// Maintenance helper: removes test/diagnostic rows from the live sheet
// (used by the Advanced menu and by the dev workflow after endpoint tests).
function deleteTestRows() {
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var refCol = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).indexOf('Reference Number') !== -1) { refCol = i; break; }
    }
    if (refCol === -1) return 0;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return 0;
    var vals = sheet.getRange(2, refCol + 1, lastRow - 1, 1).getValues();
    var toDelete = [];
    var prefixes = ['REFTEST-', 'DEDUPE-TEST-', 'VERIFY-', 'AUDIT-', 'DILG-TEST-', 'DILG-RGNTEST-', 'DILG-SQDFULL-', 'DILG-VERIFY-'];
    for (var r = 0; r < vals.length; r++) {
      var v = String(vals[r][0]);
      for (var p = 0; p < prefixes.length; p++) {
        if (v.indexOf(prefixes[p]) === 0) { toDelete.push(r + 2); break; }
      }
    }
    toDelete.sort(function (a, b) { return b - a; });
    for (var d = 0; d < toDelete.length; d++) {
      sheet.deleteRow(toDelete[d]);
    }
    Logger.log('deleteTestRows: removed ' + toDelete.length + ' rows');
    return toDelete.length;
  } catch (err) {
    Logger.log('deleteTestRows error: ' + err);
    return -1;
  }
}
