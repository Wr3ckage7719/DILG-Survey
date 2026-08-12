/**
 * TemplateEngine.gs
 * Merges form response data into Google Doc template → exports PDF.
 *
 * Template placeholders use {{fieldName}} syntax.
 * Radio/checkbox groups use individual markers per option:
 *   ☐ {{uri_mamamayan}} Mamamayan
 *
 * SQD grid uses table cells with row×column placeholders:
 *   {{sqd0_lubos_na_sang_ayon}}  {{sqd0_sang_ayon}} ...
 */

// ──────────────────────────────────
// DEPLOYMENT VERSION MARKER
// If the "Diagnose Deployment" menu reports anything other than this,
// the Apps Script project is running STALE code (files not re-pasted).
// ──────────────────────────────────
var MERGE_VERSION = 'v4-re2safe-glyph-agnostic';

// ──────────────────────────────────
// Radio groups: field title → { option label → exact template key }
// Keys match the template placeholders EXACTLY (no generation, no truncation).
var RADIO_KEYS = {
  'Uri ng Kliyente': {
    'Mamamayan': 'uri_mamamayan',
    'Negosyo': 'uri_negosyo',
    'Gobyerno (empleyado o mula sa ibang ahensiya)': 'uri_gobyerno_empleyado_o_mula_sa_ibang_ahensiya'
  },
  'Edad': {
    'Mas mababa sa 18 y/o': 'edad_mas_mababa_sa_18_yo',
    '18-24 y/o': 'edad_18_24_yo',
    '25-34 y/o': 'edad_25_34_yo',
    '35-44 y/o': 'edad_35_44_yo',
    '45-54 y/o': 'edad_45_54_yo',
    '55-64 y/o': 'edad_55_64_yo',
    '65 y/o pataas': 'edad_65_yo_pataas'
  },
  'Kasarian': {
    'Lalaki': 'kasarian_lalaki',
    'Babae': 'kasarian_babae',
    'LGBTQIA+': 'kasarian_lgbtqia',
    'Hindi nais sabihin': 'kasarian_hindi_nais_sabihin'
  },
  'CC1. Alin sa mga sumusunod ang naglalarawan ng iyong kaalaman sa CC/Gabay?': {
    'Alam ko kung ano ang Gabay, at nakita ko ang Gabay ng tanggapang ito.': 'cc1_alam_ko_kung_ano_ang_gabay_at_nakita_ko_ang_gabay_ng_t',
    'Alam ko kung ano ang Gabay, ngunit hindi ko nakita ang Gabay ng tanggapang ito.': 'cc1_alam_ko_kung_ano_ang_gabay_ngunit_hindi_ko_nakita_an',
    'Nalaman ko kung ano ang Gabay noong nakita ko ang Gabay ng tanggapang ito.': 'cc1_nalaman_ko_kung_ano_ang_gabay_noong_nakita_ko_ang_gab',
    'Hindi ko alam kung ano ang Gabay, at hindi ako nakakita ng Gabay sa tanggapang ito. (Piliin ang N/A sa CC2 at CC3.)': 'cc1_hindi_ko_alam_kung_ano_ang_gabay_at_hindi_ako_nakakak'
  },
  'CC2. Kung alam ang Gabay, masasabi mo ba na ang Gabay ng tanggapang ito ay:': {
    'Madaling makita': 'cc2_madaling_makita',
    'Bahagyang nakikita': 'cc2_bahagyang_nakikita',
    'Mahirap makita': 'cc2_mahirap_makita',
    'Hindi makita': 'cc2_hindi_makita',
    'N/A': 'cc2_na'
  },
  'CC3. Kung alam ang Gabay, gaano nakatulong ang Gabay sa iyong transaksiyon?': {
    'Lubos na nakatulong': 'cc3_lubos_na_nakatulong',
    'Bahagyang nakatulong': 'cc3_bahagyang_nakatulong',
    'Hindi nakatulong': 'cc3_hindi_nakatulong',
    'N/A': 'cc3_na'
  }
};

// English option labels → same template keys (for English-language rows).
// Field titles are the SAME Tagalog sheet headers; only option labels differ.
var RADIO_KEYS_EN = {
  'Uri ng Kliyente': {
    'Citizen': 'uri_mamamayan',
    'Business': 'uri_negosyo',
    'Government (Employee or from another agency)': 'uri_gobyerno_empleyado_o_mula_sa_ibang_ahensiya'
  },
  'Edad': {
    'Below 18 y/o': 'edad_mas_mababa_sa_18_yo',
    '18-24 y/o': 'edad_18_24_yo',
    '25-34 y/o': 'edad_25_34_yo',
    '35-44 y/o': 'edad_35_44_yo',
    '45-54 y/o': 'edad_45_54_yo',
    '55-64 y/o': 'edad_55_64_yo',
    '65 y/o and above': 'edad_65_yo_pataas'
  },
  'Kasarian': {
    'Man': 'kasarian_lalaki',
    'Woman': 'kasarian_babae',
    'LGBTQIA+': 'kasarian_lgbtqia',
    'Prefer not to say': 'kasarian_hindi_nais_sabihin'
  },
  'CC1. Alin sa mga sumusunod ang naglalarawan ng iyong kaalaman sa CC/Gabay?': {
    'I know what a CC is and I saw this office\u2019s CC.': 'cc1_alam_ko_kung_ano_ang_gabay_at_nakita_ko_ang_gabay_ng_t',
    'I know what a CC is but I did NOT see this office\u2019s CC.': 'cc1_alam_ko_kung_ano_ang_gabay_ngunit_hindi_ko_nakita_an',
    'I learned of the CC only when I saw this office\u2019s CC.': 'cc1_nalaman_ko_kung_ano_ang_gabay_noong_nakita_ko_ang_gab',
    'I do not know what a CC is and I did not see one in this office. (Answer \u2018N/A\u2019 on CC2 and CC3)': 'cc1_hindi_ko_alam_kung_ano_ang_gabay_at_hindi_ako_nakakak'
  },
  'CC2. Kung alam ang Gabay, masasabi mo ba na ang Gabay ng tanggapang ito ay:': {
    'Easy to see': 'cc2_madaling_makita',
    'Somewhat easy to see': 'cc2_bahagyang_nakikita',
    'Difficult to see': 'cc2_mahirap_makita',
    'Not visible at all': 'cc2_hindi_makita',
    'N/A': 'cc2_na'
  },
  'CC3. Kung alam ang Gabay, gaano nakatulong ang Gabay sa iyong transaksiyon?': {
    'Helped very much': 'cc3_lubos_na_nakatulong',
    'Somewhat helped': 'cc3_bahagyang_nakatulong',
    'Did not help': 'cc3_hindi_nakatulong',
    'N/A': 'cc3_na'
  }
};

