const APP_TITLE = 'Validation Routing Monitoring System';

const DOCUMENT_HEADERS = [
  'Routing Tracker #',
  'Doc Tracer #',
  'Equipment/Product',
  'Category',
  'IL-Tag',
  'Status',
  'Sent/Routing To',
  'Email',
  'Date Sent',
  'Report/Protocol',
  'Batch No.',
  'Client Name',
  'Department',
  'Prepared By',
  'Date Prepared',
  'Checked By',
  'Date Checked',
  'Target Completion Date',
  'Remarks',
  'Created At',
  'Updated At',
  'Updated By',
  'Signatories',
  'Total Routing Duration',
  'Routing Completed At'
];

const AUDIT_HEADERS = ['Timestamp', 'User', 'Action', 'Routing Tracker #', 'Doc Tracer #', 'Details'];

const OPTIONAL_NA_FIELDS = ['IL-Tag', 'Remarks'];

const REGISTRY_TYPES = {
  Status: 'Registry_Status',
  'Sent / Routing': 'Registry_SentRouting',
  'Report / Protocol': 'Registry_ReportProtocol',
  Client: 'Registry_Client',
  Category: 'Registry_Category',
  Department: 'Registry_Department',
  'Prepared by': 'Registry_PreparedBy',
  'Checked by': 'Registry_CheckedBy'
};

const DEFAULT_REGISTRY = {
  Status: ['Routing', 'Completed', 'For Scanning', 'Sent', 'In EDMS', 'Returned to', 'Cancelled'],
  'Sent / Routing': ['Steve', 'Isaiah', 'Fong', 'Icel', 'Jon', 'Othy', 'Ernz'],
  'Report / Protocol': ['Endorsement', 'Report', 'Protocol', 'Charac. Report', 'Ver. Protocol', 'Ver. Endorsement'],
  Client: ['Client A', 'Client B'],
  Category: ['Process', 'Product', 'Equipment'],
  Department: ['Validation', 'QA', 'Regulatory', 'Production'],
  'Prepared by': ['Carlo Lidres'],
  'Checked by': ['Carlo Lidres']
};

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupVRMS() {
  const ss = SpreadsheetApp.getActive();

  setupSheet_(ss, 'Documents', DOCUMENT_HEADERS);
  ensureDocumentHeaders_();
  setupSheet_(ss, 'AuditTrail', AUDIT_HEADERS);
  ensureAuditHeaders_();

  Object.keys(REGISTRY_TYPES).forEach(type => {
    const sheet = setupSheet_(ss, REGISTRY_TYPES[type], ['Value']);
    if (sheet.getLastRow() === 1) {
      sheet.getRange(2, 1, DEFAULT_REGISTRY[type].length, 1)
        .setValues(DEFAULT_REGISTRY[type].map(value => [value]));
    }
  });

  return getAppData();
}

function getAppData() {
  setupVRMSIfMissing_();
  ensureDocumentHeaders_();
  ensureRegistryDefaults_();
  backfillMissingTrackers_();
  repairDocumentSignatories_();

  const documents = readObjects_('Documents');
  const registries = {};

  Object.keys(REGISTRY_TYPES).forEach(type => {
    registries[type] = readRegistry_(REGISTRY_TYPES[type]);
  });

  return {
    documents,
    registries,
    dashboard: buildDashboard_(documents),
    user: getUserEmail_()
  };
}

