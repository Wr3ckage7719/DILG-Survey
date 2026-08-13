/**
 * EnglishTemplate.gs
 * Prepares the user's ENGLISH copy of FM-SP-DILG-07-07B as a merge-ready template.
 *
 * The Tagalog template is the base for data merging ({{placeholders}} + checkmarks).
 * The English template uses the SAME placeholder keys — only the labels differ —
 * so the merge logic in TemplateEngine.gs works unchanged.
 *
 * Workflow:
 *   1. Convert your English file to Google Docs:
 *        Google Drive → right-click file → Open with → Google Docs
 *   2. Copy the Doc ID → Settings → "English Template Document"
 *   3. Run: DILG Survey → Prepare English Template
 *   4. Run: DILG Survey → Verify English Template
 */

// ──────────────────────────────────
// English radio option labels → template keys.
// Entries with `not` are excluded from paragraphs containing those words
// (e.g. "Citizen" must not match inside "Citizen's Charter" lines).
// ──────────────────────────────────

var EN_RADIO_KEYS = [
  // Uri ng Kliyente
  { label: 'Government (Employee or from another agency)', key: 'uri_gobyerno_empleyado_o_mula_sa_ibang_ahensiya', not: ['charter', 'cc'] },
  { label: 'Citizen', key: 'uri_mamamayan', not: ['charter', 'cc'] },
  { label: 'Business', key: 'uri_negosyo', not: ['charter', 'cc'] },
  // Edad
  { label: 'Below 18 y/o', key: 'edad_mas_mababa_sa_18_yo' },
  { label: '65 y/o and above', key: 'edad_65_yo_pataas' },
  { label: '18-24 y/o', key: 'edad_18_24_yo' },
  { label: '25-34 y/o', key: 'edad_25_34_yo' },
  { label: '35-44 y/o', key: 'edad_35_44_yo' },
  { label: '45-54 y/o', key: 'edad_45_54_yo' },
  { label: '55-64 y/o', key: 'edad_55_64_yo' },
  // Kasarian
  { label: 'Prefer not to say', key: 'kasarian_hindi_nais_sabihin' },
  { label: 'LGBTQIA+', key: 'kasarian_lgbtqia' },
  { label: 'Woman', key: 'kasarian_babae' },
  { label: 'Man', key: 'kasarian_lalaki' },
  // CC1
  { label: "I know what a CC is and I saw this office's CC.", key: 'cc1_alam_ko_kung_ano_ang_gabay_at_nakita_ko_ang_gabay_ng_t' },
  { label: "I know what a CC is but I did NOT see this office's CC.", key: 'cc1_alam_ko_kung_ano_ang_gabay_ngunit_hindi_ko_nakita_an' },
  { label: "I learned of the CC only when I saw this office's CC.", key: 'cc1_nalaman_ko_kung_ano_ang_gabay_noong_nakita_ko_ang_gab' },
  { label: "I do not know what a CC is and I did not see one in this office.", key: 'cc1_hindi_ko_alam_kung_ano_ang_gabay_at_hindi_ako_nakakak' },
  // CC2 (N/A handled separately, anchored after "Easy to see")
  { label: 'Easy to see', key: 'cc2_madaling_makita' },
  { label: 'Somewhat easy to see', key: 'cc2_bahagyang_nakikita' },
  { label: 'Not visible at all', key: 'cc2_hindi_makita' },
  { label: 'Difficult to see', key: 'cc2_mahirap_makita' },
  // CC3 (N/A handled separately, anchored after "Helped very much")
  { label: 'Helped very much', key: 'cc3_lubos_na_nakatulong' },
  { label: 'Somewhat helped', key: 'cc3_bahagyang_nakatulong' },
  { label: 'Did not help', key: 'cc3_hindi_nakatulong' }
];

// SQD grid rating columns (English labels, TL fallback)
var EN_RATINGS = [
  { label: 'Strongly agree', key: 'lubos_na_sang_ayon' },
  { label: 'Agree', key: 'sang_ayon' },
  { label: 'Neither agree nor disagree', key: 'walang_kinikilingan' },
  { label: 'Disagree', key: 'hindi_sang_ayon' },
  { label: 'Strongly disagree', key: 'lubos_na_hindi_sang_ayon' },
  { label: 'N/A', key: 'na' }
];

