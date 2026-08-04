/**
 * DILG Client Satisfaction Survey — Google Apps Script backend.
 *
 * Receives survey submissions (JSON) from the web app (forwarded through the
 * Vercel API proxy at /api/submit) and appends one row per response to this
 * Google Sheet.
 *
 * Deployment:
 *   Deploy > New deployment > Web app
 *     Execute as : Me (administrator068@gmail.com)
 *     Who has access : Anyone
 *   Copy the /exec URL into the APPS_SCRIPT_URL environment variable (Vercel).
 *
 * Column order is derived from the headers in row 1, so renaming headers in
 * the sheet does not break submissions.
 */

/** Name of the tab where survey responses are appended. */
var SHEET_NAME = 'Responses';

/** Column headers in the same order the Vite app sends fields. */
var HEADERS = [
  'Timestamp',
  'Reference Number',
  'Office',
  'Service',
  'Other Service',
  'Client Type',
  'Age',
  'Sex',
  'Region',
  'CC1',
  'CC2',
  'CC3',
  'SQD0',
  'SQD1',
  'SQD2',
  'SQD3',
  'SQD4',
  'SQD5',
  'SQD6',
  'SQD7',
  'SQD8',
  'Suggestions',
  'Name',
  'Contact Number',
  'Email Address',
  'Language',
];

/** Warm-up GET — keeps the web app instance alive so POSTs are fast. */
function doGet() {
  return ContentService.createTextOutput('OK');
}

/**
 * Main entry point. Expects the JSON body from the web app.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
function doPost(e) {
  try {
    var payload = (e && e.postData && e.postData.contents) || '{}';
    var data = JSON.parse(payload);

    var sheet = getOrCreateSheet_();
    var row = buildRow_(data);
    sheet.appendRow(row);

    return respond_(true, { refNumber: data.refNumber || '' });
  } catch (err) {
    console.error('doPost failed: ' + err);
    return respond_(false, { error: String(err) });
  }
}

/**
 * Run this once from the Apps Script editor to (re)create the Responses tab
 * with headers. Existing rows are preserved; only row 1 headers are ensured.
 */
function setupSheet() {
  getOrCreateSheet_();
}

/** Returns the Responses sheet, creating it with headers if missing. */
function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange('1:1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange('1:1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Maps the incoming JSON object to a row, positioned by the header names. */
function buildRow_(data) {
  var sqd = Array.isArray(data.sqd) ? data.sqd : [];

  var values = {
    'Timestamp': new Date(),
    'Reference Number': data.refNumber || '',
    'Office': data.pangalanNgTanggapan || '',
    'Service': data.serbisyongIbinigay || '',
    'Other Service': data.serbisyongIba || '',
    'Client Type': data.uriNgKliyente || '',
    'Age': data.edad || '',
    'Sex': data.kasarian || '',
    'Region': data.rehiyon || '',
    'CC1': data.cc1 || '',
    'CC2': data.cc2 || '',
    'CC3': data.cc3 || '',
    'Suggestions': data.mgaMungkahi || '',
    'Name': data.pangalan || '',
    'Contact Number': data.contactNumber || '',
    'Email Address': data.emailAddress || '',
    'Language': data.lang || 'tl',
  };

  for (var i = 0; i < 9; i++) {
    values['SQD' + i] = sqd[i] || '';
  }

  var row = [];
  for (var c = 0; c < HEADERS.length; c++) {
    row.push(values[HEADERS[c]] !== undefined ? values[HEADERS[c]] : '');
  }
  return row;
}

/** Wraps a result in a ContentService JSON response. */
function respond_(ok, extra) {
  var body = { ok: ok };
  for (var key in extra) {
    if (extra.hasOwnProperty(key)) body[key] = extra[key];
  }
  var output = ContentService.createTextOutput(JSON.stringify(body));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