function saveDocument(payload) {
  setupVRMSIfMissing_();
  ensureDocumentHeaders_();

  const lock = LockService.getDocumentLock() || LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('Documents');

    const originalTracker = String(payload.__originalTracker || '').trim();
    const docTracer = String(payload['Doc Tracer #'] || '').trim();

    if (!docTracer) throw new Error('Document Tracer Number is required.');

    let routingTracker = String(payload['Routing Tracker #'] || originalTracker || '').trim();
    if (!routingTracker) routingTracker = generateUniqueTracker_();

    const now = new Date();
    const user = getUserEmail_();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const trackerIndex = headers.indexOf('Routing Tracker #');
    const docTracerIndex = headers.indexOf('Doc Tracer #');

    let row = -1;
    let duplicateDocTracerRow = -1;

    for (let i = 1; i < data.length; i++) {
      const existingTracker = String(data[i][trackerIndex] || '').trim();
      const existingDocTracer = String(data[i][docTracerIndex] || '').trim().toLowerCase();

      if (existingTracker === routingTracker || (originalTracker && existingTracker === originalTracker)) {
        row = i + 1;
      }

      if (existingDocTracer && existingDocTracer === docTracer.toLowerCase()) {
        duplicateDocTracerRow = i + 1;
      }
    }

    if (duplicateDocTracerRow > -1 && row !== duplicateDocTracerRow) {
      const existingTracker = sheet.getRange(duplicateDocTracerRow, trackerIndex + 1).getValue();
      throw new Error('Document already existing. Tracking number assigned: ' + existingTracker);
    }

    if (row === -1 && trackerExists_(routingTracker)) {
      throw new Error('Routing tracker already existing. Tracking number assigned: ' + routingTracker);
    }

    if (row > -1 && originalTracker && originalTracker !== routingTracker) {
      throw new Error('Routing tracker cannot be changed after creation.');
    }

    const existing = row > -1
      ? rowToObject_(headers, sheet.getRange(row, 1, 1, headers.length).getValues()[0])
      : {};

    const record = {};
    DOCUMENT_HEADERS.forEach(header => {
      if (OPTIONAL_NA_FIELDS.indexOf(header) !== -1 && Object.prototype.hasOwnProperty.call(payload, header)) {
        record[header] = normalizeDocumentFieldValue_(header, payload[header]);
        return;
      }
      record[header] = payload[header] || existing[header] || '';
    });

    record['Routing Tracker #'] = routingTracker;
    record['Doc Tracer #'] = docTracer;
    const statusKey = getStatusKey_(record.Status);
    const isRouting = statusKey === 'routing';
    const isCancelled = statusKey === 'cancelled';
    const allowedSignatoryNames = getAllowedSignatoryNames_();
    const startsCleanRouting = row === -1 || getStatusKey_(existing.Status) === 'cancelled' || !parseSignatories_(existing.Signatories).length;
    const signatories = isCancelled
      ? []
      : normalizeSignatories_(payload.Signatories, existing.Signatories, now, startsCleanRouting, isRouting, allowedSignatoryNames);
    if (isRouting && !signatories.length) {
      throw new Error('Add at least one signatory before saving a document with Routing status.');
    }
    if (isRouting && signatories.length && !hasSigningStarted_(signatories)) {
      const sentRoutingTo = String(payload['Sent/Routing To'] || '').trim();
      const allowedName = buildAllowedNameMap_(allowedSignatoryNames)[sentRoutingTo.toLowerCase()];
      if (!allowedName) {
        throw new Error('Please select the first routing recipient in Sent/Routing To before setting this document to Routing.');
      }
      if (signatories[0].Name !== allowedName) {
        throw new Error('The first signatory must match the selected Sent/Routing To recipient.');
      }
    }
    if (isRouting) {
      record['Sent/Routing To'] = getActiveSignatoryName_(signatories);
    } else if (isCancelled) {
      record['Sent/Routing To'] = '';
    }
    record['Signatories'] = serializeSignatories_(signatories);
    record['Total Routing Duration'] = getTotalRoutingDuration_(signatories);
    record['Routing Completed At'] = getRoutingCompletedAt_(signatories);
    record['Created At'] = existing['Created At'] || now;
    record['Updated At'] = now;
    record['Updated By'] = user;

    const values = DOCUMENT_HEADERS.map(header => record[header]);

    if (row > -1) {
      sheet.getRange(row, 1, 1, DOCUMENT_HEADERS.length).setValues([values]);
      const changes = diff_(existing, record);
      logAudit_('Updated document', routingTracker, docTracer, formatAuditDetails_(changes, user, 'updated'));
    } else {
      sheet.appendRow(values);
      logAudit_('Created document', routingTracker, docTracer, `Document tracker "${routingTracker}" was created by ${user} on ${formatDisplayDateTime_(now)}.`);
    }

  } finally {
    lock.releaseLock();
  }

  return getAppData();
}

function generateUniqueTracker_() {
  ensureDocumentHeaders_();

  const existing = readObjects_('Documents')
    .map(row => String(row['Routing Tracker #'] || '').trim())
    .filter(Boolean)
    .reduce((map, tracker) => {
      map[tracker] = true;
      return map;
    }, {});

  return generateTrackerFromSet_(existing);
}

function generateTrackerFromSet_(existing) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  let tracker = '';
  let attempts = 0;

  do {
    tracker = '';
    for (let i = 0; i < 4; i++) {
      tracker += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    attempts++;
    if (attempts > 1000) {
      throw new Error('Unable to generate a unique tracker number. Please try again.');
    }
  } while (existing[tracker]);

  return tracker;
}

function getDocumentByTracer(tracker) {
  setupVRMSIfMissing_();
  ensureDocumentHeaders_();

  tracker = String(tracker || '').trim();

  const found = readObjects_('Documents').find(row =>
    String(row['Routing Tracker #'] || '').trim() === tracker
  );

  if (!found) throw new Error('No document found for tracking number: ' + tracker);
  return found;
}