var TL_RATING_LABELS = ['Lubos na sang-ayon', 'Sang-ayon', 'Walang kinikilingan', 'Hindi sang-ayon', 'Lubos na hindi sang-ayon', 'N/A'];
var TL_RATING_KEYS = ['lubos_na_sang_ayon', 'sang_ayon', 'walang_kinikilingan', 'hindi_sang_ayon', 'lubos_na_hindi_sang_ayon', 'na'];

// Free-text fields: anchor regex → placeholder key
var EN_SIMPLE_FIELDS = [
  { re: /operating unit/i, key: 'pangalanNgTanggapan' },
  { re: /^name of service|^service/i, key: 'serbisyongIbinigay' },
  { re: /^date\s*[:.]?/i, key: 'petsa' },
  { re: /^region/i, key: 'rehiyon' },
  { re: /suggestions|further improve/i, key: 'mgaMungkahi' },
  { re: /^name\s*\(optional\)|^name\s*:/i, key: 'pangalan' },
  { re: /^contact number/i, key: 'contactNumber' },
  { re: /^email address/i, key: 'emailAddress' }
];

// ──────────────────────────────────
// Helpers
// ──────────────────────────────────

function normalizeText(s) {
  return String(s).replace(/\u2019|\u2018/g, "'").toLowerCase();
}

// Find a radio option label as a WHOLE token — never inside another word:
// "Man" must not match inside "Woman"; "Easy to see" must not match inside
// "Somewhat easy to see". The label must START at a real option boundary:
// line start, after a checkbox glyph, after a numbered code ("1." / "1)"),
// or after a bullet. Apostrophes are normalized (curly ' == straight ').
function matchOptionAtBoundary(norm, label) {
  var lbl = String(label).replace(/[\u2018\u2019]/g, "'");
  var escaped = lbl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp(
    '(^|[\\u2610\\u25A1][\\s]*|\\d+[.)][\\s]*|\\n[\\s]*|\\u2022[\\s]*)' + escaped + '(?=$|[\\s(.,;:])',
    'i'
  );
  var m = re.exec(norm);
  if (!m) return null;
  return { idx: m.index + m[1].length };
}

// ──────────────────────────────────
// MAIN: inject placeholders into the English template
// ──────────────────────────────────

function injectEnglishPlaceholders() {
  var ui = SpreadsheetApp.getUi();
  var docId = SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN');

  if (!docId) {
    ui.alert('No English Template',
      'I-set muna ang English template document sa Settings.\n\n' +
      'Settings → English Template Document → i-paste ang Doc ID ng iyong English form.',
      ui.ButtonSet.OK);
    return;
  }

  var doc;
  try {
    doc = DocumentApp.openById(docId);
  } catch (e) {
    ui.alert('Error', 'Hindi mabuksan ang English template:\n' + e.message, ui.ButtonSet.OK);
    return;
  }

  var body = doc.getBody();
  var report = { radio: 0, na: 0, sqd: 0, simple: 0, skipped: 0, notFound: [] };

  // 1. Radio options (body paragraphs + non-SQD table cells)
  collectNonSqdContainers(body).forEach(function(container) {
    injectRadioIntoContainer(container, report);
  });

  // 2. N/A lines (anchored after "Easy to see" / "Helped very much")
  injectNAPass(collectNonSqdContainers(body), report);

  // 3. Free-text fields (paragraphs + non-SQD table cells)
  injectSimpleFields(body, report);

  // 4. SQD grid table
  injectSqdTable(body, report);

  doc.saveAndClose();

  // Don't report "missing" keys that already had a placeholder somewhere in the doc
  var fullText = body.getText();
  report.notFound = report.notFound.filter(function(item) {
    var key = item.split(' ')[0];
    if (!/^[a-z0-9_]+$/i.test(key)) return true; // message-like entries always shown
    return fullText.indexOf('{{' + key + '}}') === -1;
  });

  var msg = [
    'English template prepared!',
    '',
    'Placeholders inserted:',
    '  Radio options: ' + report.radio,
    '  N/A lines: ' + report.na,
    '  SQD grid cells: ' + report.sqd,
    '  Text fields: ' + report.simple
  ];
  if (report.skipped > 0) msg.push('  Skipped (could not edit): ' + report.skipped);
  msg.push('');
  if (report.notFound.length > 0) {
    msg.push('NOT found (check manually):');
    report.notFound.forEach(function(k) { msg.push('  • ' + k); });
  } else {
    msg.push('All labels matched.');
  }
  msg.push('');
  msg.push('Susunod: DILG Survey → Verify English Template');

  ui.alert('English Template Prepared', msg.join('\n'), ui.ButtonSet.OK);
  Logger.log('English template report: ' + JSON.stringify(report));
}

