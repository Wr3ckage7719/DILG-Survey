/**
 * Utilities.gs
 * Date helpers, data validation, Drive folder management.
 *
 * ponytail: single file for small helpers. Split when > 150 lines.
 */

// ──────────────────────────────────
// Format date for display (YYYY-MM-DD → human-readable)
// ──────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  var mm = d.getMonth() + 1;
  var dd = d.getDate();
  return d.getFullYear() + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd;
}

// ──────────────────────────────────
// Validate date not in the future
// ──────────────────────────────────

function isFutureDate(dateString) {
  var d = new Date(dateString);
  var today = new Date();
  today.setHours(23, 59, 59, 999);
  return d.getTime() > today.getTime();
}

// ──────────────────────────────────
// Create or get Drive folder by path
// ──────────────────────────────────

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

// ──────────────────────────────────
// Get color-coded SQD score (for dashboards, future use)
// ──────────────────────────────────

function sqdScoreToNumber(response) {
  var map = {
    'Lubos na sang-ayon': 5,
    'Sang-ayon': 4,
    'Walang kinikilingan': 3,
    'Hindi sang-ayon': 2,
    'Lubos na hindi sang-ayon': 1,
    'N/A': null
  };
  return map[response] !== undefined ? map[response] : null;
}
