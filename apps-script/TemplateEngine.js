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
var MERGE_VERSION = 'v9.1-sqd-width-orig';

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
  // NOTE: SQD grid cells are NOT placeholder keys anymore — the compact grid
  // holds a single '☐' glyph per rating cell and is filled positionally at
  // merge time. Grid presence is verified separately (sqdGridStateLine).
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
// Compact SQD grid: each rating cell holds a single '☐' glyph so the grid
// compresses VERTICALLY (~1 line per row instead of a wrapped multi-line
// {{sqdN_key}} token). Column widths stay at their original 55pt — the
// compression is vertical only. At merge time the grid is filled
// positionally from its own header row (TL or EN labels).
// ──────────────────────────────────

var SQD_CHECK_COL_WIDTH = 55;  // original rating column width in points
var SQD_CHECK_GLYPH = '☐';     // placeholder glyph shown in the template

// Map a SQD header cell to its canonical rating key. Tolerant of leading
// checkbox glyphs, numbers and codes ("☐ Strongly agree", "5. Sang-ayon")
// and of N/A variants ("N/A", "N.A.", "Not applicable"). Returns null when
// the cell is not a rating header.
function sqdHeaderKeyOf(cellText) {
  var cleaned = String(cellText || '').replace(/^[\s\u2610\u25A1\u2611\u2B1B\d.:\-()]+/, '').toLowerCase();
  var isNA = /^(n\s*\/\s*a|n\.a\.|not\s*applicable)(?=$|[\s(.:*;,-])/.test(cleaned);
  var labels = Object.keys(RATING_KEYS);
  for (var i = 0; i < labels.length; i++) {
    var lbl = labels[i].toLowerCase();
    if (lbl === 'n/a') {
      if (isNA) return RATING_KEYS[labels[i]];
    } else if (cleaned.indexOf(lbl) === 0) {
      return RATING_KEYS[labels[i]];
    }
  }
  return null;
}

// Column index → rating key map from the SQD grid's header row. Scans every
// row (the header is not necessarily row 0) and returns the first row where
// >= 4 columns map to rating labels; null when none maps cleanly.
function sqdGridHeaderKeys(table) {
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    var cols = {};
    for (var c = 0; c < row.getNumCells(); c++) {
      var ct = row.getCell(c).getText();
      if (!ct || ct.length > 40) continue;
      var key = sqdHeaderKeyOf(ct);
      if (key) cols[c] = key;
    }
    if (Object.keys(cols).length >= 4) return cols;
  }
  return null;
}

// The rating column whose key equals selectedKey, or -1.
function sqdSelectedColumn(headerKeys, selectedKey) {
  var keys = Object.keys(headerKeys || {});
  for (var i = 0; i < keys.length; i++) {
    if (headerKeys[keys[i]] === selectedKey) return parseInt(keys[i], 10);
  }
  return -1;
}

// Restore the SQD grid's rating columns to the original width. Only columns
// present in headerKeys are touched; the label column is left as-is.
// Best-effort.
function compactSqdColumns(table, headerKeys) {
  var cols = Object.keys(headerKeys || {});
  for (var i = 0; i < cols.length; i++) {
    var c = parseInt(cols[i], 10);
    if (c < 1) continue;
    try {
      table.getRow(0).getCell(c).setWidth(SQD_CHECK_COL_WIDTH);
    } catch (e) { /* best-effort: DOCX layouts may reject per-cell widths */ }
  }
}

// One-line SQD grid state for diagnostics (checkDeployment).
function sqdGridStateLine(body) {
  try {
    var tables = body.getTables().filter(function(t) { return /SQD\d/i.test(tableText(t)); });
    if (tables.length === 0) return 'MISSING (no SQD table found)';
    var compact = 0, keyed = 0, total = 0;
    tables.forEach(function(t) {
      for (var r = 0; r < t.getNumRows(); r++) {
        var row = t.getRow(r);
        for (var c = 1; c < row.getNumCells(); c++) {
          var txt = row.getCell(c).getText();
          if (/\{\{sqd\d+_[a-z0-9_]+\}\}/i.test(txt)) { keyed++; total++; }
          else if (txt === SQD_CHECK_GLYPH) { compact++; total++; }
        }
      }
    });
    return tables.length + ' table(s), ' + total + ' rating cells (' + compact + ' ☐ compact / ' + keyed + ' keyed)';
  } catch (e) {
    return 'read ERROR: ' + e.message;
  }
}