function signDocumentSignatory(tracker, order) {
  setupVRMSIfMissing_();
  ensureDocumentHeaders_();

  const lock = LockService.getDocumentLock() || LockService.getScriptLock();
  lock.waitLock(30000);
  let result = null;

  try {
    tracker = String(tracker || '').trim();
    order = normalizeSignatoryOrder_(order, 0);
    if (!tracker) throw new Error('Missing routing tracker number.');

    const sheet = SpreadsheetApp.getActive().getSheetByName('Documents');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const trackerIndex = headers.indexOf('Routing Tracker #');
    const signatoriesIndex = headers.indexOf('Signatories');
    const statusIndex = headers.indexOf('Status');
    const updatedAtIndex = headers.indexOf('Updated At');
    const updatedByIndex = headers.indexOf('Updated By');

    let row = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][trackerIndex] || '').trim() === tracker) {
        row = i + 1;
        break;
      }
    }

    if (row === -1) throw new Error('No document found for tracking number: ' + tracker);

    const record = rowToObject_(headers, sheet.getRange(row, 1, 1, headers.length).getValues()[0]);
    if (getStatusKey_(record.Status) !== 'routing') {
      throw new Error('This document is no longer in Routing status and cannot be signed.');
    }

    logRoutingDebug_('Raw saved signatory data', {
      tracker: tracker,
      rawSignatories: record.Signatories,
      parsedSignatories: parseSignatories_(record.Signatories)
    });

    const signatories = normalizeSignatories_(record.Signatories, '', new Date(), false, true, getAllowedSignatoryNames_());
    if (!signatories.length) {
      throw new Error('Signatory data is corrupted for tracker ' + tracker + ': no signatories exist.');
    }
    const canonicalBeforeSigning = serializeSignatories_(signatories);
    if (String(record.Signatories || '') !== canonicalBeforeSigning) {
      sheet.getRange(row, signatoriesIndex + 1).setValue(canonicalBeforeSigning);
      logRoutingDebug_('Repaired signatory data before signing', {
        tracker: tracker,
        signatories: signatories.map(item => ({
          order: item.Order,
          name: item.Name,
          status: item.Status,
          forwarded: item['Date/time forwarded'],
          signed: item['Date/time signed']
        }))
      });
    }

    const statusBefore = signatories.map(item => ({
      order: normalizeSignatoryOrder_(item.Order, 0),
      name: item.Name || '',
      status: item.Status || '',
      forwarded: item['Date/time forwarded'] || '',
      signed: item['Date/time signed'] || ''
    }));
    const active = getCurrentSignatory_(signatories, order);
    const target = active || signatories.find(item => normalizeSignatoryOrder_(item.Order, 0) === order && item.Status !== 'Signed');

    logRoutingDebug_('Signing request received', {
      tracker: tracker,
      requestedOrder: order,
      currentActiveOrder: active ? active.Order : '',
      currentActiveName: active ? active.Name : '',
      currentSigner: target ? target.Name : '',
      signatories: statusBefore
    });

    if (!target) {
      throw new Error('All signatories are already signed for tracker ' + tracker + '.');
    }
    if (target.Status === 'Signed') throw new Error(`${target.Name || 'This signatory'} has already been marked as signed.`);
    if (!active || normalizeSignatoryOrder_(active.Order, 0) !== normalizeSignatoryOrder_(target.Order, 0)) {
      throw new Error(`Only the current active signatory (${active && active.Name ? active.Name : 'the next signer'}) can be marked as signed.`);
    }

    const now = new Date();
    const signedName = target.Name || 'This signatory';
    const targetOldStatus = target.Status || 'Pending';
    target.Status = 'Signed';
    target['Date/time signed'] = formatDateTime_(now);
    target['Duration pending/signing time'] = durationBetween_(target['Date/time forwarded'], now);

    const targetOrder = normalizeSignatoryOrder_(target.Order, 0);
    let next = signatories
      .filter(item => item.Status !== 'Signed' && normalizeSignatoryOrder_(item.Order, 0) > targetOrder)
      .sort((a, b) => normalizeSignatoryOrder_(a.Order, 0) - normalizeSignatoryOrder_(b.Order, 0))[0];
    if (!next) {
      next = signatories
        .filter(item => item.Status !== 'Signed')
        .sort((a, b) => normalizeSignatoryOrder_(a.Order, 0) - normalizeSignatoryOrder_(b.Order, 0))[0];
    }

    let status = record.Status || 'Routing';
    let nextName = '';
    let nextOldStatus = '';
    let nextForwardedBefore = '';
    if (next) {
      nextOldStatus = next.Status || 'Pending';
      nextForwardedBefore = next['Date/time forwarded'] || '';
      signatories.forEach(item => {
        if (item !== next && item.Status !== 'Signed') item.Status = 'Pending';
      });
      next.Status = 'Active';
      if (!next['Date/time forwarded']) next['Date/time forwarded'] = formatDateTime_(now);
      nextName = next.Name || '';
      status = 'Routing';
    } else {
      status = getRoutingCompleteStatus_();
    }

    sheet.getRange(row, signatoriesIndex + 1).setValue(serializeSignatories_(signatories));
    sheet.getRange(row, statusIndex + 1).setValue(status);
    const sentRoutingIndex = headers.indexOf('Sent/Routing To');
    if (sentRoutingIndex > -1) sheet.getRange(row, sentRoutingIndex + 1).setValue(status === 'Routing' ? nextName : '');
    const totalDurationIndex = headers.indexOf('Total Routing Duration');
    if (totalDurationIndex > -1) sheet.getRange(row, totalDurationIndex + 1).setValue(getTotalRoutingDuration_(signatories));
    const completedAtIndex = headers.indexOf('Routing Completed At');
    if (completedAtIndex > -1) sheet.getRange(row, completedAtIndex + 1).setValue(status === 'Routing' ? '' : formatDateTime_(now));
    sheet.getRange(row, updatedAtIndex + 1).setValue(now);
    sheet.getRange(row, updatedByIndex + 1).setValue(getUserEmail_());
    const signedAt = formatDisplayDateTime_(now);
    const user = getUserEmail_();
    const completionMessage = status !== 'Routing'
      ? ` ${signedName} signed routing document ${tracker}. Status was changed from "Routing" to "${status}" by ${user} on ${signedAt}.`
      : ` The document was forwarded to "${nextName}" by ${user} on ${signedAt}.`;
    logAudit_('Signed routing signatory', tracker, record['Doc Tracer #'], `Signatory #${targetOrder} "${signedName}" was marked signed by ${user} on ${signedAt}. ${formatSignatoryStatusChangeAudit_(target, targetOldStatus, 'Signed')}${next ? ' ' + formatSignatoryStatusChangeAudit_(next, nextOldStatus, 'Active', nextForwardedBefore, next['Date/time forwarded']) : ''}${completionMessage}`);

    logRoutingDebug_('Signing request completed', {
      tracker: tracker,
      signedOrder: targetOrder,
      signedName: signedName,
      signedStatusFrom: targetOldStatus,
      signedStatusTo: target.Status,
      nextOrder: next ? next.Order : '',
      nextName: nextName,
      nextStatusFrom: nextOldStatus,
      nextStatusTo: next ? next.Status : '',
      nextForwardedAt: next ? next['Date/time forwarded'] : '',
      documentStatus: status,
      signatories: signatories.map(item => ({
        order: item.Order,
        name: item.Name,
        status: item.Status,
        forwarded: item['Date/time forwarded'],
        signed: item['Date/time signed']
      }))
    });

    result = {
      signedName,
      nextName,
      final: status !== 'Routing',
      status
    };
  } finally {
    lock.releaseLock();
  }

  result.appData = getAppData();
  return result;
}