// SQD rating label (either language) → canonical grid key
var RATING_KEYS = {
  'Lubos na sang-ayon': 'lubos_na_sang_ayon',
  'Strongly agree': 'lubos_na_sang_ayon',
  'Sang-ayon': 'sang_ayon',
  'Agree': 'sang_ayon',
  'Walang kinikilingan': 'walang_kinikilingan',
  'Neither agree nor disagree': 'walang_kinikilingan',
  'Hindi sang-ayon': 'hindi_sang_ayon',
  'Disagree': 'hindi_sang_ayon',
  'Lubos na hindi sang-ayon': 'lubos_na_hindi_sang_ayon',
  'Strongly disagree': 'lubos_na_hindi_sang_ayon',
  'N/A': 'na'
};

// Case-insensitive, apostrophe-insensitive comparison
function textEquals(a, b) {
  if (a === b) return true;
  return String(a || '').replace(/[\u2018\u2019]/g, "'").toLowerCase().trim() ===
         String(b || '').replace(/[\u2018\u2019]/g, "'").toLowerCase().trim();
}

// Option map for a field: English labels first (for EN rows), Tagalog as fallback
function optionMapFor(fieldTitle, isEnglish) {
  var merged = {};
  var order = isEnglish ? [RADIO_KEYS_EN, RADIO_KEYS] : [RADIO_KEYS];
  order.forEach(function(mapSet) {
    var map = mapSet[fieldTitle];
    if (!map) return;
    Object.keys(map).forEach(function(label) {
      if (!merged[label]) merged[label] = map[label];
    });
  });
  return merged;
}

// Map a stored rating label (TL or EN) → canonical grid key
function ratingKeyFor(value) {
  var v = String(value || '').trim();
  if (!v) return '';
  var norm = String(v).replace(/[\u2018\u2019]/g, "'").toLowerCase();
  var labels = Object.keys(RATING_KEYS);
  for (var i = 0; i < labels.length; i++) {
    if (labels[i].toLowerCase() === norm) return RATING_KEYS[labels[i]];
  }
  return '';
}

// SQD columns (for grid placeholder generation)
var SQD_COLUMNS = [
  'Lubos na sang-ayon',
  'Sang-ayon',
  'Walang kinikilingan',
  'Hindi sang-ayon',
  'Lubos na hindi sang-ayon',
  'N/A'
];

var SQD_ROWS = 9; // SQD0 through SQD8

// All placeholder keys a fully-prepared template must contain.
// TL and EN templates share the SAME placeholder set (89 keys).
function expectedTemplateKeys() {
  var keys = [];
  var titles = Object.keys(RADIO_KEYS);
  titles.forEach(function(t) {
    Object.keys(RADIO_KEYS[t]).forEach(function(label) {
      var k = RADIO_KEYS[t][label];
      if (keys.indexOf(k) === -1) keys.push(k);
    });
  });
  ['cc2_na', 'cc3_na'].forEach(function(k) {
    if (keys.indexOf(k) === -1) keys.push(k);
  });
  for (var r = 0; r < SQD_ROWS; r++) {
    for (var c = 0; c < SQD_COLUMNS.length; c++) {
      var k2 = sqdCellKey(r, SQD_COLUMNS[c]);
      if (keys.indexOf(k2) === -1) keys.push(k2);
    }
  }
  ['pangalanNgTanggapan', 'serbisyongIbinigay', 'petsa', 'rehiyon', 'mgaMungkahi', 'pangalan', 'contactNumber', 'emailAddress'].forEach(function(k) {
    if (keys.indexOf(k) === -1) keys.push(k);
  });
  return keys;
}

// ──────────────────────────────────
// Service labels: Tagalog (stored) → English (for English template)
// ──────────────────────────────────

var EN_SERVICES = {
  'Pagtanggap ng mga papasok na komunikasyon at dokumento (Receiving of Letters, Communications, and Other Official Documents)': 'Receiving of incoming communications and documents (Letters, Communications, and Other Official Documents)',
  'Pagtanggap at pagruruta ng mga sulat, memorandum, at iba pang opisyal na dokumento': 'Receiving and routing of letters, memoranda, and other official documents',
  'Pagbibigay ng impormasyon at public assistance': 'Providing information and public assistance',
  'Pagtanggap at pagproseso ng mga kahilingan at dokumento': 'Receiving and processing of requests and documents',
  'Pagbibigay ng technical assistance at capacity development': 'Providing technical assistance and capacity development',
  'Pagsasagawa ng monitoring at evaluation ng mga programa at proyekto': 'Conducting monitoring and evaluation of programs and projects',
  'Pagbibigay ng orientation, seminar, at training': 'Providing orientation, seminars, and training',
  'Pagproseso ng mga reklamo at feedback ng mamamayan': 'Processing of citizen complaints and feedback',
  'Pagpapalabas ng mga sertipikasyon, endorsements, at rekomendasyon': 'Issuance of certifications, endorsements, and recommendations',
  'Pagbibigay ng legal at policy advisory services': 'Providing legal and policy advisory services',
  'Pangangasiwa at koordinasyon ng mga programa ng pamahalaan': 'Managing and coordinating government programs',
  'Pagsasagawa ng inspeksyon at validation': 'Conducting inspections and validation',
  'Pangongolekta at pamamahala ng datos at ulat': 'Collecting and managing data and reports',
  'Pagbibigay ng online services at digital platforms': 'Providing online services and digital platforms',
  'Other/s (Tukuyin ang iba pang serbisyo)': 'Other/s (Specify other service)'
};

// ──────────────────────────────────
// Read a single response row into key-value map
// ──────────────────────────────────

function readResponseRow(rowIndex, sheet) {
  sheet = sheet || SpreadsheetApp.getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

  var data = {};
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i] ? headers[i].toString().trim() : '';
    var v = values[i];
    if (v === null || v === undefined || v === '') {
      v = '';
    } else if (v instanceof Date) {
      // Simple date for print: "July 28, 2026"
      v = Utilities.formatDate(v, 'Asia/Manila', 'MMMM dd, yyyy');
    } else {
      v = v.toString().trim();
    }
    if (h) data[h] = v;
  }

  // If form has no Petsa question, derive from Timestamp
  var hasPetsa = false;
  Object.keys(data).forEach(function(k) {
    if (/Petsa/i.test(k)) hasPetsa = true;
  });
  if (!hasPetsa && data['Timestamp']) {
    data['Petsa'] = data['Timestamp'];
  }

  return data;
}