// ──────────────────────────────────
// Radio option injection
// ──────────────────────────────────

function injectRadioIntoContainer(container, report) {
  var text = container.getText();
  if (text.indexOf('{{') !== -1) return; // already prepared
  var norm = normalizeText(text);
  var inserts = [];

  EN_RADIO_KEYS.forEach(function(entry) {
    var blocked = false;
    (entry.not || []).forEach(function(w) {
      if (norm.indexOf(w) !== -1) blocked = true;
    });
    if (blocked) return;

    var m2 = matchOptionAtBoundary(norm, entry.label);
    if (!m2) {
      if (report.notFound.indexOf(entry.key) === -1) report.notFound.push(entry.key + ' (' + entry.label + ')');
      return;
    }
    var idx = m2.idx;
    var already = inserts.some(function(ins) { return ins.key === entry.key; });
    if (already) return;

    var box = Math.max(norm.lastIndexOf('\u2610', idx), norm.lastIndexOf('\u25A1', idx));
    var pos;
    var del = null;
    var delEnd = null;
    if (box !== -1 && norm.substring(box + 1, idx).trim() === '') {
      // Checkbox glyph directly before the label: REPLACE it (and any space
      // after it) with the placeholder so the template is pure {{key}} —
      // exactly like the Tagalog template. The merge writes ☑/☐ itself.
      pos = box;
      del = box;
      delEnd = box + 1;
      while (delEnd < norm.length && (norm.charAt(delEnd) === ' ' || norm.charAt(delEnd) === '\t')) delEnd++;
    } else {
      var before = norm.substring(0, idx);
      var m = before.match(/(\d[.)]?\s+)$/);
      pos = m ? idx - m[1].length : idx; // before the option number, else at label start
    }
    inserts.push({ pos: pos, key: entry.key, del: del, delEnd: delEnd });
  });

  if (inserts.length === 0) return;
  inserts.sort(function(a, b) { return b.pos - a.pos; });
  inserts.forEach(function(ins) {
    try {
      var editor = container.editAsText();
      if (ins.del !== null) editor.deleteText(ins.del, ins.delEnd); // remove literal ☐ + spaces
      editor.insertText(ins.pos, '{{' + ins.key + '}} ');
      report.radio++;
    } catch (e) {
      report.skipped++;
    }
  });
}

// ──────────────────────────────────
// N/A lines: cc2_na after "Easy to see", cc3_na after "Helped very much"
// (document order walk so CC2's N/A is never confused with CC3's)
// ──────────────────────────────────