function trackerExists_(tracker) {
  return readObjects_('Documents').some(row => String(row['Routing Tracker #'] || '').trim() === tracker);
}

function backfillMissingTrackers_() {
  const lock = LockService.getDocumentLock() || LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName('Documents');
    if (!sheet || sheet.getLastRow() < 2) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const trackerIndex = headers.indexOf('Routing Tracker #');
    if (trackerIndex === -1) return;

    const existing = {};
    for (let i = 1; i < data.length; i++) {
      const tracker = String(data[i][trackerIndex] || '').trim();
      if (tracker) existing[tracker] = true;
    }

    for (let i = 1; i < data.length; i++) {
      const hasContent = data[i].some(Boolean);
      const tracker = String(data[i][trackerIndex] || '').trim();
      if (!hasContent || tracker) continue;

      const generated = generateTrackerFromSet_(existing);
      existing[generated] = true;
      sheet.getRange(i + 1, trackerIndex + 1).setValue(generated);
    }
  } finally {
    lock.releaseLock();
  }
}

function repairDocumentSignatories_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Documents');
  if (!sheet || sheet.getLastRow() < 2) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const signatoriesIndex = headers.indexOf('Signatories');
  const statusIndex = headers.indexOf('Status');
  const trackerIndex = headers.indexOf('Routing Tracker #');
  if (signatoriesIndex === -1) return;

  const allowedNames = getAllowedSignatoryNames_();
  for (let i = 1; i < data.length; i++) {
    const raw = data[i][signatoriesIndex];
    const parsed = parseSignatories_(raw);
    if (!parsed.length) continue;

    const tracker = trackerIndex > -1 ? String(data[i][trackerIndex] || '').trim() : '';
    const isRouting = statusIndex > -1 && getStatusKey_(data[i][statusIndex]) === 'routing';
    let normalized = [];
    try {
      normalized = normalizeSignatories_(raw, '', new Date(), false, isRouting, allowedNames);
    } catch (err) {
      logRoutingDebug_('Skipped signatory repair', {
        tracker: tracker,
        reason: err && err.message ? err.message : String(err),
        rawSignatories: raw
      });
      continue;
    }

    const repaired = serializeSignatories_(normalized);
    if (String(raw || '') !== repaired) {
      sheet.getRange(i + 1, signatoriesIndex + 1).setValue(repaired);
      logRoutingDebug_('Repaired signatory data', {
        tracker: tracker,
        signatories: normalized.map(item => ({
          order: item.Order,
          name: item.Name,
          status: item.Status,
          forwarded: item['Date/time forwarded'],
          signed: item['Date/time signed']
        }))
      });
    }
  }
}