// ──────────────────────────────────
// Filename-safe date from Petsa column (yyyy-MM-dd)
// ──────────────────────────────────

function getRawDateForFilename(rowIndex, sheet) {
  sheet = sheet || SpreadsheetApp.getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Try Petsa column first
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === 'Petsa') {
      var v = sheet.getRange(rowIndex, i + 1).getValue();
      if (v instanceof Date) {
        return Utilities.formatDate(v, 'Asia/Manila', 'yyyy-MM-dd');
      }
      if (v) return v.toString().split('T')[0];
    }
  }

  // Fallback: Timestamp column
  for (var j = 0; j < headers.length; j++) {
    if (headers[j] === 'Timestamp') {
      var ts = sheet.getRange(rowIndex, j + 1).getValue();
      if (ts instanceof Date) {
        return Utilities.formatDate(ts, 'Asia/Manila', 'yyyy-MM-dd');
      }
      break;
    }
  }

  return Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd');
}

// ──────────────────────────────────
// SQD cell placeholder key
// ──────────────────────────────────

function sqdCellKey(rowIndex, colLabel) {
  var colSuffix = colLabel
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')    // "sang-ayon" → "sang_ayon"
    .replace(/\//g, '')    // "N/A" → "na"
    .replace('í', 'i')
    .replace('ó', 'o')
    .replace('ú', 'u')
    .toLowerCase();

  return 'sqd' + rowIndex + '_' + colSuffix;
}

// ──────────────────────────────────
// Core merge: fill template Google Doc with response data
// ──────────────────────────────────

function mergeResponseIntoDoc(doc, data, isEnglish) {
  var body = doc.getBody();

  // ── 1. Simple text fields ──
  var simpleFields = [
    { match: 'pangalanNgTanggapan', value: getValueByPattern(data, /Pangalan ng tanggapan/) },
    { match: 'serbisyongIbinigay', value: getValueByPattern(data, /Serbisyong ibinigay/) },
    { match: 'petsa', value: getValueByPattern(data, /Petsa/) },
    { match: 'rehiyon', value: getValueByPattern(data, /Rehiyon/) },
    { match: 'mgaMungkahi', value: getValueByPattern(data, /mungkahi/) },
    { match: 'pangalan', value: getValueByPattern(data, /Pangalan \(optional\)/) },
    { match: 'contactNumber', value: getValueByPattern(data, /Contact number/) },
    { match: 'emailAddress', value: getValueByPattern(data, /Email address/) }
  ];
  var serbisyoVal = simpleFields[1].value;
  // Exact match only: the "Other/s" option stores one of these two canonical
  // strings. A substring check would falsely match legitimate services that
  // mention "Other Official Documents" (e.g. "Pagtanggap ng mga papasok na
  // komunikasyon... Other Official Documents"), rewriting the service name.
  var isOtherService =
    serbisyoVal === 'Other/s (Tukuyin ang iba pang serbisyo)' ||
    serbisyoVal === 'Other/s (Specify other service)';
  if (serbisyoVal) {
    if (isOtherService) {
      // "Other/s" — use the typed-in service text when available
      var otherVal = getValueByPattern(data, /Serbisyong iba|Kung.*Other/);
      if (otherVal) {
        simpleFields[1].value = otherVal;
      } else if (isEnglish) {
        simpleFields[1].value = 'Other/s (Specify other service)';
      }
    } else if (isEnglish && EN_SERVICES[serbisyoVal]) {
      simpleFields[1].value = EN_SERVICES[serbisyoVal];
    }
  }

  simpleFields.forEach(function(f) {
    if (f.value !== null) body.replaceText(ciPattern(f.match), f.value);
  });

  // ── 2. Radio groups (checkbox-style fill) ──
  // Handles: ☐{{key}}, ☐ {{key}}, and plain {{key}}
  var radioFieldTitles = Object.keys(RADIO_KEYS);
  radioFieldTitles.forEach(function(fieldTitle) {
    var optionMap = optionMapFor(fieldTitle, isEnglish);
    var selected = getValueByPattern(data, new RegExp(fieldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 30)));

    var optionLabels = Object.keys(optionMap);
    optionLabels.forEach(function(optionLabel) {
      var key = optionMap[optionLabel];
      var mark = textEquals(selected, optionLabel) ? '☑' : '☐';
      // Glyph class covers ☐ □ ☑ ☒ ■ ✓ ✗ — converted DOCX templates may use
      // a different box glyph than ☐. The pure Tagalog template has NO glyphs,
      // so patterns 1-2 are no-ops there and pattern 3 does all the work.
      // NOTE: GAS replaceText uses RE2 — no \uXXXX escapes allowed, hence
      // the literal characters below.
      var glyph = '[☐□☑☒■✓✗]';
      // 1. glyph + {{key}} + glyph (duplicate checkbox after placeholder)
      body.replaceText(glyph + '[ \\t]*' + ciPattern(key) + '[ \\t]*' + glyph, mark);
      // 2. glyph + {{key}} or glyph {{key}} — standard case
      body.replaceText(glyph + '[ \\t]*' + ciPattern(key), mark);
      // 3. plain {{key}} with no glyph prefix (Tagalog template style)
      body.replaceText(ciPattern(key), mark);
    });
  });

  // ── 3. SQD grid via table ──
  fillSqdTable(body, data);

  // ── 4. Verify: check for leftover placeholders ──
  var remaining = body.getText().match(/\{\{[^{}]+\}\}/g);
  if (remaining && remaining.length > 0) {
    Logger.log('WARNING: ' + remaining.length + ' placeholders NOT filled:');
    remaining.forEach(function(p) { Logger.log('  ' + p); });
  } else {
    Logger.log('All placeholders filled successfully.');
  }

  Logger.log('Merge complete for doc: ' + doc.getName());
}

// ──────────────────────────────────
// Diagnostic: dump merge state for debugging
// Run from Apps Script editor → view Logs
// ──────────────────────────────────