function injectNAPass(containers, report) {
  var seenEasy = false;
  var seenHelped = false;
  var na2 = false;
  var na3 = false;

  containers.forEach(function(c) {
    var text = c.getText();
    if (text.indexOf('{{cc2_na}}') !== -1 || text.indexOf('{{cc3_na}}') !== -1) return;
    var norm = normalizeText(text);
    var hasEasy = norm.indexOf('easy to see') !== -1;
    var hasHelped = norm.indexOf('helped very much') !== -1;
    var re = /n\s*\/\s*a/g;
    var m;
    while ((m = re.exec(norm)) !== null) {
      var before = norm.substring(0, m.index);
      var after = norm.substring(m.index + m[0].length);
      // Skip instructional mentions: "...(Answer 'N/A' on CC2 and CC3)"
      var trimmed = before.replace(/\s+$/, '');
      if (trimmed.slice(-1) === "'" || trimmed.slice(-1) === '"') continue;
      if (/cc2\s*and\s*cc3/i.test(after)) continue;

      var easy = seenEasy || (hasEasy && before.indexOf('easy to see') !== -1);
      var helped = seenHelped || (hasHelped && before.indexOf('helped very much') !== -1);

      if (!na2 && easy && !helped) {
        insertNAPlaceholderAt(c, m.index, 'cc2_na');
        na2 = true;
        report.na++;
        break;
      } else if (!na3 && helped) {
        insertNAPlaceholderAt(c, m.index, 'cc3_na');
        na3 = true;
        report.na++;
        break;
      }
    }
    if (!na2 && hasEasy) seenEasy = true;
    if (hasHelped) seenHelped = true;
  });

  if (!na2) report.notFound.push('cc2_na (N/A line after "Easy to see")');
  if (!na3) report.notFound.push('cc3_na (N/A line after "Helped very much")');
}

function insertNAPlaceholderAt(c, idx, key) {
  var norm = normalizeText(c.getText());
  var box = Math.max(norm.lastIndexOf('\u2610', idx), norm.lastIndexOf('\u25A1', idx));
  var pos;
  var del = null;
  var delEnd = null;
  if (box !== -1 && norm.substring(box + 1, idx).trim() === '') {
    pos = box; // replace the literal checkbox with the placeholder
    del = box;
    delEnd = box + 1;
    while (delEnd < norm.length && (norm.charAt(delEnd) === ' ' || norm.charAt(delEnd) === '\t')) delEnd++;
  } else {
    pos = idx; // "{{key}} N/A"
  }
  var editor = c.editAsText();
  if (del !== null) editor.deleteText(del, delEnd);
  editor.insertText(pos, '{{' + key + '}} ');
}

// ──────────────────────────────────
// Free-text fields
// ──────────────────────────────────

// All body paragraphs + table cells, EXCLUDING the SQD grid table
function collectNonSqdContainers(body) {
  var containers = [];

  body.getParagraphs().forEach(function(p) { containers.push(p); });

  var tables = body.getTables();
  for (var t = 0; t < tables.length; t++) {
    var tableText = '';
    var numRows = tables[t].getNumRows();
    for (var r = 0; r < numRows; r++) {
      var row = tables[t].getRow(r);
      for (var c = 0; c < row.getNumCells(); c++) tableText += ' ' + row.getCell(c).getText();
    }
    if (/SQD\d/i.test(tableText)) continue;
    for (var r2 = 0; r2 < numRows; r2++) {
      var row2 = tables[t].getRow(r2);
      for (var c2 = 0; c2 < row2.getNumCells(); c2++) containers.push(row2.getCell(c2));
    }
  }
  return containers;
}

function injectSimpleFields(body, report) {
  var foundKeys = {};
  collectNonSqdContainers(body).forEach(function(container) {
    var text = container.getText();
    if (text.indexOf('{{') !== -1) return;
    var norm = normalizeText(text);

    EN_SIMPLE_FIELDS.forEach(function(f) {
      if (f.re.test(norm)) {
        container.editAsText().insertText(text.length, ' {{' + f.key + '}}');
        report.simple++;
        foundKeys[f.key] = true;
      }
    });
  });

  EN_SIMPLE_FIELDS.forEach(function(f) {
    if (!foundKeys[f.key]) report.notFound.push(f.key);
  });
}

// ──────────────────────────────────
// SQD grid: inject the compact '☐' glyph into each rating column cell
// (vertical compression — the merge fills the grid positionally).
// ──────────────────────────────────

