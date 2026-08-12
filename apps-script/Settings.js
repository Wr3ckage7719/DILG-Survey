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
    formId: SCRIPT_PROP.getProperty('FORM_ID') || '',
    adminConfigured: !!(
      SCRIPT_PROP.getProperty('ADMIN_API_SECRET') && SCRIPT_PROP.getProperty('ADMIN_PASSWORD')
    )
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

/**
 * Admin dashboard credentials (called from the Settings sidebar).
 * Never returns the values — the sidebar only shows whether they are set.
 * Changing the secret invalidates any active admin session tokens.
 */
function setAdminCredentials(secret, password) {
  if (!secret || String(secret).length < 20) {
    return 'Admin secret must be at least 20 characters.';
  }
  if (!password || String(password).length < 8) {
    return 'Admin password must be at least 8 characters.';
  }
  SCRIPT_PROP.setProperty('ADMIN_API_SECRET', String(secret));
  SCRIPT_PROP.setProperty('ADMIN_PASSWORD', String(password));
  return 'Admin login saved — /admin is now active.';
}

function resetSettings() {
  var props = ['TEMPLATE_DOC_ID', 'TEMPLATE_DOC_ID_EN', 'OUTPUT_FOLDER_ID', 'FORM_ID', 'FORM_URL'];
  props.forEach(function(p) { SCRIPT_PROP.deleteProperty(p); });
  return 'Settings reset.';
}