function addRegistryValue(type, value) {
  setupVRMSIfMissing_();

  if (!REGISTRY_TYPES[type]) throw new Error('Unknown registry type.');

  value = String(value || '').trim();
  if (!value) throw new Error('Value is required.');
  if (!isValidRegistryValue_(value)) throw new Error('Registry values can only contain readable text, numbers, spaces, and common punctuation.');

  const sheet = SpreadsheetApp.getActive().getSheetByName(REGISTRY_TYPES[type]);
  const existing = readRegistry_(REGISTRY_TYPES[type]).map(v => v.toLowerCase());

  if (existing.indexOf(value.toLowerCase()) === -1) {
    sheet.appendRow([value]);
    logAudit_('Added registry value', '', '', `${type} registry value "${value}" was added by ${getUserEmail_()} on ${formatDisplayDateTime_(new Date())}.`);
  }

  return getAppData();
}

function deleteRegistryValue(type, value) {
  setupVRMSIfMissing_();

  if (!REGISTRY_TYPES[type]) throw new Error('Unknown registry type.');

  const sheet = SpreadsheetApp.getActive().getSheetByName(REGISTRY_TYPES[type]);
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === String(value).trim()) {
      sheet.deleteRow(i + 1);
      logAudit_('Deleted registry value', '', '', `${type} registry value "${value}" was removed by ${getUserEmail_()} on ${formatDisplayDateTime_(new Date())}.`);
      break;
    }
  }

  return getAppData();
}

function getAuditTrail() {
  setupVRMSIfMissing_();
  ensureAuditHeaders_();
  return readObjects_('AuditTrail').reverse();
}

function setupVRMSIfMissing_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName('Documents')) setupVRMS();
}

function ensureRegistryDefaults_() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(REGISTRY_TYPES).forEach(type => {
    const sheet = ss.getSheetByName(REGISTRY_TYPES[type]);
    if (!sheet || !DEFAULT_REGISTRY[type]) return;

    const existing = readRegistry_(REGISTRY_TYPES[type]).map(value => value.toLowerCase());
    DEFAULT_REGISTRY[type].forEach(value => {
      if (existing.indexOf(String(value).toLowerCase()) === -1) {
        sheet.appendRow([value]);
        existing.push(String(value).toLowerCase());
      }
    });
  });
}

function setupSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);

  if (sheet.getLastRow() === 0) sheet.appendRow(headers);

  const currentHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
    .getValues()[0];

  if (currentHeaders.slice(0, headers.length).join('|') !== headers.join('|')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  return sheet;
}

function ensureDocumentHeaders_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Documents');
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];

  DOCUMENT_HEADERS.forEach(header => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
}

function ensureAuditHeaders_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('AuditTrail');
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];

  AUDIT_HEADERS.forEach(header => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
}

function readObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  return data
    .map(row => rowToObject_(headers, row))
    .filter(row => Object.values(row).some(Boolean));
}

function rowToObject_(headers, row) {
  const object = {};
  headers.forEach((header, index) => object[header] = formatValue_(row[index], header));
  return object;
}

function readRegistry_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getValues()
    .map(row => String(row[0]).trim())
    .filter(Boolean);
}

function buildDashboard_(documents) {
  const today = new Date();
  const statusCounts = {};
  const signatoryStats = {};

  documents.forEach(doc => {
    const status = doc.Status || 'Blank';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    parseSignatories_(doc.Signatories).forEach(item => {
      const name = String(item.Name || '').trim();
      if (!name) return;

      if (!signatoryStats[name]) {
        signatoryStats[name] = {
          name,
          signed: 0,
          pending: 0,
          completed: 0,
          durationMinutes: 0,
          avgDurationMinutes: -1,
          durationSamples: 0
        };
      }

      const stats = signatoryStats[name];
      const statusValue = String(item.Status || '').trim();
      if (statusValue === 'Signed') {
        stats.signed++;
        stats.completed++;
        const minutes = durationMinutes_(item['Date/time forwarded'], item['Date/time signed']);
        if (minutes >= 0) {
          stats.durationMinutes += minutes;
          stats.durationSamples++;
        }
      } else {
        stats.pending++;
      }
    });
  });

  const routingDocs = documents.filter(doc => doc.Status === 'Routing');
  const aging = routingDocs
    .map(doc => daysBetween_(doc['Date Sent'], today))
    .filter(days => days >= 0);

  return {
    total: documents.length,
    routing: statusCounts.Routing || 0,
    forScanning: statusCounts['For Scanning'] || 0,
    sent: statusCounts.Sent || 0,
    inEdms: statusCounts['In EDMS'] || 0,
    cancelled: statusCounts.Cancelled || 0,
    overdue: documents.filter(doc => isOverdue_(doc)).length,
    avgAging: aging.length ? Math.round(aging.reduce((a, b) => a + b, 0) / aging.length) : 0,
    statusCounts,
    kpi: Object.keys(signatoryStats)
      .map(name => {
        const item = signatoryStats[name];
        const avgMinutes = item.durationSamples ? Math.round(item.durationMinutes / item.durationSamples) : -1;
        return {
          name: item.name,
          signed: item.signed,
          avgDuration: avgMinutes >= 0 ? humanDuration_(avgMinutes) : 'N/A',
          avgDurationMinutes: avgMinutes,
          pending: item.pending,
          completed: item.completed
        };
      })
      .sort((a, b) => b.avgDurationMinutes - a.avgDurationMinutes || b.signed - a.signed || a.name.localeCompare(b.name)),
    recent: documents
      .slice()
      .sort((a, b) => new Date(b['Updated At']) - new Date(a['Updated At']))
      .slice(0, 8),
    active: routingDocs
      .slice()
      .sort((a, b) => new Date(b['Updated At']) - new Date(a['Updated At']))
      .slice(0, 12)
  };
}