function injectSqdTable(body, report) {
  var tables = body.getTables();
  var bestFilled = 0;
  var bestTable = null;

  // Pass 1: grid with a labeled rating header row
  for (var t = 0; t < tables.length; t++) {
    var headerCols = findRatingHeader(tables[t]);
    if (!headerCols) continue;
    var filled = injectSqdRows(tables[t], headerCols, report);
    if (filled > bestFilled) { bestFilled = filled; bestTable = tables[t]; }
  }
  if (bestFilled >= 54) return; // full grid: 9 rows × 6 rating columns

  // Pass 2: labeled header found but grid incomplete (e.g. an unrecognized
  // N/A header variant) → retry the SQD table positionally (cols 1–6).
  if (bestTable && bestFilled > 0 && /SQD\d/i.test(tableText(bestTable))) {
    var p2 = {};
    for (var k = 1; k <= 6; k++) p2[k] = TL_RATING_KEYS[k - 1];
    var f2 = injectSqdRows(bestTable, p2, report);
    if (f2 > bestFilled) return;
  }

  // Pass 3: numeric-only header (no label row) — same positional assumption
  for (var t2 = 0; t2 < tables.length; t2++) {
    var tbl = tables[t2];
    if (!/SQD\d/i.test(tableText(tbl))) continue;
    var fallback = {};
    for (var k2 = 1; k2 <= 6; k2++) fallback[k2] = TL_RATING_KEYS[k2 - 1];
    var f3 = injectSqdRows(tbl, fallback, report);
    if (f3 >= 9) return;
  }

  if (bestFilled === 0) report.notFound.push('SQD table (grid with rating columns)');
}

function tableText(table) {
  var txt = '';
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) txt += ' ' + row.getCell(c).getText();
  }
  return txt;
}

// Match a rating header cell, tolerating leading checkbox glyphs, numbers, codes:
// "☐ Strongly agree", "5. Strongly agree", "Lubos na sang-ayon" (TL fallback)
function ratingLabelOf(ct) {
  var cleaned = ct.replace(/^[\s\u2610\u25A1\u2611\u2B1B\d.:\-()]+/, '').toLowerCase();
  // N/A header cells vary: "N/A", "N/A ", "N/A (if not applicable)",
  // "Not applicable", "N.A." — accept any short variant.
  var isNA = /^(n\s*\/\s*a|n\.a\.|not\s*applicable)(?=$|[\s(.:*;,-])/.test(cleaned);
  for (var i = 0; i < EN_RATINGS.length; i++) {
    var lbl = EN_RATINGS[i].label.toLowerCase();
    if (lbl === 'n/a') {
      if (isNA) return EN_RATINGS[i].key;
    } else if (cleaned.indexOf(lbl) === 0) {
      return EN_RATINGS[i].key;
    }
  }
  for (var j = 0; j < TL_RATING_LABELS.length; j++) {
    var tl = TL_RATING_LABELS[j].toLowerCase();
    if (tl === 'n/a') {
      if (isNA) return TL_RATING_KEYS[j];
    } else if (cleaned.indexOf(tl) === 0) {
      return TL_RATING_KEYS[j];
    }
  }
  return null;
}

function findRatingHeader(table) {
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    var cols = {};
    for (var c = 0; c < row.getNumCells(); c++) {
      var ct = normalizeText(row.getCell(c).getText());
      if (ct.length > 0 && ct.length <= 40) {
        var key = ratingLabelOf(ct);
        if (key) cols[c] = key;
      }
    }
    if (Object.keys(cols).length >= 4) return cols;
  }
  return null;
}