function debugMerge(rowIndex) {
  // Auto-detect row if not provided (run from editor)
  if (!rowIndex) {
    var activeRow = SpreadsheetApp.getActiveSheet().getActiveCell().getRow();
    rowIndex = activeRow >= 2 ? activeRow : 2;
    Logger.log('Auto-detected row: ' + rowIndex + ' (from active cell)');
  }

  var sheet = SpreadsheetApp.getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

  Logger.log('=== SHEET HEADERS (' + headers.length + ' columns) ===');
  for (var i = 0; i < headers.length; i++) {
    Logger.log('  Col ' + i + ': "' + headers[i] + '" = "' + values[i] + '"');
  }

  var data = readResponseRow(rowIndex);
  Logger.log('=== DATA MAP KEYS ===');
  Object.keys(data).forEach(function(k) {
    Logger.log('  "' + k + '" = "' + data[k] + '"');
  });

  Logger.log('=== SIMPLE FIELD MATCHES ===');
  var patterns = [
    { name: 'pangalanNgTanggapan', pattern: /Pangalan ng tanggapan/ },
    { name: 'serbisyongIbinigay', pattern: /Serbisyong ibinigay/ },
    { name: 'petsa', pattern: /Petsa/ },
    { name: 'rehiyon', pattern: /Rehiyon/ }
  ];
  patterns.forEach(function(p) {
    var v = getValueByPattern(data, p.pattern);
    Logger.log('  ' + p.name + ': ' + (v ? '"' + v + '"' : 'NOT FOUND'));
  });

  Logger.log('=== SQD RESPONSES ===');
  var sqd = extractSqdResponses(data);
  for (var r = 0; r < sqd.length; r++) {
    Logger.log('  SQD' + r + ': "' + sqd[r] + '"');
  }

  return 'Debug complete. Check View → Logs in Apps Script editor.';
}

// ──────────────────────────────────
// Extract SQD responses from sheet data
// Google Forms grid → sheet columns named "SQD0. Nasiyahan ako..."
// Each cell = selected rating label
// ──────────────────────────────────

function extractSqdResponses(data) {
  var responses = [];
  for (var r = 0; r < SQD_ROWS; r++) {
    // Google Forms grid creates headers like:
    // "Gaano ka sang-ayon... [SQD0. Nasiyahan...]"
    // Match "SQD{N}." anywhere in the header string
    var pattern = new RegExp('SQD' + r + '\\.', 'i');
    var found = null;
    var keys = Object.keys(data);
    for (var k = 0; k < keys.length; k++) {
      if (pattern.test(keys[k])) {
        found = data[keys[k]];
        break;
      }
    }
    responses.push(found || '');
  }
  return responses;
}

// ──────────────────────────────────
// SQD fill: tables first, fallback to paragraph placeholders
// ──────────────────────────────────

function fillSqdTable(body, data) {
  var sqdResponses = extractSqdResponses(data);

  // Precompute the SELECTED COLUMN SUFFIX per row, e.g. 'lubos_na_sang_ayon'.
  // Grid placeholders are {{sqdN_<suffix>}} — compare suffixes only.
  var selectedKeys = {};
  for (var r = 0; r < SQD_ROWS; r++) {
    if (sqdResponses[r]) {
      selectedKeys[r] = ratingKeyFor(sqdResponses[r]);
      if (!selectedKeys[r]) {
        // Rare/unmapped label: derive the suffix from the raw value
        selectedKeys[r] = sqdCellKey(r, sqdResponses[r]).replace(/^sqd\d+_/, '');
      }
    }
  }

  // ── Table path: scan EVERY cell, fix any {{sqd...}} found.
  // No position assumptions — works with any table layout.
  var tables = body.getTables();
  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    var numRows = table.getNumRows();
    for (var r2 = 0; r2 < numRows; r2++) {
      var rowObj = table.getRow(r2);
      var numCells = rowObj.getNumCells();
      for (var c = 0; c < numCells; c++) {
        var cell = rowObj.getCell(c);
        var text = cell.getText();
        var m = text.match(/\{\{sqd(\d+)_([a-z0-9_]+)\}\}/i);
        if (m) {
          var rowNum = parseInt(m[1], 10);
          var isSelected = m[2].toLowerCase() === selectedKeys[rowNum];
          cell.setText(isSelected ? '✓' : '');
        }
      }
    }
  }

  // ── Paragraph fallback: handles {{sqd...}} outside tables.
  // No-op for keys already replaced above (pattern won't match).
  for (var r3 = 0; r3 < SQD_ROWS; r3++) {
    for (var c3 = 0; c3 < SQD_COLUMNS.length; c3++) {
      var key3 = sqdCellKey(r3, SQD_COLUMNS[c3]);
      var suffix3 = key3.replace(/^sqd\d+_/, '');
      var mark3 = (suffix3 === selectedKeys[r3]) ? '✓' : '';
      body.replaceText(ciPattern(key3), mark3);
    }
  }
}

// ──────────────────────────────────
// Full template repair (run once from menu).
// Goal: template contains ONLY pure {{placeholders}} at each
// checkbox position — no literal ☐ anywhere. The merge writes
// ☑/☐ itself, so output matches the blank form layout exactly.
// ──────────────────────────────────

function repairTemplate() {
  var ui = SpreadsheetApp.getUi();
  var templateDocId = SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID');
  if (!templateDocId) {
    ui.alert('Walang template na naka-set.');
    return;
  }

  var doc = DocumentApp.openById(templateDocId);
  var body = doc.getBody();

  // Step 1: merge orphan "☐ {{key}}" lines into label lines
  var merged = mergeOrphanPlaceholders(body);
  var tables = body.getTables();
  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    for (var r = 0; r < table.getNumRows(); r++) {
      var row = table.getRow(r);
      for (var c = 0; c < row.getNumCells(); c++) {
        merged += mergeOrphanPlaceholders(row.getCell(c));
      }
    }
  }

  // Step 2: strip literal ☐ BEFORE placeholders (with any spaces/tabs)
  body.replaceText('☐[ \t]*{{', '{{');

  // Step 3: strip literal ☐ AFTER placeholders (duplicate checkboxes)
  body.replaceText('}}[ \t]*☐', '}}');

  // Step 4: fix adjacency created by strips (known cramped spot)
  body.replaceText('LGBTQIA+{{', 'LGBTQIA+\t{{');

  doc.saveAndClose();
  ui.alert('Template Repaired',
    'Orphan lines merged: ' + merged + '\n' +
    'Literal ☐ symbols stripped.\n\n' +
    'Template now uses pure {{placeholders}}.\n' +
    'Output will match the blank form layout.\n\n' +
    'Generate Printable Sheet to verify.',
    ui.ButtonSet.OK);
}