function isOverdue_(doc) {
  if (!doc['Target Completion Date'] || ['Sent', 'In EDMS', 'Cancelled'].indexOf(doc.Status) !== -1) return false;

  const target = new Date(doc['Target Completion Date']);
  const today = new Date();

  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return target < today;
}

function daysBetween_(start, end) {
  if (!start) return -1;

  const startDate = new Date(start);
  if (isNaN(startDate)) return -1;

  return Math.floor((new Date(end) - startDate) / 86400000);
}

function diff_(before, after) {
  const changes = {};

  DOCUMENT_HEADERS.forEach(header => {
    if (String(before[header] || '') !== String(after[header] || '')) {
      changes[header] = {
        from: before[header] || '',
        to: after[header] || ''
      };
    }
  });

  return changes;
}

function normalizeDocumentFieldValue_(header, value) {
  if (OPTIONAL_NA_FIELDS.indexOf(header) !== -1) {
    return String(value || '').trim() || 'n/a';
  }
  return value || '';
}

function getStatusKey_(status) {
  return String(status || '').trim().toLowerCase();
}

function getAllowedSignatoryNames_() {
  return readRegistry_(REGISTRY_TYPES['Sent / Routing']);
}

function buildAllowedNameMap_(allowedNames) {
  return (allowedNames || getAllowedSignatoryNames_()).reduce((map, name) => {
    const value = String(name || '').trim();
    if (value) map[value.toLowerCase()] = value;
    return map;
  }, {});
}

function hasSigningStarted_(signatories) {
  return (signatories || []).some(item => item.Status === 'Signed' || !!item['Date/time signed']);
}

function normalizeSignatoryOrder_(value, fallback) {
  const text = String(value || '').trim();
  const match = text.match(/\d+/);
  const number = Number(match ? match[0] : value);
  return number > 0 ? number : fallback;
}

function normalizeSignatoryStatus_(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'signed' || text === 'completed' || text === 'complete') return 'Signed';
  if (text === 'active' || text === 'current' || text === 'routing') return 'Active';
  return 'Pending';
}

function isValidRegistryValue_(value) {
  const text = String(value || '').trim();
  return !!text && text.length <= 120 && /^[A-Za-z0-9][A-Za-z0-9 .,_/#()&+\-']*$/.test(text);
}

function auditLabel_(field) {
  const labels = {
    'Doc Tracer #': 'Document tracer',
    'Routing Tracker #': 'Routing tracker',
    'Sent/Routing To': 'Sent/Routing To',
    'Signatories': 'Signatories Tracker',
    'Total Routing Duration': 'Total routing duration',
    'Routing Completed At': 'Routing completed at',
    'IL-Tag': 'IL-Tag',
    'Email': 'Email',
    'Date Sent': 'Date sent',
    'Report/Protocol': 'Report/protocol',
    'Batch No.': 'Batch number',
    'Client Name': 'Client name',
    'Prepared By': 'Prepared by',
    'Date Prepared': 'Date prepared',
    'Checked By': 'Checked by',
    'Date Checked': 'Date checked',
    'Target Completion Date': 'Target completion date'
  };
  return labels[field] || field;
}

function auditValue_(value) {
  const text = String(value || '').trim();
  if (!text) return 'blank';
  if (text.charAt(0) === '[' || text.charAt(0) === '{') return 'updated';
  return `"${text}"`;
}

function formatAuditDetails_(changes, user, verb) {
  const keys = Object.keys(changes || {}).filter(key => ['Updated At', 'Updated By'].indexOf(key) === -1);
  if (!keys.length) return `Document record was opened with no changes by ${user} on ${formatDisplayDateTime_(new Date())}.`;

  return keys.map(key => {
    const change = changes[key] || {};
    const label = auditLabel_(key);
    if (!String(change.from || '').trim()) {
      return `${label} was set to ${auditValue_(change.to)}.`;
    }
    if (!String(change.to || '').trim()) {
      return `${label} was changed from ${auditValue_(change.from)} to blank.`;
    }
    return `${label} was changed from ${auditValue_(change.from)} to ${auditValue_(change.to)}.`;
  }).join(' ') + ` Updated by ${user} on ${formatDisplayDateTime_(new Date())}.`;
}

function signatoryValue_(item, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    if (Object.prototype.hasOwnProperty.call(item, aliases[i]) && item[aliases[i]] !== null && item[aliases[i]] !== undefined && String(item[aliases[i]]).trim() !== '') {
      return item[aliases[i]];
    }
  }
  return '';
}

