/**
 * Settings.gs
 * Script properties management & sidebar.
 */

// ──────────────────────────────────
// Called from sidebar HTML
// ──────────────────────────────────

function getSettings() {
  return {
    templateDocId: SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID') || '',
    englishTemplateDocId: SCRIPT_PROP.getProperty('TEMPLATE_DOC_ID_EN') || '',
    outputFolderId: getOutputFolderId(),
    formUrl: SCRIPT_PROP.getProperty('FORM_PREFILLED_URL') || SCRIPT_PROP.getProperty('FORM_URL') || '',
    formId: SCRIPT_PROP.getProperty('FORM_ID') || ''
  };
}

function saveTemplateDoc(docId) {
  SCRIPT_PROP.setProperty('TEMPLATE_DOC_ID', docId);
  return 'Template saved.';
}

function saveEnglishTemplateDoc(docId) {
  SCRIPT_PROP.setProperty('TEMPLATE_DOC_ID_EN', docId);
  return 'English template saved.';
}

function saveOutputFolder(folderId) {
  SCRIPT_PROP.setProperty('OUTPUT_FOLDER_ID', folderId);
  return 'Folder saved.';
}

function resetSettings() {
  var props = ['TEMPLATE_DOC_ID', 'TEMPLATE_DOC_ID_EN', 'OUTPUT_FOLDER_ID', 'FORM_ID', 'FORM_URL'];
  props.forEach(function(p) { SCRIPT_PROP.deleteProperty(p); });
  return 'Settings reset.';
}
