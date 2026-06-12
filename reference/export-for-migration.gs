/**
 * Run once from the Project Tracker Google Apps Script editor to export migration JSON.
 * Paste into the bound script project, run exportProjectTrackerMigrationJson(), then copy
 * the output from View → Logs into exports/projects.json and exports/support_activities.json.
 *
 * Spreadsheet: Project Tracker (1bBTkZXaPjx7kWY2ZELw0wy6B2MfSslgpN1vrlypYrLg)
 */

function exportProjectTrackerMigrationJson() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  exportSheetAsJson_(ss, 'PROJECTS', 'projects.json');
  exportSheetAsJson_(ss, 'SUPPORT_ACTIVITIES', 'support_activities.json');
}

function exportSheetAsJson_(ss, sheetName, fileLabel) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('Missing sheet: ' + sheetName);
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) {
    Logger.log(fileLabel + ': no data rows');
    return;
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const rows = values
    .map(function (row) {
      const obj = {};
      headers.forEach(function (header, index) {
        if (!header) return;
        obj[header] = formatMigrationValue_(row[index], header);
      });
      return obj;
    })
    .filter(function (row) {
      return Object.keys(row).some(function (key) {
        return String(row[key] || '').trim() !== '';
      });
    });

  Logger.log('===== ' + fileLabel + ' (' + rows.length + ' rows) =====');
  Logger.log(JSON.stringify(rows));
}

function formatMigrationValue_(value, header) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    if (header === 'fg_month') {
      return Utilities.formatDate(value, 'Asia/Manila', 'yyyy-MM');
    }
    if (header === 'Created At' || header === 'Updated At' || header === 'Timestamp') {
      return Utilities.formatDate(value, 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss');
    }
    return Utilities.formatDate(value, 'Asia/Manila', 'yyyy-MM-dd');
  }
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}