function mergeOrphanPlaceholders(container) {
  var paragraphs = getParagraphsOf(container);
  var count = 0;

  // Backwards so deletions don't shift unprocessed indices
  for (var i = paragraphs.length - 2; i >= 0; i--) {
    var text = paragraphs[i].getText().trim();
    var m = text.match(/^☐\s*(\{\{[a-z0-9_]+\}\})$/i);
    if (!m) continue;

    var next = paragraphs[i + 1];
    var nextText = next.getText().trim();

    // Skip if next line empty or starts with its own placeholder
    if (nextText.length === 0 || nextText.indexOf('{{') === 0) continue;

    // Insert placeholder at start of label line (keeps label formatting)
    try {
      next.editAsText().insertText(0, m[1] + ' ');
      paragraphs[i].removeFromParent();
      count++;
      Logger.log('Merged: ' + m[1] + ' → "' + nextText.substring(0, 40) + '"');
    } catch (e) {
      Logger.log('Skip (cannot edit): ' + m[1]);
    }
  }
  return count;
}

// ponytail: TableCell has no getParagraphs() in GAS. Iterate children manually.
function getParagraphsOf(container) {
  if (container.getParagraphs) return container.getParagraphs();
  var paras = [];
  for (var i = 0; i < container.getNumChildren(); i++) {
    var child = container.getChild(i);
    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      paras.push(child.asParagraph());
    }
  }
  return paras;
}

// ──────────────────────────────────
// Helper: case-insensitive regex pattern for {{placeholder}}
// Escape braces for regex, prefix (?i) flag
// ──────────────────────────────────

function ciPattern(key) {
  // GAS replaceText uses RE2 regex. {{ and }} are literal
  // (not quantifiers) so no escaping needed. Simple = reliable.
  return '{{' + key + '}}';
}

// ──────────────────────────────────
// Main: generate printable sheet for a given row
// Returns: Google Doc URL (https://...) or an error message string.
// templateChoice: 'auto' (use row's "Wika ng sarbey") | 'en' | 'tl'
// ──────────────────────────────────

function generatePrintableForRow(rowIndex, templateChoice, sheet) {
  var data = readResponseRow(rowIndex, sheet);
  var isEnglish = resolveTemplateChoice(data, templateChoice);
  var templateDocId = isEnglish
    ? SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN')
    : SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID');

  if (!templateDocId) {
    return isEnglish
      ? 'English ang wikang ginamit ng row na ito, pero walang naka-set na English template.\n\n' +
        'Pumunta sa Settings at i-set ang "English Template Document".'
      : 'Walang naka-set na template document.\n\n' +
        'Gamitin ang DILG Survey > Generate Template Document\n' +
        'o maglagay ng Google Doc ID sa Settings.';
  }

  // ── Validate template ──
  var templateFile;
  try {
    templateFile = DriveApp.getFileById(templateDocId);
  } catch (e) {
    return 'Ang Template Document ID ay hindi valid o deleted na.\n\nError: ' + e.message;
  }

  // Must be a native Google Doc — .docx files not supported
  var mimeType = templateFile.getMimeType();
  if (mimeType !== 'application/vnd.google-apps.document') {
    return 'Ang naka-set na template ay hindi Google Docs format (current: ' + mimeType + ').\n\n' +
      'Gawin ito:\n' +
      '1. Buksan ang file sa Google Drive\n' +
      '2. Right-click > Open with > Google Docs\n' +
      '3. Kopyahin ang bagong Document ID\n' +
      '4. I-paste sa Settings';
  }

  // ── Copy template, merge, export ──
  var outputFolder = getOutputFolder();
  var responseId = data['Response ID'] || rowIndex;
  var dateStr = getRawDateForFilename(rowIndex, sheet);
  var fileName = 'DILG_Survey_' + responseId + '_' + dateStr + (isEnglish ? '_EN' : '_TL');

  var copyFile = templateFile.makeCopy(fileName, outputFolder);

  // Retry: Drive may need a moment to propagate the copy
  var copyDoc = null;
  for (var attempt = 0; attempt < 5; attempt++) {
    try {
      copyDoc = DocumentApp.openById(copyFile.getId());
      break;
    } catch (e) {
      if (attempt < 4) {
        Utilities.sleep(500); // Wait 0.5s, retry
      } else {
        return 'Nag-fail ang pagbukas ng document copy pagkatapos ng 5 tries.\n\nError: ' + e.message;
      }
    }
  }

  mergeResponseIntoDoc(copyDoc, data, isEnglish);
  copyDoc.saveAndClose();

  // Export PDF
  var pdfBlob = copyFile.getAs('application/pdf');
  var pdfName = fileName + '.pdf';
  outputFolder.createFile(pdfBlob).setName(pdfName);

  return copyFile.getUrl();
}

// ──────────────────────────────────
// Batch: merge MULTIPLE responses into ONE document
// (one filled form per response, each starting on a new page).
//
// Works in "chunks": the client sends a few rows at a time to stay under the
// Vercel 60s ceiling. Every call returns the master document's id; the LAST
// chunk (isFinal=true) additionally exports the PDF and returns the doc URL.
// ──────────────────────────────────

// Append a deep copy of every child element of srcBody to destBody, preserving
// formatting and inline images. Used to stack filled template copies into the
// single master batch document.
//
// Two layout pitfalls are handled here (both verified causes of "the first page
// is perfect but appended pages drift"):
//  1. Trailing page breaks / empty paragraphs are trimmed from the copied
//     entry — the caller adds exactly ONE page break before each entry, so any
//     copied break would push the entry one page further (cumulative drift) or
//     create a blank page when the template itself ends with one.
//  2. Table column widths are re-applied explicitly after appendTable():
//     Google's Document service does not reliably carry them through
//     copy(), so a copied table re-auto-fits from its content and its columns
//     land at different positions than the template's.
function appendBodyElements(destBody, srcBody) {
  // Snapshot the children
  var children = [];
  var count = srcBody.getNumChildren();
  for (var i = 0; i < count; i++) children.push(srcBody.getChild(i));

  // Trim leading breaks/empty paragraphs
  while (children.length) {
    var head = children[0];
    var headType = head.getType();
    if (headType === DocumentApp.ElementType.PAGE_BREAK) { children.shift(); continue; }
    if (headType === DocumentApp.ElementType.PARAGRAPH && head.asParagraph().getText().trim() === '') {
      children.shift();
      continue;
    }
    break;
  }
  // Trim trailing breaks/empty paragraphs
  while (children.length) {
    var tail = children[children.length - 1];
    var tailType = tail.getType();
    if (tailType === DocumentApp.ElementType.PAGE_BREAK) { children.pop(); continue; }
    if (tailType === DocumentApp.ElementType.PARAGRAPH && tail.asParagraph().getText().trim() === '') {
      children.pop();
      continue;
    }
    break;
  }

  for (var j = 0; j < children.length; j++) {
    var el = children[j];
    var type = el.getType();
    if (type === DocumentApp.ElementType.PARAGRAPH) {
      destBody.appendParagraph(el.asParagraph().copy());
    } else if (type === DocumentApp.ElementType.TABLE) {
      appendCopiedTable(destBody, el.asTable());
    } else if (type === DocumentApp.ElementType.LIST_ITEM) {
      destBody.appendListItem(el.asListItem().copy());
    } else if (type === DocumentApp.ElementType.HORIZONTAL_RULE) {
      destBody.appendHorizontalRule();
    } else if (type === DocumentApp.ElementType.INLINE_IMAGE) {
      destBody.appendImage(el.asInlineImage().copy());
    }
  }
}