function signatoryNameValue_(item) {
  return signatoryValue_(item, [
    'Name',
    'name',
    'Signatory/Approver Name',
    'Signatory/approver name',
    'Signatory/approver Name',
    'signatoryApproverName',
    'signatoryName',
    'approverName',
    'approver',
    'signatory',
    'userName',
    'user',
    'displayName',
    'email',
    'Email',
    'userId',
    'User ID'
  ]);
}

function signatoryOrderValue_(item, fallback) {
  const raw = signatoryValue_(item, [
    'Order',
    'order',
    'Sequence',
    'sequence',
    'Seq',
    'seq',
    'Level',
    'level',
    'Index',
    'index',
    'signatoryIndex',
    'signatoryOrder',
    'routingSequence',
    'routingLevel'
  ]);
  const normalized = normalizeSignatoryOrder_(raw, 0);
  return normalized > 0 ? normalized : fallback;
}

function signatoryStatusValue_(item) {
  return signatoryValue_(item, ['Status', 'status', 'state', 'routingStatus', 'signatoryStatus', 'approvalStatus']);
}

function signatoryForwardedValue_(item) {
  return signatoryValue_(item, [
    'Date/time forwarded',
    'dateTimeForwarded',
    'dateForwarded',
    'forwardedAt',
    'forwarded',
    'Forwarded At',
    'Date Forwarded',
    'date/time forwarded'
  ]);
}

function signatorySignedValue_(item) {
  return signatoryValue_(item, [
    'Date/time signed',
    'dateTimeSigned',
    'dateSigned',
    'signedAt',
    'signed',
    'Signed At',
    'Date Signed',
    'date/time signed'
  ]);
}

function normalizeSignatories_(incoming, existing, now, isNew, shouldActivateRouting, allowedNames) {
  let rows = parseSignatories_(incoming);
  if (!rows.length) rows = parseSignatories_(existing);
  const allowedMap = buildAllowedNameMap_(allowedNames);

  rows = rows
    .map((item, index) => {
      const forwarded = normalizeDateTimeValue_(signatoryForwardedValue_(item));
      const signed = normalizeDateTimeValue_(signatorySignedValue_(item));
      return {
        'Name': String(signatoryNameValue_(item)).trim(),
        'Order': signatoryOrderValue_(item, index + 1),
        'Status': normalizeSignatoryStatus_(signatoryStatusValue_(item) || 'Pending'),
        'Date/time forwarded': forwarded,
        'Date/time signed': signed,
        'Duration pending/signing time': signed ? durationBetween_(forwarded, signed) : String(item['Duration pending/signing time'] || item.duration || '').trim()
      };
    })
    .filter(item => item.Name)
    .map(item => {
      const allowedName = allowedMap[item.Name.toLowerCase()];
      if (!allowedName) throw new Error(`Signatory/Approver Name "${item.Name}" is not in the Sent/Routing To registry.`);
      item.Name = allowedName;
      return item;
    })
    .sort((a, b) => normalizeSignatoryOrder_(a.Order, 0) - normalizeSignatoryOrder_(b.Order, 0))
    .map((item, index) => {
      item.Order = index + 1;
      item.Status = normalizeSignatoryStatus_(item.Status);
      return item;
    });

  if (shouldActivateRouting && rows.length && (isNew || rows.every(item => item.Status === 'Pending' && !item['Date/time forwarded']))) {
    rows[0].Status = 'Active';
    rows[0]['Date/time forwarded'] = formatDateTime_(now);
  }

  const firstOpen = rows.find(item => item.Status !== 'Signed');
  if (shouldActivateRouting && firstOpen) {
    rows.forEach(item => {
      if (item.Status === 'Active' && item.Order !== firstOpen.Order) item.Status = 'Pending';
    });
    firstOpen.Status = 'Active';
    if (!firstOpen['Date/time forwarded'] && (isNew || rows.some(item => item.Status === 'Signed'))) {
      firstOpen['Date/time forwarded'] = formatDateTime_(now);
    }
  }

  return rows;
}

