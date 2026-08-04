/**
 * DILG Client Satisfaction Survey (FM-SP-DILG-07-07B)
 * Google Apps Script — Main Entry Point
 *
 * Bound script for the survey response spreadsheet.
 * Menu, triggers, orchestration.
 */

// ──────────────────────────────────
// Script-scope constants
// ──────────────────────────────────

var SCRIPT_PROP = PropertiesService.getScriptProperties();

var FORM_TITLE = 'DILG Client Satisfaction Survey (On-Site)';
var FORM_DESC = 'FM-SP-DILG-07-07B | Kagawaran ng Interyor at Pamahalaang Lokal';
var OUTPUT_FOLDER_NAME = 'DILG Survey Generated Sheets';
var TEMPLATE_FOLDER_NAME = 'DILG Survey Templates';

// ──────────────────────────────────
// Menu
// ──────────────────────────────────

function onOpen() {
  var ui = SpreadsheetApp.getUi();

  // Maintenance/dev-only tools live in the Advanced submenu so the main menu
  // stays beginner-friendly (only the everyday actions are shown).
  var advanced = ui.createMenu('Advanced')
    .addItem('Generate Template Document', 'generateTemplateDoc')
    .addItem('Prepare English Template', 'injectEnglishPlaceholders')
    .addItem('Reset English Template', 'stripTemplatePlaceholders')
    .addSeparator()
    .addItem('Verify Template', 'verifyTemplate')
    .addItem('Verify English Template', 'verifyEnglishTemplate')
    .addItem('Fix Template Layout', 'repairTemplate')
    .addSeparator()
    .addItem('Diagnose Deployment', 'checkDeployment')
    .addItem('Test Merge (English) — Selected Row', 'testMergeRow')
    .addSeparator()
    .addItem('Remove Duplicate Reference Numbers', 'cleanupDuplicateRefs')
    .addItem('Delete Test Rows', 'deleteTestRows');

  ui.createMenu('DILG Survey')
    .addItem('Create / Update Google Form', 'createOrUpdateForm')
    .addSeparator()
    .addItem('Generate Printable Sheet (Selected Row)', 'chooseTemplateForSingle')
    .addItem('Batch Generate (Selected Rows)', 'chooseTemplateForBatch')
    .addSeparator()
    .addItem('Settings', 'showSettings')
    .addItem('Install Keep-Warm + Cleanup Triggers', 'installAllTriggers')
    .addSeparator()
    .addItem('About / Help', 'showAbout')
    .addSeparator()
    .addSubMenu(advanced)
    .addToUi();
}

// ──────────────────────────────────
// Form submit trigger
// ──────────────────────────────────

function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Auto-number: Response ID in column A
  var tsCol = 1; // Timestamp auto-column
  var idCol = findColumnIndex(headers, 'Response ID');
  if (idCol > -1) {
    var existingIds = sheet.getRange(2, idCol + 1, row - 1, 1).getValues()
      .filter(function(v) { return v[0] !== ''; });
    sheet.getRange(row, idCol + 1).setValue(existingIds.length + 1);
  }

  // SQD5 safeguard: this office has no payment transactions.
  // If respondent left SQD5 blank, auto-fill N/A.
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toString().indexOf('SQD5') !== -1) {
      var sqd5Cell = sheet.getRange(row, i + 1);
      if (!sqd5Cell.getValue()) {
        sqd5Cell.setValue('N/A');
        Logger.log('SQD5 was blank — auto-filled N/A on row ' + row);
      }
      break;
    }
  }

  // Log submission
  Logger.log('Form submitted. Row: ' + row);
}

function findColumnIndex(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].toString().trim().toLowerCase() === name.toLowerCase()) return i;
  }
  return -1;
}

// ──────────────────────────────────
// Printable generation with template picker (English / Tagalog / Auto)
// ──────────────────────────────────

function chooseTemplateForSingle() {
  showTemplatePicker('single');
}

function chooseTemplateForBatch() {
  showTemplatePicker('batch');
}

function showTemplatePicker(mode) {
  var tpl = HtmlService.createTemplateFromFile('TemplatePicker');
  tpl.mode = mode; // 'single' | 'batch'
  var html = tpl.evaluate()
    .setTitle('Pumili ng Template ng Form')
    .setWidth(340)
    .setHeight(240);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pumili ng Template ng Form');
}

// Called from TemplatePicker.html via google.script.run
function generateSingleWithChoice(choice) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var selection = sheet.getActiveRange();
  if (!selection || selection.isBlank()) return { ok: false, message: 'Pumili ng row na may sagot.' };
  var row = selection.getRow();
  if (row < 2) return { ok: false, message: 'Pumili ng data row (hindi header).' };

  var result = generatePrintableForRow(row, choice);
  if (result && result.indexOf('https://') === 0) {
    return { ok: true, message: 'Generated! Printable sheet saved:', url: result };
  }
  return { ok: false, message: result || 'Hindi makabuo. Check logs.' };
}

function generateBatchWithChoice(choice) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var selection = sheet.getActiveRangeList();
  var ranges = selection ? selection.getRanges() : [];

  var rows = [];
  ranges.forEach(function(rng) {
    for (var r = rng.getRow(); r <= rng.getLastRow(); r++) {
      if (r >= 2) rows.push(r);
    }
  });

  if (rows.length === 0) return { ok: false, message: 'Walang valid data row.' };

  var urls = [];
  var errors = [];
  rows.forEach(function(row) {
    var result = generatePrintableForRow(row, choice);
    if (result && result.indexOf('https://') === 0) urls.push(result);
    else errors.push('Row ' + row + ': ' + result);
  });

  return { ok: true, message: urls.length + ' / ' + rows.length + ' files generated.', urls: urls, errors: errors };
}

// ──────────────────────────────────
// Settings sidebar
// ──────────────────────────────────

function showSettings() {
  var html = HtmlService.createHtmlOutputFromFile('SettingsSidebar')
    .setTitle('DILG Survey — Settings')
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showAbout() {
  var info = [
    'DILG Client Satisfaction Survey Automation',
    'Document Code: FM-SP-DILG-07-07B',
    '',
    'PAANO GAMITIN (How to use):',
    '1. Una, i-click ang "Settings" at piliin ang template doc at output folder.',
    '2. Piliin ang isang row ng sagot sa sheet.',
    '3. I-click ang "Generate Printable Sheet (Selected Row)".',
    '4. Para sa maraming sagot, piliin ang mga row at i-click ang "Batch Generate (Selected Rows)".',
    '',
    'Ang tool ay:',
    '✓ Auto-create Google Form (with CC conditional logic)',
    '✓ Link form responses to this sheet',
    '✓ Generate printable survey sheets from responses',
    '✓ Template-based merge (Google Doc → PDF)',
    '',
    'Para sa maintenance at advanced tools, gamitin ang "Advanced" submenu.'
  ].join('\n');

  SpreadsheetApp.getUi().alert('About DILG Survey Tool', info, SpreadsheetApp.getUi().ButtonSet.OK);
}

// ──────────────────────────────────
// Installable trigger setup (run once from Script Editor)
// ──────────────────────────────────

function installTriggers() {
  // Remove existing
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();

  // Keep the web app deployment warm so survey POSTs never hit the ~27-40s
  // cold start (see keepWarm in WebEndpoint.js).
  installKeepWarmTrigger();
  // Daily safety net that removes any duplicate Reference Number rows.
  installCleanupTrigger();

  Logger.log('onFormSubmit + keepWarm + cleanup triggers installed.');
}