// Append a table copy, then explicitly re-apply the source column widths so the
// copied grid lines up exactly like the template's. Columns without a set width
// (null) are left to auto-fit — same as the source.
function appendCopiedTable(destBody, srcTable) {
  var appended = destBody.appendTable(srcTable.copy());
  if (srcTable.getNumRows() === 0) return;
  var colCount = srcTable.getRow(0).getNumCells();
  for (var c = 0; c < colCount; c++) {
    var w = srcTable.getColumnWidth(c);
    if (w) appended.setColumnWidth(c, w);
  }
}

// Fill a fresh copy of one row's template, append it to the master (each
// entry starts on a new page), then trash the temp copy.
function appendRowEntry(masterBody, rowIndex, templateChoice, sheet, outputFolder) {
  var data = readResponseRow(rowIndex, sheet);
  var isEnglish = resolveTemplateChoice(data, templateChoice);
  var tplId = isEnglish
    ? SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN')
    : SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID');
  if (!tplId) throw new Error(isEnglish ? 'No English template set.' : 'No template set.');

  var tplFile = DriveApp.getFileById(tplId);
  var tempFile = tplFile.makeCopy('_batch_tmp_' + rowIndex, outputFolder);

  // Retry: Drive may need a moment to propagate the copy.
  var tempDoc = null;
  for (var attempt = 0; attempt < 5; attempt++) {
    try {
      tempDoc = DocumentApp.openById(tempFile.getId());
      break;
    } catch (e) {
      if (attempt < 4) Utilities.sleep(500);
      else throw e;
    }
  }
  try {
    mergeResponseIntoDoc(tempDoc, data, isEnglish);
    tempDoc.saveAndClose();
    // Reopen for a clean read of the filled body (cached handles can lag).
    var filled = DocumentApp.openById(tempFile.getId());
    masterBody.appendPageBreak();
    appendBodyElements(masterBody, filled.getBody());
    filled.saveAndClose();
  } finally {
    try { tempFile.setTrashed(true); } catch (e) { /* cleanup is best-effort */ }
  }
}

// rowIndexes: array of spreadsheet row numbers (>= 2)
// templateChoice: 'auto' | 'en' | 'tl'
// masterDocId: id of the batch document from a previous chunk ('' on the first)
// isFinal: last chunk — export the PDF and return the doc URL
function generateBatchPrintable(rowIndexes, templateChoice, masterDocId, isFinal, sheet) {
  sheet = sheet || SpreadsheetApp.getActiveSheet();
  var outputFolder = getOutputFolder();

  if (!rowIndexes || rowIndexes.length === 0) {
    return { ok: false, error: 'generate_failed', detail: 'No rows selected.' };
  }
  for (var vi = 0; vi < rowIndexes.length; vi++) {
    if (rowIndexes[vi] < 2 || isNaN(parseInt(rowIndexes[vi], 10))) {
      return { ok: false, error: 'generate_failed', detail: 'Invalid row: ' + rowIndexes[vi] };
    }
  }

  var masterDoc;
  var masterBody;
  var startAt = 0;

  if (masterDocId) {
    // Continuing a batch started by an earlier chunk.
    try {
      masterDoc = DocumentApp.openById(masterDocId);
      masterBody = masterDoc.getBody();
    } catch (e) {
      return { ok: false, error: 'generate_failed', detail: 'Cannot open batch document: ' + e.message };
    }
  } else {
    // Create the master from the FIRST row's template, so the master's own
    // body becomes the first filled entry (no copy-and-append needed for it).
    var firstData = readResponseRow(rowIndexes[0], sheet);
    var firstEn = resolveTemplateChoice(firstData, templateChoice);
    var firstTplId = firstEn
      ? SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN')
      : SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID');
    if (!firstTplId) {
      return { ok: false, error: 'generate_failed', detail: firstEn ? 'No English template set.' : 'No template set.' };
    }
    var firstTpl;
    try {
      firstTpl = DriveApp.getFileById(firstTplId);
    } catch (e) {
      return { ok: false, error: 'generate_failed', detail: 'Template not found: ' + e.message };
    }
    var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    var masterFile = firstTpl.makeCopy('DILG_Survey_Batch_' + ts, outputFolder);
    masterDoc = DocumentApp.openById(masterFile.getId());
    masterBody = masterDoc.getBody();
    try {
      mergeResponseIntoDoc(masterDoc, firstData, firstEn);
    } catch (e) {
      return { ok: false, error: 'generate_failed', detail: 'Row ' + rowIndexes[0] + ': ' + e.message };
    }
    startAt = 1;
  }

  // Append the remaining rows as fresh filled template copies. A failing row
  // must not sink the whole batch — record it and continue with the next.
  var failures = [];
  for (var i = startAt; i < rowIndexes.length; i++) {
    try {
      appendRowEntry(masterBody, rowIndexes[i], templateChoice, sheet, outputFolder);
    } catch (e) {
      failures.push(rowIndexes[i]);
      Logger.log('Batch row ' + rowIndexes[i] + ' failed: ' + e);
    }
  }

  if (!isFinal) {
    masterDoc.saveAndClose();
    var partial = { ok: true, docId: masterDoc.getId() };
    if (failures.length) partial.failedRows = failures;
    return partial;
  }

  // Final chunk: hand back the finished document URL. The PDF is exported in a
  // separate follow-up call (exportBatchPdf) so the heavy getAs('application/pdf')
  // never competes with the merge work inside the Vercel 60s relay window — a
  // final chunk that ALSO converted the whole document to PDF routinely blew
  // past the ~58s budget and timed out (rows left in an ambiguous "may still be
  // in Drive" state even though the document itself completed).
  masterDoc.saveAndClose();
  var masterFileFinal = DriveApp.getFileById(masterDoc.getId());
  var result = { ok: true, url: masterFileFinal.getUrl(), docId: masterDoc.getId() };
  if (failures.length) result.failedRows = failures;
  return result;
}