function parseSignatories_(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function serializeSignatories_(rows) {
  return JSON.stringify(rows || []);
}

function durationBetween_(start, end) {
  const minutes = durationMinutes_(start, end);
  return minutes >= 0 ? humanDuration_(minutes) : '';
}

function durationMinutes_(start, end) {
  const startDate = parseDateTime_(start);
  const endDate = parseDateTime_(end);
  if (!startDate || !endDate) return -1;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

function humanDuration_(minutes) {
  minutes = Math.max(0, Number(minutes) || 0);
  const days = Math.floor(minutes / 1440);
  minutes -= days * 1440;
  const hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  const parts = [];
  if (days) parts.push(days + (days === 1 ? ' day' : ' days'));
  if (hours) parts.push(hours + (hours === 1 ? ' hr' : ' hrs'));
  if (minutes || !parts.length) parts.push(minutes + (minutes === 1 ? ' min' : ' mins'));
  return parts.slice(0, 2).join(' ');
}

function formatDateTime_(date) {
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function formatDisplayDateTime_(date) {
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'dd MMM yyyy hh:mm a');
}

function normalizeDateTimeValue_(value) {
  const date = parseDateTime_(value);
  return date ? formatDateTime_(date) : '';
}

function parseDateTime_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) return value;

  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] || 0)
    );
  }

  match = text.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?$/i);
  if (match) {
    const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const month = months[match[2].slice(0, 3).charAt(0).toUpperCase() + match[2].slice(1, 3).toLowerCase()];
    let hour = Number(match[4] || 0);
    const minute = Number(match[5] || 0);
    const ampm = String(match[6] || '').toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    if (month > -1) return new Date(Number(match[3]), month, Number(match[1]), hour, minute, 0);
  }

  const date = new Date(text);
  return isNaN(date) ? null : date;
}

function getTotalRoutingDuration_(signatories) {
  if (!signatories || !signatories.length) return '';
  if (signatories.some(item => item.Status !== 'Signed')) return '';
  const firstForwarded = signatories
    .map(item => parseDateTime_(item['Date/time forwarded']))
    .filter(Boolean)
    .sort((a, b) => a - b)[0];
  const lastSigned = signatories
    .map(item => parseDateTime_(item['Date/time signed']))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  if (!firstForwarded || !lastSigned) return '';
  return durationBetween_(firstForwarded, lastSigned);
}

function getRoutingCompletedAt_(signatories) {
  if (!signatories || !signatories.length) return '';
  if (signatories.some(item => item.Status !== 'Signed')) return '';
  const lastSigned = signatories
    .map(item => parseDateTime_(item['Date/time signed']))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  return lastSigned ? formatDateTime_(lastSigned) : '';
}

function getActiveSignatoryName_(signatories) {
  const active = (signatories || []).find(item => item.Status === 'Active');
  return active ? active.Name || '' : '';
}

function getCurrentSignatory_(signatories, requestedOrder) {
  const rows = (signatories || [])
    .slice()
    .sort((a, b) => normalizeSignatoryOrder_(a.Order, 0) - normalizeSignatoryOrder_(b.Order, 0));
  const active = rows.find(item => item.Status === 'Active');
  if (active) return active;

  const requested = normalizeSignatoryOrder_(requestedOrder, 0);
  if (requested) {
    const requestedPending = rows.find(item =>
      normalizeSignatoryOrder_(item.Order, 0) === requested &&
      item.Status !== 'Signed'
    );
    if (requestedPending) return requestedPending;
  }

  return rows.find(item => item.Status !== 'Signed') || null;
}

function getRoutingCompleteStatus_() {
  const statuses = readRegistry_(REGISTRY_TYPES.Status);
  const completed = statuses.find(status => String(status || '').trim().toLowerCase() === 'completed');
  const fullySigned = statuses.find(status => String(status || '').trim().toLowerCase() === 'fully signed');
  return completed || fullySigned || 'For Scanning';
}

function formatSignatoryStatusChangeAudit_(signatory, fromStatus, toStatus, fromForwarded, toForwarded) {
  const order = normalizeSignatoryOrder_(signatory && signatory.Order, 0);
  const name = signatory && signatory.Name ? signatory.Name : 'Unnamed signatory';
  let details = `Signatory #${order} "${name}" status changed from "${fromStatus || 'Pending'}" to "${toStatus}".`;
  if (fromForwarded !== undefined && String(fromForwarded || '') !== String(toForwarded || '')) {
    details += ` Date/time forwarded changed from ${auditValue_(fromForwarded)} to ${auditValue_(toForwarded)}.`;
  }
  return details;
}

function logRoutingDebug_(message, details) {
  const text = `[VRMS routing] ${message}: ${JSON.stringify(details || {})}`;
  if (typeof console !== 'undefined' && console.log) console.log(text);
  Logger.log(text);
}

function logAudit_(action, tracker, tracer, details) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('AuditTrail');
  sheet.appendRow([new Date(), getUserEmail_(), action, tracker, tracer, details]);
}

function getUserEmail_() {
  return Session.getActiveUser().getEmail() || 'Unknown user';
}

function formatValue_(value, header) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    if (['Timestamp', 'Created At', 'Updated At', 'Routing Completed At'].indexOf(header) !== -1) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    }
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return value;
}