function injectSqdRows(table, headerCols, report) {
  var numRows = table.getNumRows();
  var filled = 0;
  var lastLabelText = null;
  var lastNum = null;

  for (var r = 0; r < numRows; r++) {
    var row = table.getRow(r);
    var ncells = row.getNumCells();
    var rowText = '';
    for (var c2 = 0; c2 < ncells; c2++) rowText += ' ' + row.getCell(c2).getText();

    // Skip the header row itself
    var isHeader = false;
    for (var c3 = 0; c3 < ncells; c3++) {
      if (ratingLabelOf(normalizeText(row.getCell(c3).getText()))) { isHeader = true; break; }
    }
    if (isHeader) continue;

    var labelText = ncells > 0 ? row.getCell(0).getText() : '';
    var num;
    if (labelText !== '' && labelText === lastLabelText && lastNum !== null) {
      num = lastNum + 1; // vertically merged label cell spans multiple rows
    } else {
      var m = rowText.match(/SQD(\d+)/i);
      if (!m) continue;
      num = parseInt(m[1], 10);
    }

    var cellKeys = Object.keys(headerCols);
    for (var i = 0; i < cellKeys.length; i++) {
      var ck = cellKeys[i];
      var col = parseInt(ck, 10);
      if (col >= ncells) continue;
      var cell = row.getCell(col);
      if (cell.getText().indexOf('{{') !== -1) continue;
      // Compact grid: each rating cell holds a single ☐ glyph (~1 char); the
      // merge fills the grid positionally from the header row.
      cell.setText(SQD_CHECK_GLYPH);
      filled++;
    }
    lastLabelText = labelText;
    lastNum = num;
  }
  return filled;
}

// ──────────────────────────────────
// Reset: strip ALL {{placeholders}} from the English template so it can
// be prepared fresh. Use after label matcher changes (e.g. Man/Woman fix).
// ──────────────────────────────────

function stripTemplatePlaceholders() {
  var ui = SpreadsheetApp.getUi();
  var docId = SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN');

  if (!docId) {
    ui.alert('No English Template', 'Walang naka-set na English template.', ui.ButtonSet.OK);
    return;
  }

  var doc;
  try {
    doc = DocumentApp.openById(docId);
  } catch (e) {
    ui.alert('Error', 'Hindi mabuksan ang English template:\n' + e.message, ui.ButtonSet.OK);
    return;
  }

  var body = doc.getBody();
  var before = (body.getText().match(/\{\{/g) || []).length;
  body.replaceText('\\{\\{[a-zA-Z0-9_]+\\}\\}', '');
  body.replaceText('[☐□]', ''); // strip leftover checkbox glyphs (RE2: literal chars only)
  doc.saveAndClose();
  var after = (doc.getBody().getText().match(/\{\{/g) || []).length;

  ui.alert('English Template Reset',
    'Naalis ang ' + (before - after) + ' placeholders.\n\n' +
    'Patakbuhin ngayon: DILG Survey > Prepare English Template',
    ui.ButtonSet.OK);
}

// ──────────────────────────────────
// Verify the English template
// ──────────────────────────────────

function verifyEnglishTemplate() {
  var ui = SpreadsheetApp.getUi();
  var docId = SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN');

  if (!docId) {
    ui.alert('Not Set', 'Walang English template na naka-set.', ui.ButtonSet.OK);
    return;
  }

  var results = [];
  try {
    var file = DriveApp.getFileById(docId);
    results.push('\u2713 File: ' + file.getName());

    var mime = file.getMimeType();
    if (mime === 'application/vnd.google-apps.document') {
      results.push('\u2713 Format: Google Docs (tama)');
    } else {
      results.push('\u2717 Format: ' + mime + ' — dapat i-convert sa Google Docs');
    }

    var doc = DocumentApp.openById(docId);
    var text = doc.getBody().getText();
    var unique = {};
    (text.match(/\{\{\w+\}\}/g) || []).forEach(function(p) { unique[p] = true; });
    var total = text.split('{{').length - 1;
    results.push('\u2713 Placeholders: ' + Object.keys(unique).length + ' unique / ' + total + ' total');

    var expected = expectedTemplateKeys();
    var missing = expected.filter(function(k) { return text.indexOf('{{' + k + '}}') === -1; });
    if (missing.length === 0) {
      results.push('\u2713 Lahat ng ' + expected.length + ' placeholders ay naroroon');
    } else {
      results.push('\u2717 Kulang (' + missing.length + '/' + expected.length + '): ' + missing.join(', '));
    }
    results.push('SQD grid: ' + sqdGridStateLine(doc.getBody()));
    doc.saveAndClose();
  } catch (e) {
    results.push('\u2717 Error: ' + e.message);
  }

  ui.alert('English Template Verification', results.join('\n'), ui.ButtonSet.OK);
}