// Export the finished batch document as a PDF into the output folder. Called by
// the client right after the final chunk returns, so the batch result never
// waits on the conversion. PDF-only work (~10-30s for a multi-page document)
// fits comfortably inside the Vercel relay budget on its own.
function exportBatchPdf(docId) {
  var outputFolder = getOutputFolder();
  var file = DriveApp.getFileById(docId);
  var pdfBlob = file.getAs('application/pdf');
  var pdfName = file.getName() + '.pdf';
  outputFolder.createFile(pdfBlob).setName(pdfName);
  return { ok: true, docId: docId, pdfName: pdfName };
}

// Resolve which template language to use for a row.
// 'en'/'tl' override; 'auto' falls back to the row's "Wika ng sarbey"
// (missing column → Tagalog template).
function resolveTemplateChoice(data, templateChoice) {
  if (templateChoice === 'en') return true;
  if (templateChoice === 'tl') return false;
  return /^english$/i.test(String(data['Wika ng sarbey'] || '').trim());
}

// ──────────────────────────────────
// Helper: get value from data map by regex on keys
// ──────────────────────────────────

function getValueByPattern(data, pattern) {
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    if (pattern.test(keys[i])) {
      return data[keys[i]]; // return '' if blank, null if column missing
    }
  }
  return null;
}

// ──────────────────────────────────
// Get or create output folder
// ──────────────────────────────────

function getOutputFolder() {
  var folderId = SCRIPT_PROP.getProperty('OUTPUT_FOLDER_ID');
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (e) { /* fall through */ }
  }

  // Create in same folder as spreadsheet
  var ssFile = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  var parentFolders = ssFile.getParents();
  var parent = parentFolders.hasNext() ? parentFolders.next() : DriveApp.getRootFolder();

  var folder = parent.createFolder(OUTPUT_FOLDER_NAME);
  SCRIPT_PROP.setProperty('OUTPUT_FOLDER_ID', folder.getId());
  return folder;
}

// ──────────────────────────────────
// Settings: set template doc
// ──────────────────────────────────

function setTemplateDoc(docId) {
  SCRIPT_PROP.setProperty('TEMPLATE_DOC_ID', docId);
  return 'Template set: ' + docId;
}

function getTemplateDocId() {
  return SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID') || '';
}

function getOutputFolderId() {
  var folderId = SCRIPT_PROP.getProperty('OUTPUT_FOLDER_ID');
  if (!folderId) {
    var folder = getOutputFolder();
    folderId = folder.getId();
  }
  return folderId;
}

function getFormUrl() {
  return SCRIPT_PROP.getProperty('FORM_URL') || '';
}

function getFormId() {
  return SCRIPT_PROP.getProperty('FORM_ID') || '';
}

// ──────────────────────────────────
// Diagnostic: verify template is ready to use
// ──────────────────────────────────