// Rebuild the SQD grid of BOTH configured templates (TL + EN): a single ☐
// per rating cell (vertical compression), {{sqdN_key}} tokens removed, and
// rating columns restored to the original width. Idempotent — run once after
// upgrading to the compact grid.
// Menu: DILG Survey > Advanced > Compact SQD Grid
function compactSqdGrids() {
  var ui = SpreadsheetApp.getUi();
  var ids = [
    { label: 'TL', id: SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID') },
    { label: 'EN', id: SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN') }
  ];
  var lines = [];

  for (var i = 0; i < ids.length; i++) {
    var entry = ids[i];
    if (!entry.id) {
      lines.push(entry.label + ': template not set — skipped');
      continue;
    }
    try {
      var doc = DocumentApp.openById(entry.id);
      var body = doc.getBody();
      var tables = body.getTables();
      var grids = 0;
      var cells = 0;

      for (var t = 0; t < tables.length; t++) {
        var table = tables[t];
        if (!/SQD\d/i.test(tableText(table))) continue;
        var headerKeys = sqdGridHeaderKeys(table);
        if (!headerKeys) continue;
        grids++;

        var numRows = table.getNumRows();
        for (var r = 0; r < numRows; r++) {
          var row = table.getRow(r);
          var nc = row.getNumCells();
          var isHeader = false;
          for (var h = 0; h < nc; h++) {
            if (sqdHeaderKeyOf(row.getCell(h).getText())) { isHeader = true; break; }
          }
          if (isHeader) continue;

          for (var c = 1; c < nc; c++) {
            if (headerKeys[c] === undefined) continue;
            var cell = row.getCell(c);
            var cellText = cell.getText();
            if (cellText !== SQD_CHECK_GLYPH) {
              cell.setText(SQD_CHECK_GLYPH);
              cells++;
            }
          }
        }
        compactSqdColumns(table, headerKeys);
      }

      doc.saveAndClose();
      if (grids === 0) {
        lines.push(entry.label + ': no SQD grid found (needs rating-label header row)');
      } else {
        lines.push(entry.label + ': ' + grids + ' SQD grid(s) compacted — ' + cells + ' cells → ' + SQD_CHECK_GLYPH + ', rating columns ' + SQD_CHECK_COL_WIDTH + 'pt');
      }
    } catch (e) {
      lines.push(entry.label + ': ERROR ' + e.message);
    }
  }

  ui.alert('Compact SQD Grid', lines.join('\n'), ui.ButtonSet.OK);
}

// ──────────────────────────────────
// Core merge: fill template Google Doc with response data
// ──────────────────────────────────

function mergeResponseIntoDoc(doc, data, isEnglish) {
  var body = doc.getBody();

  // ── 1. Simple text fields ──
  // Values come from the shared helper (simpleFieldValues) so the batch path's
  // appended-region re-fill writes byte-identical output. Exact-match rule
  // (preserved from the original implementation): the "Other/s" option stores
  // one of two canonical strings and must match EXACTLY — a substring check
  // would falsely match legitimate services that mention "Other Official
  // Documents", rewriting the service name.
  var simpleValues = simpleFieldValues(data, isEnglish);
  HEADER_SIMPLE_FIELDS.forEach(function(f) {
    var v = simpleValues[f.match];
    if (v !== null) body.replaceText(ciPattern(f.match), v);
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

  // ── Compact-grid path: the header row declares the rating order, so each
  // SQD row's selected column can be filled without any placeholder text —
  // write '✓' into the selected rating column and '' into the others. Only
  // tables whose header maps cleanly (>= 4 columns) are touched; old keyed
  // tables were already handled by the scan above.
  for (var t2 = 0; t2 < tables.length; t2++) {
    var sqdTable = tables[t2];
    if (!/SQD\d/i.test(tableText(sqdTable))) continue;
    var headerKeys = sqdGridHeaderKeys(sqdTable);
    if (!headerKeys) continue;

    var lastNum = null;
    var numRows2 = sqdTable.getNumRows();
    for (var r4 = 0; r4 < numRows2; r4++) {
      var row4 = sqdTable.getRow(r4);
      var nc4 = row4.getNumCells();

      // Skip header/title rows (any cell maps to a rating header).
      var isHeaderRow = false;
      for (var c4 = 0; c4 < nc4; c4++) {
        if (sqdHeaderKeyOf(row4.getCell(c4).getText())) { isHeaderRow = true; break; }
      }
      if (isHeaderRow) continue;

      var labelCellText = nc4 > 0 ? row4.getCell(0).getText() : '';
      var mNum = labelCellText.match(/^SQD(\d+)\./i);
      var rowIdx;
      if (mNum) {
        rowIdx = parseInt(mNum[1], 10);
        lastNum = rowIdx;
      } else if (lastNum !== null) {
        lastNum += 1; // vertically merged label cell spans multiple rows
        rowIdx = lastNum;
      } else {
        continue;
      }
      if (rowIdx < 0 || rowIdx >= SQD_ROWS) continue;

      var selected = selectedKeys[rowIdx];
      var selCol = sqdSelectedColumn(headerKeys, selected);
      for (var c5 = 1; c5 < nc4; c5++) {
        var colKey = headerKeys[c5];
        if (colKey === undefined) continue;
        row4.getCell(c5).setText(c5 === selCol ? '✓' : '');
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
// Free-text fields: sheet-header pattern → placeholder key.
// Single source of truth shared by mergeResponseIntoDoc (fills every template
// copy) and the batch path (re-fills ONLY the freshly appended entry's region,
// so a stale/copy-race can never leave literal {{...}} in an appended header).
// ──────────────────────────────────

var HEADER_SIMPLE_FIELDS = [
  { match: 'pangalanNgTanggapan', pattern: /Pangalan ng tanggapan/ },
  { match: 'serbisyongIbinigay', pattern: /Serbisyong ibinigay/ },
  { match: 'petsa', pattern: /Petsa/ },
  { match: 'rehiyon', pattern: /Rehiyon/ },
  { match: 'mgaMungkahi', pattern: /mungkahi/ },
  { match: 'pangalan', pattern: /Pangalan \(optional\)/ },
  { match: 'contactNumber', pattern: /Contact number/ },
  { match: 'emailAddress', pattern: /Email address/ }
];

// Resolve the display value for every free-text field for one response row.
// Mirrors the "Other/s" + English-service translation logic so the re-fill pass
// is byte-identical to the values mergeResponseIntoDoc wrote on page 1.
function simpleFieldValues(data, isEnglish) {
  var out = {};
  HEADER_SIMPLE_FIELDS.forEach(function(f) {
    out[f.match] = getValueByPattern(data, f.pattern); // '' if blank, null if column missing
  });
  var serbisyoVal = out.serbisyongIbinigay;
  var isOtherService =
    serbisyoVal === 'Other/s (Tukuyin ang iba pang serbisyo)' ||
    serbisyoVal === 'Other/s (Specify other service)';
  if (serbisyoVal) {
    if (isOtherService) {
      var otherVal = getValueByPattern(data, /Serbisyong iba|Kung.*Other/);
      if (otherVal) {
        out.serbisyongIbinigay = otherVal;
      } else if (isEnglish) {
        out.serbisyongIbinigay = 'Other/s (Specify other service)';
      }
    } else if (isEnglish && EN_SERVICES[serbisyoVal]) {
      out.serbisyongIbinigay = EN_SERVICES[serbisyoVal];
    }
  }
  return out;
}

// Whole-body safety net: re-apply the free-text fields anywhere in an already
// merged body. data === null blanks any leftover {{headerKey}} literals instead
// of shipping raw placeholder text (used as the final cleanup on the master).
function applyHeaderPlaceholders(body, data, isEnglish) {
  var values = data ? simpleFieldValues(data, isEnglish) : null;
  HEADER_SIMPLE_FIELDS.forEach(function(f) {
    if (values) {
      if (values[f.match] !== null) body.replaceText(ciPattern(f.match), values[f.match]);
    } else {
      body.replaceText(ciPattern(f.match), '');
    }
  });
}

// Fill {{simple}} placeholders ONLY inside the freshly appended child range
// [fromIndex, fromIndex + count) of the master body. Never body-wide: a
// body-wide replaceText could overwrite an EARLIER entry's leftover header
// placeholder with the CURRENT row's data — the very cross-contamination this
// feature is meant to prevent.
function fillSimpleFieldsInRange(masterBody, fromIndex, count, values) {
  var keys = [];
  Object.keys(values).forEach(function(k) { if (values[k] !== null) keys.push(k); });
  if (keys.length === 0) return;
  for (var i = 0; i < count; i++) {
    replaceSimpleInElement(masterBody.getChild(fromIndex + i), keys, values);
  }
}

function replaceSimpleInElement(el, keys, values) {
  var type = el.getType();
  if (type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM) {
    keys.forEach(function(k) { el.asParagraph().replaceText(ciPattern(k), String(values[k])); });
    return;
  }
  if (type === DocumentApp.ElementType.TABLE) {
    var table = el.asTable();
    for (var r = 0; r < table.getNumRows(); r++) {
      var row = table.getRow(r);
      for (var c = 0; c < row.getNumCells(); c++) {
        var cell = row.getCell(c);
        for (var p = 0; p < cell.getNumChildren(); p++) {
          replaceSimpleInElement(cell.getChild(p), keys, values);
        }
      }
    }
  }
}

// Open a freshly-created Drive file, retrying while the copy propagates.
function openDocWithRetry(fileId) {
  for (var attempt = 0; attempt < 5; attempt++) {
    try {
      return DocumentApp.openById(fileId);
    } catch (e) {
      if (attempt < 4) Utilities.sleep(500);
      else throw e;
    }
  }
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
  var tempFile = null;
  var tempDoc = null;
  var filled = null;
  var appendedCount = 0;
  var fromIndex = 0;

  // The temp copy + reopen dance has one flaky step: opening a freshly-made
  // Drive copy can return a stale/empty handle before Drive materializes it
  // (openById succeeds, but the body has no children). That silently turned a
  // batch row into a blank page AND lost the entry's header. Retry once with a
  // fresh copy when an attempt appends zero children; the page break added for
  // the failed attempt is removed so retries don't stack blank pages.
  for (var attempt = 0; attempt < 2; attempt++) {
    tempFile = tplFile.makeCopy('_batch_tmp_' + rowIndex + (attempt ? '_r' + attempt : ''), outputFolder);
    try {
      tempDoc = openDocWithRetry(tempFile.getId());
      mergeResponseIntoDoc(tempDoc, data, isEnglish);
      tempDoc.saveAndClose();
      // Reopen for a clean read of the filled body (cached handles can lag).
      // Deliberately restored after v7 read the in-memory handle instead: the
      // fresh-copy handle can hold a partially-materialized body whose copy()
      // differs from the persisted one, which showed up as spacing regressions
      // in real batches. The ~2-5s per entry is a fair price; chunk timeouts
      // are now recoverable via the batch resume mechanism instead.
      filled = DocumentApp.openById(tempFile.getId());
      masterBody.appendPageBreak();
      // Remove the master's trailing empty paragraph(s) now sandwiched between
      // the previous entry's content and this break — otherwise one wraps onto
      // its own page when the previous entry fills its last page exactly
      // (blank page between entries).
      removeEmptyParagraphsBeforePageBreak(masterBody);
      fromIndex = masterBody.getNumChildren();
      appendBodyElements(masterBody, filled.getBody());
      appendedCount = masterBody.getNumChildren() - fromIndex;
      filled.saveAndClose();
      if (appendedCount > 0) break; // success
      // Empty append — undo the page break, then retry once with a fresh copy.
      if (attempt === 1) throw new Error('Template copy yielded no content after 2 attempts (Drive propagation).');
      removeChildAt(masterBody, fromIndex - 1);
      Logger.log('Batch row ' + rowIndex + ': empty append (stale copy?) — retrying with a fresh copy.');
    } catch (e) {
      if (attempt === 1) throw e;
      // If the failure hit before any content landed, undo the page break we
      // just added so the retry doesn't leave a stray blank page behind.
      if (appendedCount === 0 && fromIndex > 0) removeChildAt(masterBody, fromIndex - 1);
      Logger.log('Batch row ' + rowIndex + ' attempt ' + attempt + ' failed: ' + e + ' — retrying with a fresh copy.');
    } finally {
      // Best-effort cleanup of this attempt's temp file.
      try { if (tempFile) tempFile.setTrashed(true); } catch (e) { /* cleanup is best-effort */ }
    }
  }

  // Safety net for the header fields: when a copied entry's header carries
  // literal {{pangalanNgTanggapan}} / {{serbisyongIbinigay}} / etc. (the
  // stale-copy race above, or a table cell the copy flattened), re-fill ONLY
  // this entry's freshly appended region with THIS row's values — never the
  // whole body, so an earlier entry's leftovers can't be overwritten with the
  // wrong row's data. Already-filled values are identical, so this is a no-op
  // on the healthy path.
  if (appendedCount > 0) {
    fillSimpleFieldsInRange(masterBody, fromIndex, appendedCount, simpleFieldValues(data, isEnglish));
  }
}

function removeChildAt(container, index) {
  if (index < 0 || index >= container.getNumChildren()) return;
  try { container.getChild(index).removeFromParent(); } catch (e) { /* best-effort */ }
}

// A Google Doc body always ends with an empty paragraph (the template's own
// trailing addEmpty()). When a batch entry's last page is exactly full, that
// empty paragraph wraps onto its own page and the standalone page break that
// follows pushes the next entry one page further — the blank pages seen between
// batch entries (and the extra blank line at the bottom of every entry whose
// last page isn't full). Removes every empty paragraph sitting immediately
// before a just-appended page break so the break always follows real content
// and nothing can wrap into a blank page. The target paragraph is never the
// last body child at this point (the page break is), so removal is always
// legal; the guard caps the work.
function removeEmptyParagraphsBeforePageBreak(body) {
  for (var guard = 0; guard < 20; guard++) {
    var n = body.getNumChildren();
    if (n < 2) return;
    var prev = body.getChild(n - 2);
    if (prev.getType() !== DocumentApp.ElementType.PARAGRAPH) return;
    if (prev.asParagraph().getText().trim() !== '') return;
    try { prev.removeFromParent(); } catch (e) { return; }
  }
}

// Spacing-invariant check for the diagnostic: returns a list of structural
// faults that render as blank pages / extra spacing (empty paragraph directly
// before a page break, body ending in a page break or an empty paragraph).
function findSpacingFaults(body) {
  var faults = [];
  var n = body.getNumChildren();
  for (var i = 0; i < n; i++) {
    if (body.getChild(i).getType() === DocumentApp.ElementType.PAGE_BREAK && i > 0) {
      var prev = body.getChild(i - 1);
      if (prev.getType() === DocumentApp.ElementType.PARAGRAPH && prev.asParagraph().getText().trim() === '') {
        faults.push('empty paragraph before page break at child ' + i);
      }
    }
  }
  if (n > 0) {
    var last = body.getChild(n - 1);
    if (last.getType() === DocumentApp.ElementType.PAGE_BREAK) {
      faults.push('body ends with a page break');
    } else if (last.getType() === DocumentApp.ElementType.PARAGRAPH && last.asParagraph().getText().trim() === '') {
      faults.push('body ends with an empty paragraph');
    }
  }
  return faults;
}

// ──────────────────────────────────
// Batch progress & resume
// ──────────────────────────────────
// Every batch master keeps a per-document progress list (ScriptProperties keyed
// by the master's doc id) recording which spreadsheet rows have already been
// merged into it. Chunks that arrive after a timeout can therefore re-run
// safely: already-done rows are skipped, so a retry never duplicates an entry.
// The most recent in-progress master is also remembered so a chunk-1 timeout
// (where the client never learned the master's id) can still resume the same
// document instead of starting a second one.
function batchProgressKey(docId) { return 'BATCH_PROGRESS_' + docId; }

function readBatchDoneRows(docId) {
  var raw = SCRIPT_PROP.getProperty(batchProgressKey(docId));
  if (!raw) return [];
  try {
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function writeBatchDoneRows(docId, rows) {
  SCRIPT_PROP.setProperty(batchProgressKey(docId), JSON.stringify(rows));
}

function readLastBatchMaster() {
  var raw = SCRIPT_PROP.getProperty('BATCH_LAST_MASTER');
  if (!raw) return null;
  try {
    var obj = JSON.parse(raw);
    return (obj && obj.docId) ? obj : null;
  } catch (e) {
    return null;
  }
}

function writeLastBatchMaster(docId, rows) {
  SCRIPT_PROP.setProperty('BATCH_LAST_MASTER', JSON.stringify({ docId: docId, ts: Date.now(), rows: rows || [] }));
}

// Pure decision: can `lastMaster` be resumed for `rowIndexes`? Only when it is
// recent enough AND at least one of the requested rows already lives in it.
function selectResumableMaster(lastMaster, rowIndexes, nowMs, maxAgeMs) {
  if (!lastMaster || !lastMaster.docId) return null;
  if (nowMs - (lastMaster.ts || 0) > (maxAgeMs || 15 * 60 * 1000)) return null;
  var rows = (lastMaster.rows || []).map(Number);
  for (var i = 0; i < rowIndexes.length; i++) {
    if (rows.indexOf(Number(rowIndexes[i])) !== -1) return lastMaster;
  }
  return null;
}

function findResumableMaster(rowIndexes) {
  return selectResumableMaster(readLastBatchMaster(), rowIndexes, Date.now(), 15 * 60 * 1000);
}

// rowIndexes: array of spreadsheet row numbers (>= 2)
// templateChoice: 'auto' | 'en' | 'tl'
// masterDocId: id of the batch document from a previous chunk ('' on the first)
// isFinal: last chunk — hand back the doc URL (PDF export is a separate call)
// resume: explicit opt-in for the timeout-retry path — when masterDocId is '',
//         reuse the most recent in-progress master that already holds some of
//         these rows (a chunk-1 call that timed out AFTER creating the master).
//         Fresh batches never set this, so a normal run always starts a new doc.
function generateBatchPrintable(rowIndexes, templateChoice, masterDocId, isFinal, sheet, resume) {
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

  // Serialize chunk calls: when a chunk times out at the Vercel relay, the Apps
  // Script execution keeps running for up to 6 minutes, so a retry can overlap
  // the original attempt. The lock (plus per-row progress below) makes a retry
  // safe instead of interleaving appends and duplicating entries.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { ok: false, error: 'generate_failed', detail: 'Another batch generation is still running — wait a moment and try again.' };
  }
  try {
    return generateBatchPrintableLocked(rowIndexes, templateChoice, masterDocId, isFinal, resume, sheet, outputFolder);
  } finally {
    lock.releaseLock();
  }
}

function generateBatchPrintableLocked(rowIndexes, templateChoice, masterDocId, isFinal, resume, sheet, outputFolder) {
  var masterDoc;
  var masterBody;
  var doneRows;
  var startAt = 0;

  if (masterDocId) {
    // Continuing a batch started by an earlier chunk.
    try {
      masterDoc = DocumentApp.openById(masterDocId);
      masterBody = masterDoc.getBody();
      doneRows = readBatchDoneRows(masterDocId);
    } catch (e) {
      // The handed-back id is stale/deleted. Fall back to the most recent
      // in-progress master if it covers these rows.
      var staleResume = findResumableMaster(rowIndexes);
      if (staleResume) {
        masterDocId = staleResume.docId;
        try {
          masterDoc = DocumentApp.openById(masterDocId);
          masterBody = masterDoc.getBody();
          doneRows = readBatchDoneRows(masterDocId);
          if (!doneRows.length) doneRows = staleResume.rows.slice();
        } catch (e2) {
          return { ok: false, error: 'generate_failed', detail: 'Cannot open batch document: ' + e2.message };
        }
      } else {
        return { ok: false, error: 'generate_failed', detail: 'Cannot open batch document: ' + e.message };
      }
    }
  } else if (resume) {
    // Explicit retry of a timed-out chunk 1: the client never learned the
    // master's id, but the document may already exist with some rows merged.
    // Reuse it so the retry appends only the missing rows instead of creating
    // a second, duplicated document.
    var resumeMaster = findResumableMaster(rowIndexes);
    if (resumeMaster) {
      masterDocId = resumeMaster.docId;
      try {
        masterDoc = DocumentApp.openById(masterDocId);
        masterBody = masterDoc.getBody();
      } catch (e) {
        return { ok: false, error: 'generate_failed', detail: 'Cannot open batch document: ' + e.message };
      }
      doneRows = readBatchDoneRows(masterDocId);
      if (!doneRows.length) doneRows = resumeMaster.rows.slice();
    }
  }

  if (!masterDocId) {
    // Fresh batch (or a resume attempt with nothing to resume): create the
    // master from the FIRST row's template, so the master's own body becomes
    // the first filled entry (no copy-and-append needed for it).
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
      // Safety net: if the fresh template copy was read before Drive fully
      // materialized it, re-apply the header fields with the first row's data.
      // No-op when the merge already filled them.
      applyHeaderPlaceholders(masterBody, firstData, firstEn);
    } catch (e) {
      return { ok: false, error: 'generate_failed', detail: 'Row ' + rowIndexes[0] + ': ' + e.message };
    }
    masterDocId = masterFile.getId();
    doneRows = [rowIndexes[0]];
    writeBatchDoneRows(masterDocId, doneRows);
    startAt = 1;
  }

  // Append the remaining rows as fresh filled template copies. A failing row
  // must not sink the whole batch — record it and continue with the next.
  // Rows already recorded in this master's progress are skipped: a retried
  // chunk (after a timeout) must never merge an entry twice.
  var failures = [];
  for (var i = startAt; i < rowIndexes.length; i++) {
    var r = rowIndexes[i];
    if (doneRows.indexOf(r) !== -1) continue;
    try {
      appendRowEntry(masterBody, r, templateChoice, sheet, outputFolder);
      doneRows.push(r);
      writeBatchDoneRows(masterDocId, doneRows);
    } catch (e) {
      failures.push(r);
      Logger.log('Batch row ' + r + ' failed: ' + e);
    }
  }
  // Remember this master as the most recent in-progress batch so a chunk-1
  // timeout retry can resume it (see findResumableMaster). Updated on EVERY
  // chunk, so the timestamp reflects the latest activity.
  writeLastBatchMaster(masterDocId, doneRows);

  if (!isFinal) {
    masterDoc.saveAndClose();
    var partial = { ok: true, docId: masterDocId };
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
  var masterFileFinal = DriveApp.getFileById(masterDocId);
  var result = { ok: true, url: masterFileFinal.getUrl(), docId: masterDocId };
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

// ──────────────────────────────────
// Diagnostic: proves whether appended batch entries actually carry the header.
// Menu: DILG Survey > Advanced > Diagnose Batch Append (uses the active row).
// Answers the question "do appended entries get a header from their template
// copy?" by simulating ONE append into a throwaway master and dumping:
//   1. the template body's element layout (are the header paragraphs/tables
//      really in the body, or in a real document header section?),
//   2. the merged temp copy's leftover {{placeholders}},
//   3. exactly what landed in the master after appendBodyElements().
// ──────────────────────────────────

function diagnoseBatchAppend(rowIndex) {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  if (!rowIndex) {
    rowIndex = sheet.getActiveCell().getRow();
    if (rowIndex < 2) rowIndex = 2;
  }

  var lines = [];
  var data = readResponseRow(rowIndex, sheet);
  var isEnglish = resolveTemplateChoice(data, 'auto');
  var tplId = isEnglish
    ? SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN')
    : SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID');
  lines.push('Diagnose Batch Append — row ' + rowIndex + (isEnglish ? ' (EN template)' : ' (TL template)'));

  var masterFile = null;
  var tempFile = null;
  try {
    if (!tplId) throw new Error('No template doc set (TEMPLATE_DOC_ID' + (isEnglish ? '_EN' : '') + ').');
    var tplFile = DriveApp.getFileById(tplId);
    lines.push('Template: ' + tplFile.getName());

    // 1. Template body layout (top 12 children) + header section check
    var tplDoc = DocumentApp.openById(tplId);
    var tplBody = tplDoc.getBody();
    lines.push('--- TEMPLATE BODY (' + tplBody.getNumChildren() + ' children) ---');
    for (var i = 0; i < Math.min(12, tplBody.getNumChildren()); i++) {
      lines.push('  [' + i + '] ' + tplBody.getChild(i).getType() + ': ' + snippet(tplBody.getChild(i)));
    }
    var hdrSec = tplDoc.getHeader();
    var hdrText = hdrSec ? hdrSec.getText() : '';
    lines.push('Real document header section: ' + (hdrText.trim() ? 'HAS CONTENT — "' + snippetText(hdrText) + '"' : 'empty / none'));
    tplDoc.saveAndClose();

    // 2. Master (page 1 path): template copy merged with the row's data
    var outputFolder = getOutputFolder();
    masterFile = tplFile.makeCopy('_DIAG_append_master_' + rowIndex, outputFolder);
    var masterDoc = openDocWithRetry(masterFile.getId());
    var masterBody = masterDoc.getBody();
    mergeResponseIntoDoc(masterDoc, data, isEnglish);
    masterDoc.saveAndClose();
    masterDoc = DocumentApp.openById(masterFile.getId());
    masterBody = masterDoc.getBody();
    var m1 = masterBody.getText().match(/\{\{[^{}]+\}\}/g) || [];
    lines.push('--- MASTER after merge (page-1 path) ---');
    lines.push('  Leftover {{...}} in master: ' + (m1.length ? m1.join(' ') : 'NONE'));
    lines.push('  Master has header text "DEPARTMENT OF THE INTERIOR": ' + (masterBody.getText().indexOf('DEPARTMENT OF THE INTERIOR') !== -1));
    lines.push('  Master has header text "Document Code": ' + (masterBody.getText().indexOf('Document Code') !== -1));

    // 3. Simulate the append path for a SECOND row using the same template
    tempFile = tplFile.makeCopy('_DIAG_append_tmp_' + rowIndex, outputFolder);
    var tempDoc = openDocWithRetry(tempFile.getId());
    mergeResponseIntoDoc(tempDoc, data, isEnglish);
    tempDoc.saveAndClose();
    var filled = DocumentApp.openById(tempFile.getId());
    var filledBody = filled.getBody();
    var fLeft = filledBody.getText().match(/\{\{[^{}]+\}\}/g) || [];
    lines.push('--- FILLED TEMP COPY (' + filledBody.getNumChildren() + ' children) ---');
    lines.push('  Leftover {{...}} in filled copy: ' + (fLeft.length ? fLeft.join(' ') : 'NONE'));
    for (var j = 0; j < Math.min(6, filledBody.getNumChildren()); j++) {
      lines.push('  [' + j + '] ' + filledBody.getChild(j).getType() + ': ' + snippet(filledBody.getChild(j)));
    }

    masterBody.appendPageBreak();
    removeEmptyParagraphsBeforePageBreak(masterBody);
    var fromIdx = masterBody.getNumChildren();
    appendBodyElements(masterBody, filledBody);
    var appended = masterBody.getNumChildren() - fromIdx;
    filled.saveAndClose();
    lines.push('--- APPENDED ' + appended + ' children into master ---');
    for (var k = fromIdx; k < masterBody.getNumChildren() && k < fromIdx + 6; k++) {
      lines.push('  [' + k + '] ' + masterBody.getChild(k).getType() + ': ' + snippet(masterBody.getChild(k)));
    }
    var full = masterBody.getText();
    var leftAll = full.match(/\{\{[^{}]+\}\}/g) || [];
    lines.push('--- APPEND VERDICT ---');
    lines.push('  Appended region has "DEPARTMENT OF THE INTERIOR": ' + (full.indexOf('DEPARTMENT OF THE INTERIOR') !== -1));
    lines.push('  Appended region has "Document Code": ' + (full.indexOf('Document Code') !== -1));
    lines.push('  Leftover {{...}} anywhere in master: ' + (leftAll.length ? leftAll.join(' ') : 'NONE'));
    lines.push(appended === 0 ? '  ⚠ NO CONTENT APPENDED — stale/empty template copy confirmed.' : '  ✓ ' + appended + ' elements appended (expected if the header survived).');
    var spacingFaults = findSpacingFaults(masterBody);
    lines.push('  Spacing faults (empty ¶ before a page break / trailing break or empty ¶): ' +
      (spacingFaults.length ? spacingFaults.join('; ') : 'NONE ✓'));

    masterDoc.saveAndClose();
  } catch (err) {
    lines.push('DIAG ERROR: ' + err.message);
  } finally {
    try { if (tempFile) tempFile.setTrashed(true); } catch (e) { /* best-effort */ }
    try { if (masterFile) masterFile.setTrashed(true); } catch (e) { /* best-effort */ }
  }

  lines.forEach(function(l) { Logger.log(l); });
  ui.alert('Diagnose Batch Append', lines.join('\n'), ui.ButtonSet.OK);
}

// ──────────────────────────────────
// Self-test: assembles a REAL 3-entry batch document through the exact same
// code path as the admin dashboard (template copy → mergeResponseIntoDoc →
// appendRowEntry × 2), then asserts the no-blank-page invariants:
//   1. findSpacingFaults() reports nothing (no empty ¶ before any page break,
//      body doesn't end with a break or empty ¶),
//   2. the header appears once per entry (3 entries → 3 header titles/codes),
//   3. no leftover {{placeholders}} anywhere.
// Menu: DILG Survey > Advanced > Batch Spacing Self-Test. Runs against the
// active row's data (row 2 if the cursor is on the header). Temp files are
// trashed. PASS/FAIL is shown in an alert + Logger.
// ──────────────────────────────────

function runBatchSpacingSelfTest(rowIndex) {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  if (!rowIndex) {
    rowIndex = sheet.getActiveCell().getRow();
    if (rowIndex < 2) rowIndex = 2;
  }

  var lines = [];
  var masterFile = null;
  try {
    var data = readResponseRow(rowIndex, sheet);
    var isEnglish = resolveTemplateChoice(data, 'auto');
    var tplId = isEnglish
      ? SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN')
      : SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID');
    lines.push('Batch Spacing Self-Test — row ' + rowIndex + (isEnglish ? ' (EN template)' : ' (TL template)'));
    if (!tplId) throw new Error('No template doc set (TEMPLATE_DOC_ID' + (isEnglish ? '_EN' : '') + ').');

    var outputFolder = getOutputFolder();
    var tplFile = DriveApp.getFileById(tplId);
    lines.push('Template: ' + tplFile.getName());

    // Entry 1 = master (template copy merged in place — the page-1 path)
    var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    masterFile = tplFile.makeCopy('_SELFTEST_batch_' + ts, outputFolder);
    var masterDoc = openDocWithRetry(masterFile.getId());
    var masterBody = masterDoc.getBody();
    mergeResponseIntoDoc(masterDoc, data, isEnglish);
    applyHeaderPlaceholders(masterBody, data, isEnglish);
    masterDoc.saveAndClose();
    masterDoc = DocumentApp.openById(masterFile.getId());
    masterBody = masterDoc.getBody();

    // Entries 2 and 3 = the real append path (same row reused; structure is
    // what matters, not value uniqueness)
    appendRowEntry(masterBody, rowIndex, 'auto', sheet, outputFolder);
    appendRowEntry(masterBody, rowIndex, 'auto', sheet, outputFolder);

    // ── Assertions (doc is still open) ──
    var faults = findSpacingFaults(masterBody);
    var full = masterBody.getText();
    var headerCount = (full.split('DEPARTMENT OF THE INTERIOR').length - 1);
    var codeCount = (full.split('Document Code').length - 1);
    var left = full.match(/\{\{[^{}]+\}\}/g) || [];
    var childCount = masterBody.getNumChildren();

    // Child-type chain per entry: pinpoints stray page breaks / trailing empty
    // paragraphs inside the APPENDED region (P = paragraph, T = table, L = list
    // item, B = page break, R = horizontal rule, I = inline image, ? = other).
    var chain = [];
    for (var ci = 0; ci < childCount; ci++) {
      var ct = masterBody.getChild(ci).getType();
      var letter = '?';
      if (ct === DocumentApp.ElementType.PARAGRAPH) {
        letter = masterBody.getChild(ci).asParagraph().getText().trim() === '' ? '.' : 'P';
      } else if (ct === DocumentApp.ElementType.TABLE) { letter = 'T'; }
      else if (ct === DocumentApp.ElementType.LIST_ITEM) { letter = 'L'; }
      else if (ct === DocumentApp.ElementType.PAGE_BREAK) { letter = 'B'; }
      else if (ct === DocumentApp.ElementType.HORIZONTAL_RULE) { letter = 'R'; }
      else if (ct === DocumentApp.ElementType.INLINE_IMAGE) { letter = 'I'; }
      chain.push(letter);
    }

    lines.push('Children in master: ' + childCount + ' (page breaks in text: ' +
      (full.match(/\u000b/g) || []).length + ')');
    lines.push('Child chain: ' + (chain.join('') || '(empty)'));
    lines.push('Header title occurrences: ' + headerCount + ' / 3 expected');
    lines.push('Document Code occurrences: ' + codeCount + ' / 3 expected');
    lines.push('Leftover {{...}} placeholders: ' + (left.length ? left.join(' ') : 'NONE'));
    lines.push('Spacing faults: ' + (faults.length ? faults.join('; ') : 'NONE'));

    var ok =
      faults.length === 0 &&
      headerCount >= 3 &&
      codeCount >= 3 &&
      left.length === 0;
    lines.push(ok
      ? 'RESULT: PASS ✓ — no blank-page faults, header on every entry, no leftover placeholders.'
      : 'RESULT: FAIL ✗ — see details above.');
    lines.push('Verification doc (open to confirm visually): ' + masterFile.getUrl());
    lines.push('NOTE: the verification doc above was left in the output folder; delete it when done.');
    masterDoc.saveAndClose();
  } catch (err) {
    lines.push('SELF-TEST ERROR: ' + err.message);
    if (masterFile) { try { masterFile.setTrashed(true); } catch (e) { /* best-effort */ } }
  }

  lines.forEach(function(l) { Logger.log(l); });
  ui.alert('Batch Spacing Self-Test', lines.join('\n'), ui.ButtonSet.OK);
}

// ──────────────────────────────────
// Real-runtime self-test for the batch resume mechanism. Menu: DILG Survey >
// Advanced > Batch Resume Self-Test (uses the active row). Exercises the
// production chunk flow exactly as the admin dashboard does after a timeout:
//   1. first chunk creates the master (non-final),
//   2. a repeat call with the same master doc id must SKIP the already-merged
//      row (idempotency — the guarantee that makes retries safe),
//   3. a chunk-1-style retry (masterDocId='' + resume flag) must rediscover
//      the SAME master via the resume handoff instead of creating a second doc.
// Asserts all three calls return the same doc id, the document holds exactly
// one header, and no spacing faults. The throwaway master is deleted; the
// resume handoff + progress key are cleared so the test cannot affect a real
// batch run afterwards.
// ──────────────────────────────────

function runBatchResumeSelfTest(rowIndex) {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  if (!rowIndex) {
    rowIndex = sheet.getActiveCell().getRow();
    if (rowIndex < 2) rowIndex = 2;
  }

  var lines = [];
  var masterDocId = null;
  try {
    lines.push('Batch Resume Self-Test — row ' + rowIndex + ' (MERGE_VERSION ' + MERGE_VERSION + ')');

    // 1. First chunk: create the master (non-final).
    var first = generateBatchPrintable([rowIndex], 'auto', '', false, sheet, false);
    if (!first.ok || !first.docId) throw new Error('First chunk failed: ' + (first.detail || first.error));
    masterDocId = first.docId;
    lines.push('1. First chunk created master docId ' + masterDocId);

    // 2. Idempotent repeat: same docId, row already merged — must skip, not duplicate.
    var second = generateBatchPrintable([rowIndex], 'auto', masterDocId, false, sheet, false);
    if (!second.ok || second.docId !== masterDocId) {
      throw new Error('Repeat chunk did not reuse the master: ' + JSON.stringify(second));
    }
    lines.push('2. Repeat chunk reused the same master (no duplicate) ✓');

    // 3. Chunk-1-style timeout retry: no masterDocId, resume flag on — must
    //    rediscover the same master via the resume handoff, then finalize.
    var third = generateBatchPrintable([rowIndex], 'auto', '', true, sheet, true);
    if (!third.ok || !third.url || third.docId !== masterDocId) {
      throw new Error('Resume retry did not rediscover the master: ' + JSON.stringify(third));
    }
    lines.push('3. Resume retry rediscovered the same master and finalized ✓');

    // Structural assertions on the finished document.
    var doc = DocumentApp.openById(masterDocId);
    var body = doc.getBody();
    var full = body.getText();
    var headerCount = (full.split('DEPARTMENT OF THE INTERIOR').length - 1);
    if (headerCount !== 1) throw new Error('Expected exactly 1 header, found ' + headerCount);
    lines.push('4. Header occurrences in document: ' + headerCount + ' / 1 ✓');

    var faults = findSpacingFaults(body);
    if (faults.length) throw new Error('Spacing faults: ' + faults.join('; '));
    lines.push('5. Spacing faults: NONE ✓');
    doc.saveAndClose();

    lines.push('RESULT: PASS ✓ — resume reuses the same document; no duplicates, no blank pages.');
  } catch (err) {
    lines.push('SELF-TEST ERROR: ' + err.message);
    lines.push('RESULT: FAIL ✗ — see details above.');
  } finally {
    if (masterDocId) {
      try { SCRIPT_PROP.deleteProperty(batchProgressKey(masterDocId)); } catch (e) { /* best-effort */ }
      try { DriveApp.getFileById(masterDocId).setTrashed(true); } catch (e) { /* best-effort */ }
    }
    try { SCRIPT_PROP.deleteProperty('BATCH_LAST_MASTER'); } catch (e) { /* best-effort */ }
  }

  lines.forEach(function(l) { Logger.log(l); });
  ui.alert('Batch Resume Self-Test', lines.join('\n'), ui.ButtonSet.OK);
}

// Short single-line preview of an element's text for diagnostics
function snippetText(t) {
  return String(t).replace(/\n/g, ' ⏎ ').substring(0, 90);
}

function snippet(el) {
  var t = '';
  try { t = el.getText(); } catch (e) { t = ''; }
  if (el.getType() === DocumentApp.ElementType.TABLE) {
    try {
      t = '[TABLE ' + el.getNumRows() + 'x' + el.getRow(0).getNumCells() + '] ' + t;
    } catch (e) { t = '[TABLE] ' + t; }
  }
  return snippetText(t);
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
    results.push('SQD grid: ' + sqdGridStateLine(doc.getBody()));
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
      lines.push('EN missing keys: ' + (missing.length === 0 ? 'NONE (all ' + expected.length + ' present)' : missing.join(', ')));
      lines.push('EN SQD grid: ' + sqdGridStateLine(enDoc.getBody()));
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
      lines.push('TL SQD grid: ' + sqdGridStateLine(tlDoc.getBody()));
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
        lines.push('(leftover ☐ boxes are EXPECTED when a row has unanswered SQD rows)');
      }
    } catch (e) {
      lines.push('MERGE ERROR: ' + e.message);
    }
  }

  lines.forEach(function(l) { Logger.log(l); });
  ui.alert('Test Merge (English)', lines.join('\n'), ui.ButtonSet.OK);
}
