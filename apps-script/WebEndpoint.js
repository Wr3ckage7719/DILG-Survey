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
// takes ~27-40s. A time-driven trigger pings this URL every 5 minutes so the
// deployment stays warm (warm POSTs complete in ~1-3s). The URL constant below
// is the LIVE deployment; if a new deployment is ever created, store its URL in
// the script property 'WEBAPP_URL' (or update this constant) BEFORE changing it.
var WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyBMCCMGPOS16g7ZNWNdLO8NMcE-4BFrJdx3k98E88jGN5xT8m7otZFWakKlfx_HBp4/exec';

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
  ScriptApp.newTrigger('keepWarm')
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log('keepWarm trigger installed (every 5 minutes).');
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
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
      if (refCol !== -1 && data.refNumber) {
        var lastRow = sheet.getLastRow();
        var refValues = sheet.getRange(2, refCol + 1, Math.max(lastRow - 1, 1), 1).getValues();
        for (var r = 0; r < refValues.length; r++) {
          if (String(refValues[r][0]) === String(data.refNumber)) {
            Logger.log('dedupe: ref ' + data.refNumber + ' already recorded');
            return okResponse(true);
          }
        }
      }

      sheet.appendRow(row);
      Logger.log('doPost ok in ' + (Date.now() - t0) + 'ms ref=' + data.refNumber);
      return okResponse(false);
    } finally {
      if (locked) lock.releaseLock();
    }
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function okResponse(dedupe) {
  return ContentService
    .createTextOutput(JSON.stringify(dedupe ? { success: true, dedupe: true } : { success: true }))
    .setMimeType(ContentService.MimeType.JSON);
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

function doGet() {
  return ContentService
    .createTextOutput('DILG Survey Web Endpoint is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