function verifyTemplate() {
  var ui = SpreadsheetApp.getUi();
  var templateDocId = SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID');

  if (!templateDocId) {
    ui.alert('Template Not Set',
      'Walang naka-set na template document.\n\n' +
      'Options:\n' +
      '• DILG Survey > Generate Template Document (auto-create)\n' +
      '• Settings > paste a Google Doc ID',
      ui.ButtonSet.OK);
    return;
  }

  var results = [];

  // Check 1: File exists
  var file;
  try {
    file = DriveApp.getFileById(templateDocId);
    results.push('✓ Template file found: ' + file.getName());
  } catch (e) {
    results.push('✗ Template file NOT found. ID may be invalid or file deleted.');
    results.push('  Error: ' + e.message);
    ui.alert('Template Verification', results.join('\n'), ui.ButtonSet.OK);
    return;
  }

  // Check 2: Correct file type (must be Google Doc, not .docx)
  var mime = file.getMimeType();
  if (mime === 'application/vnd.google-apps.document') {
    results.push('✓ Format: Native Google Doc (tama)');
  } else if (mime && mime.indexOf('document') !== -1) {
    results.push('⚠ Format: ' + mime + ' (maaaring .docx — dapat i-convert)');
    results.push('  Gawin: Right-click file > Open with > Google Docs');
  } else {
    results.push('✗ Format: ' + mime);
    results.push('  Kailangan: Google Docs format. I-convert ang .docx.');
  }

  // Check 3: Placeholder count + completeness (all 89 expected keys)
  try {
    var doc = DocumentApp.openById(templateDocId);
    var bodyText = doc.getBody().getText();
    var matches = bodyText.match(/\{\{/g);
    var count = matches ? matches.length : 0;
    results.push('✓ Placeholders found: ' + count);

    var expected = expectedTemplateKeys();
    var missing = expected.filter(function(k) { return bodyText.indexOf('{{' + k + '}}') === -1; });
    if (missing.length === 0) {
      results.push('✓ Lahat ng ' + expected.length + ' placeholders ay naroroon');
    } else {
      results.push('✗ Kulang (' + missing.length + '/' + expected.length + '): ' + missing.join(', '));
    }
    doc.saveAndClose();
  } catch (e) {
    results.push('⚠ Could not read document content: ' + e.message);
  }

  // Check 4: Output folder
  try {
    var folder = getOutputFolder();
    results.push('✓ Output folder: ' + folder.getName());
  } catch (e) {
    results.push('✗ Output folder error: ' + e.message);
  }

  // Check 5: Form exists
  var formId = getFormId();
  if (formId) {
    try {
      var form = FormApp.openById(formId);
      results.push('✓ Google Form: ' + form.getTitle());
    } catch (e) {
      results.push('⚠ Google Form not accessible: ' + e.message);
    }
  } else {
    results.push('⚠ No Google Form created yet. Run Create/Update Form.');
  }

  ui.alert('Template Verification', results.join('\n'), ui.ButtonSet.OK);
}

// ──────────────────────────────────
// Deployment diagnostic — run this FIRST when output looks wrong.
// Tells us whether the Apps Script project is running the CURRENT code,
// and whether the configured template docs match the expected state.
// ──────────────────────────────────

function checkDeployment() {
  var ui = SpreadsheetApp.getUi();
  var lines = [];
  lines.push('MERGE_VERSION: ' + (typeof MERGE_VERSION !== 'undefined' ? MERGE_VERSION : 'MISSING (STALE CODE!)'));

  var enId = SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN');
  var tlId = SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID');

  // ── English template doc state ──
  lines.push('--- English template ---');
  if (!enId) {
    lines.push('EN doc ID: NOT SET (Settings → English Template Document)');
  } else {
    lines.push('EN doc ID set: ' + enId);
    try {
      var enFile = DriveApp.getFileById(enId);
      lines.push('EN file: ' + enFile.getName());
      var enDoc = DocumentApp.openById(enId);
      var enText = enDoc.getBody().getText();
      var uniq = {};
      (enText.match(/\{\{\w+\}\}/g) || []).forEach(function(p) { uniq[p] = true; });
      lines.push('EN placeholders: ' + Object.keys(uniq).length + ' unique / ' + enText.split('{{').length + ' total');
      var expected = expectedTemplateKeys();
      var missing = expected.filter(function(k) { return enText.indexOf('{{' + k + '}}') === -1; });
      lines.push('EN missing keys: ' + (missing.length === 0 ? 'NONE (all 89 present)' : missing.join(', ')));
      // Radio format sniff: how many literal checkbox glyphs sit right before a {{key}}
      var glyphBefore = (enText.match(/[☐□☑☒■✓✗][ \t]*\{\{/g) || []).length;
      var purePlaceholders = (enText.match(/[^☐□☑☒■✓✗][ \t]*\{\{/g) || []).length;
      lines.push('EN glyph-before-{{ (pattern 2): ' + glyphBefore);
      lines.push('EN pure {{}} occurrences (pattern 3): ' + purePlaceholders);
      lines.push('EN sample: ' + enText.split('\n').filter(function(l) { return l.indexOf('uri_mamamayan') !== -1; })[0] || '(no uri_mamamayan line found!)');
    } catch (e) {
      lines.push('EN doc ERROR: ' + e.message);
    }
  }

  // ── Tagalog template doc state ──
  lines.push('--- Tagalog template ---');
  if (!tlId) {
    lines.push('TL doc ID: NOT SET');
  } else {
    try {
      var tlDoc = DocumentApp.openById(tlId);
      var tlText = tlDoc.getBody().getText();
      lines.push('TL placeholders: ' + tlText.split('{{').length + ' total');
    } catch (e) {
      lines.push('TL doc ERROR: ' + e.message);
    }
  }

  // ── Active row data (language consistency check) ──
  lines.push('--- Active row ---');
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var row = sheet.getActiveCell().getRow();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var vals = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    var pick = function(name) {
      for (var i = 0; i < headers.length; i++) {
        if (String(headers[i]).indexOf(name) !== -1) return String(vals[i]);
      }
      return '(col missing)';
    };
    lines.push('Row: ' + row + '  Wika: "' + pick('Wika') + '"');
    lines.push('Uri ng Kliyente: "' + pick('Uri ng Kliyente') + '"');
    lines.push('CC1: "' + pick('CC1') + '"');
  } catch (e) {
    lines.push('Row read ERROR: ' + e.message);
  }

  lines.forEach(function(l) { Logger.log(l); });
  ui.alert('Deployment Diagnostics', lines.join('\n'), ui.ButtonSet.OK);
}

// ──────────────────────────────────
// Decisive diagnostic: run the REAL English merge against a data row
// and count the resulting checkmarks. Dumps the exact values the merge
// reads so any label mismatch is immediately visible.
// Menu: DILG Survey > Test Merge (English) — uses the active row.
// ──────────────────────────────────

function testMergeRow(rowIndex) {
  var ui = SpreadsheetApp.getUi();
  if (!rowIndex) {
    var activeRow = SpreadsheetApp.getActiveSheet().getActiveCell().getRow();
    rowIndex = activeRow >= 2 ? activeRow : 2;
  }

  var lines = [];
  lines.push('Row ' + rowIndex + '  (select a DATA row, then rerun to test that row)');
  lines.push('');

  // ── 1. Values the merge actually reads ──
  var data = readResponseRow(rowIndex);
  lines.push('-- Values the merge reads --');
  lines.push('Wika ng sarbey: "' + (data['Wika ng sarbey'] !== undefined ? data['Wika ng sarbey'] : '(no column)') + '"');
  Object.keys(RADIO_KEYS).forEach(function(t) {
    var pat = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 30));
    var v = getValueByPattern(data, pat);
    lines.push(t + ': "' + (v === null ? '(NO MATCHING COLUMN)' : v) + '"');
  });
  var sqdCount = extractSqdResponses(data).filter(function(s) { return s; }).length;
  lines.push('SQD answered rows: ' + sqdCount + ' / 9');

  // ── 2. Run the real merge on a copy of the EN template ──
  var templateDocId = SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN');
  if (!templateDocId) {
    lines.push('');
    lines.push('TEMPLATE_DOC_ID_EN is not set.');
  } else {
    lines.push('');
    lines.push('-- Result of the REAL English merge --');
    try {
      var copyFile = DriveApp.getFileById(templateDocId).makeCopy('_TEST_merge_row' + rowIndex, getOutputFolder());
      var copyDoc = DocumentApp.openById(copyFile.getId());
      mergeResponseIntoDoc(copyDoc, data, true);
      copyDoc.saveAndClose();
      var text = copyDoc.getBody().getText();
      var checks = (text.match(/☑/g) || []).length;
      var boxes = (text.match(/☐/g) || []).length;
      var leftovers = text.match(/\{\{[^{}]+\}\}/g) || [];
      copyFile.setTrashed(true);

      lines.push('Total ☑ checkmarks: ' + checks + '  (expect 6: Client/Age/Gender/CC1/CC2/CC3)');
      lines.push('Total ☐ boxes: ' + boxes);
      lines.push('Leftover {{...}}: ' + (leftovers.length === 0 ? 'NONE' : leftovers.join(' ')));
      if (sqdCount < 9) {
        lines.push('({{sqd...}} leftovers are EXPECTED when a row has unanswered SQD rows)');
      }
    } catch (e) {
      lines.push('MERGE ERROR: ' + e.message);
    }
  }

  lines.forEach(function(l) { Logger.log(l); });
  ui.alert('Test Merge (English)', lines.join('\n'), ui.ButtonSet.OK);
}
