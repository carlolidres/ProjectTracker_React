const APP_TZ = 'Asia/Manila';
const DB_PROPERTY_KEY = 'CNF_TRACKER_SPREADSHEET_ID';
const DB_SETUP_VERSION_KEY = 'CNF_TRACKER_SETUP_VERSION';
const DB_SETUP_VERSION = '2026-05-23-performance-1';
const ARCHIVE_LIMIT = 900;
const AUTO_ARCHIVE_HANDLER = 'runAnnualAutoArchive';

const SHEETS = {
  CNF: 'CNF_DATABASE',
  ENDORSEMENT: 'ENDORSEMENT_TRACKER',
  AUDIT: 'AUDIT_TRAIL',
  REGISTRY: 'REGISTRY',
  ARCHIVED: 'ARCHIVED'
};

const PRIMARY_KEY = 'Date and Time Entry / Primary Key';
const NOT_APPLICABLE_STATUS = 'Not Applicable';

const CNF_HEADERS = [
  PRIMARY_KEY,
  'CNF No.',
  'CNF Initiator',
  'QRMR No.',
  'Product Name / Project',
  'Product Code',
  'Client',
  'Description of Change',
  'Department',
  'Study',
  'No. of Batch per Study',
  'Batch No.',
  'Batch',
  'Target Implementation Date',
  'Target Billing / Delivery Date',
  'MO/BMR Ref. No.',
  'MO/BMR Status',
  'PO/BPR Ref. No.',
  'PO/BPR Status',
  'Protocol No.',
  'Protocol Status',
  'Interim No.',
  'Interim Status',
  'Report No.',
  'Report Status',
  'Endorsement No.',
  'Endorsement Status',
  'CNF Status',
  'Closed Date',
  'Priority Level',
  'Open Branch Remarks',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At',
  'Is Archived',
  'Is Active',
  'Billing Status',
  'Billing Department Notified',
  'CNF Categorization',
  'Product/Project Entry Status',
  'Product/Project Remarks'
];

const ENDORSEMENT_HEADERS = [
  'Endorsement ID',
  'CNF No.',
  'Endorsement No.',
  'Item No.',
  'Endorsement Item',
  'Target Implementation Date',
  'Implemented By',
  'Implementation Status',
  'Target Verification Date',
  'Verified By Validation',
  'Validation Verification Date',
  'Verified By GMP',
  'GMP Verification Date',
  'Closure Status',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At',
  'Is Archived',
  'Is Active',
  'Product',
  'Product Code',
  'Endorsement Status',
  'CNF Categorization'
];

const AUDIT_HEADERS = [
  'Audit ID',
  'Timestamp',
  'User',
  'Module',
  'Action',
  'Record ID',
  'CNF No.',
  'Field Name',
  'Old Value',
  'New Value',
  'Remarks',
  'Endorsement No.'
];

const REGISTRY_HEADERS = [
  'Registry Type',
  'Registry Value',
  'Description',
  'Status',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At'
];

const ARCHIVED_HEADERS = CNF_HEADERS.concat([
  'Archived By',
  'Archived At',
  'Archive Remarks'
]);

const CNF_IMPORT_REQUIRED_HEADERS = [
  'CNF No.',
  'CNF Initiator',
  'Product Name / Project',
  'Product Code',
  'Client',
  'Description of Change',
  'Department',
  'Study',
  'No. of Batch per Study',
  'Batch No.',
  'Batch'
];

const ARCHIVED_IMPORT_REQUIRED_HEADERS = CNF_IMPORT_REQUIRED_HEADERS.slice();

const DOCUMENT_STATUS_OPTIONS = ['In-process', 'Routing', 'Client Approval', 'Signed', 'Cancelled', 'Not Applicable', 'NA'];
const FINAL_DOCUMENT_STATUSES = ['Signed', 'Cancelled', 'Not Applicable', 'NA'];
const ENDORSEMENT_CLOSURE_FINAL_STATUSES = ['Signed', 'Cancelled', 'Not Applicable'];
const OPEN_DOCUMENT_STATUSES = ['In-process', 'Routing', 'Client Approval'];

const DOCUMENT_FIELDS = [
  { type: 'MO/BMR', ref: 'MO/BMR Ref. No.', status: 'MO/BMR Status', target: 'Target Implementation Date' },
  { type: 'PO/BPR', ref: 'PO/BPR Ref. No.', status: 'PO/BPR Status', target: 'Target Implementation Date' },
  { type: 'Protocol', ref: 'Protocol No.', status: 'Protocol Status', target: 'Target Implementation Date' },
  { type: 'Interim', ref: 'Interim No.', status: 'Interim Status', target: 'Target Billing / Delivery Date' },
  { type: 'Report', ref: 'Report No.', status: 'Report Status', target: 'Target Billing / Delivery Date' },
  { type: 'Endorsement', ref: 'Endorsement No.', status: 'Endorsement Status', target: 'Target Implementation Date' }
];

const NA_DEFAULT_FIELDS = [
  'MO/BMR Ref. No.',
  'MO/BMR Status',
  'PO/BPR Ref. No.',
  'PO/BPR Status',
  'Protocol No.',
  'Protocol Status',
  'Interim No.',
  'Interim Status',
  'Report No.',
  'Report Status',
  'Endorsement No.',
  'Endorsement Status',
  'Billing Status',
  'Billing Department Notified',
  'Closed Date'
];

const SEPARATE_REGISTRY_SHEETS = {
  CNF: 'CNF_Registry',
  Product: 'Product_Registry',
  Client: 'Client_Registry',
  Department: 'Department_Registry',
  Study: 'Study_Registry',
  Batch: 'Batch_Registry',
  'Document Status': 'Document_Tracking_Registry',
  'MO/BMR': 'MO_BMR_Registry',
  'PO/BPR': 'PO_BPR_Registry',
  Protocol: 'Protocol_Registry',
  Interim: 'Interim_Registry',
  Report: 'Report_Registry',
  'Endorsement Status': 'Endorsement_Registry',
  Billing: 'Billing_Registry',
  Notification: 'Notification_Registry',
  'Critical Notification': 'Critical_Notification_Registry',
  Archived: 'Archived_Registry',
  User: 'User_Registry',
  'Role Access': 'Role_Access_Registry',
  'System Settings': 'System_Settings',
  'CNF Status': 'CNF_Registry',
  'Priority Level': 'Critical_Notification_Registry'
};

const DEFAULT_REGISTRY_VALUES = {
  Department: ['Validation', 'QA', 'QC', 'Production', 'Regulatory', 'Warehouse', 'Engineering'],
  Study: ['Process Validation', 'Cleaning Validation', 'Method Validation', 'Stability', 'Technology Transfer', 'Qualification', 'Other'],
  Client: ['Internal', 'External', 'NA'],
  'Document Status': DOCUMENT_STATUS_OPTIONS,
  'CNF Status': ['Open', 'Closed'],
  'Priority Level': ['Overdue', 'Due today', 'Due within 15 days', 'Due within 30 days', 'Due within 1 month', 'Due within 3 months', 'Low'],
  'Endorsement Status': DOCUMENT_STATUS_OPTIONS,
  Billing: ['Billable', 'Not Billable']
};

/** ─── Execution-scoped cache to avoid redundant API calls ─── */
var _cache = {
  initialized: false,
  spreadsheet: null,
  headers: {},
  headerMaps: {},
  sheetRecords: {}
};

/** Clear all cached data — call after any write operation. */
function _clearCache_() {
  _cache.initialized = false;
  _cache.spreadsheet = null;
  _cache.headers = {};
  _cache.headerMaps = {};
  _cache.sheetRecords = {};
  try {
    CacheService.getScriptCache().removeAll([
      'registry-types:Client|Department|Study',
      'dashboard-summary'
    ]);
  } catch (error) {
    // Cache invalidation is best-effort.
  }
}

/** ─── Audit trail queue — batch-writes instead of per-field appendRow ─── */
var _auditQueue = [];

/** Write all queued audit entries in a single setValues() call. */
function _flushAuditQueue_() {
  if (!_auditQueue.length) return;
  var sheet = getSheet_(SHEETS.AUDIT);
  var rows = _auditQueue.map(function (entry) {
    return AUDIT_HEADERS.map(function (header) { return entry[header] || 'NA'; });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, AUDIT_HEADERS.length).setValues(rows);
  _auditQueue = [];
}

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('CNF Tracker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Include an HTML file (for templating in HtmlService). */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Ensure all required sheets exist and DB is ready. Skips re-init if already called this execution. */
function initializeDatabase() {
  if (_cache.initialized) {
    return { success: true, timezone: APP_TZ, cached: true };
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = getSpreadsheet_();
    ensureSheet_(ss, SHEETS.CNF, CNF_HEADERS);
    ensureSheet_(ss, SHEETS.ENDORSEMENT, ENDORSEMENT_HEADERS);
    ensureSheet_(ss, SHEETS.AUDIT, AUDIT_HEADERS);
    ensureSheet_(ss, SHEETS.REGISTRY, REGISTRY_HEADERS);
    ensureSheet_(ss, SHEETS.ARCHIVED, ARCHIVED_HEADERS);
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty(DB_SETUP_VERSION_KEY) !== DB_SETUP_VERSION) {
      ensureSeparateRegistrySheets_(ss);
      migrateLegacyRegistry_();
      seedRegistry_();
      backfillEndorsementTrace_();
      setupAnnualArchiveTrigger();
      props.setProperty(DB_SETUP_VERSION_KEY, DB_SETUP_VERSION);
    }
    _cache.initialized = true;
    return {
      success: true,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      timezone: APP_TZ
    };
  } finally {
    lock.releaseLock();
  }
}

/** Fetch all rows from a sheet, sorted and filtered by sheet type (active-only for CNF/ENDORSEMENT, newest-first for AUDIT). */
function getSheetData(sheetName) {
  initializeDatabase();
  if (sheetName === SHEETS.REGISTRY) {
    return getCombinedRegistrySheetData_();
  }
  const result = getSheetRecords_(sheetName);
  let rows = result.rows.map(function (row) { return row.data; });

  if (sheetName === SHEETS.CNF || sheetName === SHEETS.ENDORSEMENT) {
    rows = rows.filter(function (row) { return isActiveRow_(row); });
  }

  if (sheetName === SHEETS.AUDIT) {
    rows.sort(function (a, b) {
      return parseAuditTime_(b.Timestamp) - parseAuditTime_(a.Timestamp);
    });
  }

  if (sheetName === SHEETS.ARCHIVED) {
    rows.sort(function (a, b) {
      return parsePrimaryKeyTime_(b[PRIMARY_KEY]) - parsePrimaryKeyTime_(a[PRIMARY_KEY]);
    });
  }

  return {
    headers: result.headers,
    rows: rows
  };
}

function getPagedSheetData(sheetName, options) {
  const opts = options || {};
  const limit = Math.max(1, Math.min(Number(opts.limit || 100), 500));
  const offset = Math.max(0, Number(opts.offset || 0));
  const filters = opts.filters || {};
  if (sheetName === SHEETS.AUDIT && !hasActiveFilters_(filters)) {
    const recent = getRecentSheetRows_(sheetName, limit, offset)
      .map(normalizeAuditRowForUi_)
      .filter(function (row) {
        return valueOrNA_(row['Audit ID']) !== 'NA' || valueOrNA_(row.Timestamp) !== 'NA';
      });
    recent.sort(function (a, b) { return parseAuditTime_(b.Timestamp) - parseAuditTime_(a.Timestamp); });
    const total = Math.max(0, getSheet_(sheetName).getLastRow() - 1);
    return {
      headers: AUDIT_HEADERS,
      rows: recent,
      total: total,
      offset: offset,
      limit: limit,
      hasMore: offset + recent.length < total
    };
  }
  const result = getSheetRecords_(sheetName);
  let rows = result.rows.map(function (row) { return row.data; });

  if (sheetName === SHEETS.CNF || sheetName === SHEETS.ENDORSEMENT) {
    rows = rows.filter(function (row) { return isActiveRow_(row); });
  }

  if (sheetName === SHEETS.CNF) {
    rows = rows.filter(function (row) { return cnfRowMatchesFilters_(row, filters); });
    rows.sort(function (a, b) { return parsePrimaryKeyTime_(b[PRIMARY_KEY]) - parsePrimaryKeyTime_(a[PRIMARY_KEY]); });
  } else if (sheetName === SHEETS.ENDORSEMENT) {
    rows = rows.filter(function (row) { return endorsementRowMatchesFilters_(row, filters); });
    rows.sort(function (a, b) { return parsePrimaryKeyTime_(b['Updated At'] || b['Created At']) - parsePrimaryKeyTime_(a['Updated At'] || a['Created At']); });
  } else if (sheetName === SHEETS.AUDIT) {
    rows = rows.map(normalizeAuditRowForUi_).filter(function (row) { return auditRowMatchesFilters_(row, filters); });
    rows.sort(function (a, b) { return parseAuditTime_(b.Timestamp) - parseAuditTime_(a.Timestamp); });
  } else if (sheetName === SHEETS.ARCHIVED) {
    rows = rows.filter(function (row) { return archivedRowMatchesFilters_(row, filters); });
    rows.sort(function (a, b) { return parsePrimaryKeyTime_(b[PRIMARY_KEY]) - parsePrimaryKeyTime_(a[PRIMARY_KEY]); });
  }

  return {
    headers: result.headers,
    rows: rows.slice(offset, offset + limit),
    total: rows.length,
    offset: offset,
    limit: limit,
    hasMore: offset + limit < rows.length
  };
}

function getRecentSheetRows_(sheetName, limit, offset) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  const total = Math.max(0, lastRow - 1);
  if (!total) return [];
  const endRow = Math.max(2, lastRow - offset);
  const startRow = Math.max(2, endRow - limit + 1);
  const count = Math.max(0, endRow - startRow + 1);
  if (!count) return [];
  const values = sheet.getRange(startRow, 1, count, headers.length).getDisplayValues();
  return values.map(function (row) {
    const data = {};
    headers.forEach(function (header, colIndex) {
      data[header] = valueOrNA_(row[colIndex]);
    });
    return data;
  });
}

function hasActiveFilters_(filters) {
  return Object.keys(filters || {}).some(function (key) {
    return valueOrNA_(filters[key]) !== 'NA';
  });
}

function getRegistryValuesForTypes(types) {
  const requested = Array.isArray(types) && types.length ? types : ['Client', 'Department', 'Study'];
  const cache = CacheService.getScriptCache();
  const cacheKey = 'registry-types:' + requested.slice().sort().join('|');
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const grouped = {};
  requested.forEach(function (type) {
    grouped[type] = getRegistryRowsForType_(type).filter(function (row) {
      return valueOrNA_(row.Status) !== 'Inactive' && row['Registry Type'] === type;
    }).map(function (row) {
      return {
        'Registry Type': type,
        'Registry Value': row['Registry Value'],
        Status: 'Active'
      };
    }).sort(function (a, b) { return a['Registry Value'].localeCompare(b['Registry Value']); });
  });
  cache.put(cacheKey, JSON.stringify(grouped), 1800);
  return grouped;
}

function cnfRowMatchesFilters_(row, filters) {
  const search = lower_(filters.search);
  if (search && !rowMatchesFields_(row, search, [
    'CNF No.', 'CNF Initiator', 'Initiator', 'Product Name / Project', 'Product Code',
    'Client', 'Description of Change', 'Department', 'Study', 'Batch No.', 'MO/BMR Ref. No.',
    'PO/BPR Ref. No.', 'Protocol No.', 'Interim No.', 'Report No.', 'Endorsement No.',
    'CNF Status', 'Priority Level'
  ])) return false;
  if (valueOrNA_(filters.initiator) !== 'NA' && getInitiatorValue_(row) !== valueOrNA_(filters.initiator)) return false;
  if (!monthYearMatches_(row['Target Billing / Delivery Date'], filters.billingMonth, filters.billingYear)) return false;
  if (!monthYearMatches_(row['Target Implementation Date'], filters.implementationMonth, filters.implementationYear)) return false;
  return missingDataMatches_(row, filters.missingFilter);
}

function endorsementRowMatchesFilters_(row, filters) {
  const search = lower_(filters.search);
  if (search && !rowMatchesFields_(row, search, [
    'CNF No.', 'Product', 'Product Name / Project', 'Product Code', 'CNF Categorization',
    'Endorsement No.', 'Endorsement Status', 'Target Implementation Date', 'Implemented By',
    'Implementation Status', 'Target Verification Date', 'Verified By Validation',
    'Validation Verification Date', 'Verified By GMP', 'GMP Verification Date',
    'Endorsement Item', 'Remarks / Details', 'Priority Level', 'Critical Reason'
  ])) return false;
  if (!monthYearMatches_(row['Target Implementation Date'], filters.implementationMonth, filters.implementationYear)) return false;
  if (valueOrNA_(filters.implementedBy) !== 'NA' && valueOrNA_(row['Implemented By']) !== valueOrNA_(filters.implementedBy)) return false;
  if (valueOrNA_(filters.implementationStatus) !== 'NA' && valueOrNA_(row['Implementation Status']) !== valueOrNA_(filters.implementationStatus)) return false;
  return true;
}

function auditRowMatchesFilters_(row, filters) {
  const search = lower_(filters.search);
  if (search && !rowMatchesFields_(row, search, AUDIT_HEADERS)) return false;
  if (lower_(filters.user) && lower_(row.User).indexOf(lower_(filters.user)) === -1) return false;
  if (valueOrNA_(filters.module) !== 'NA' && valueOrNA_(row.Module) !== valueOrNA_(filters.module)) return false;
  if (valueOrNA_(filters.action) !== 'NA' && valueOrNA_(row.Action) !== valueOrNA_(filters.action)) return false;
  if (lower_(filters.cnfNo) &&
      lower_(row['CNF No.']).indexOf(lower_(filters.cnfNo)) === -1 &&
      lower_(row['Record ID']).indexOf(lower_(filters.cnfNo)) === -1) return false;
  if (lower_(filters.fieldName) && lower_(row['Field Name']).indexOf(lower_(filters.fieldName)) === -1) return false;
  return dateWithinRange_(row.Timestamp, filters.startDate, filters.endDate);
}

function archivedRowMatchesFilters_(row, filters) {
  const search = lower_(filters.search);
  if (search && !rowMatchesFields_(row, search, ARCHIVED_HEADERS)) return false;
  const year = valueOrNA_(filters.year);
  return year === 'NA' || String(row[PRIMARY_KEY] || '').indexOf(year) !== -1;
}

function normalizeAuditRowForUi_(row) {
  const normalized = Object.assign({}, row);
  normalized.Timestamp = valueOrNA_(normalized.Timestamp || normalized['Date and Time'] || normalized.Date);
  normalized.User = valueOrNA_(normalized.User);
  normalized.Module = valueOrNA_(normalized.Module || normalized['Module / Menu']);
  normalized.Action = valueOrNA_(normalized.Action);
  normalized['Record ID'] = valueOrNA_(normalized['Record ID'] || normalized['Record ID / CNF No.']);
  normalized['CNF No.'] = valueOrNA_(normalized['CNF No.']);
  normalized['Field Name'] = valueOrNA_(normalized['Field Name']);
  normalized['Old Value'] = valueOrNA_(normalized['Old Value']);
  normalized['New Value'] = valueOrNA_(normalized['New Value']);
  normalized.Remarks = valueOrNA_(normalized.Remarks || normalized['Remarks / Details']);
  normalized['Endorsement No.'] = valueOrNA_(normalized['Endorsement No.']);
  return normalized;
}

function rowMatchesFields_(row, search, fields) {
  return (fields || []).some(function (field) {
    return lower_(row[field]).indexOf(search) !== -1;
  });
}

function monthYearMatches_(value, month, year) {
  if (valueOrNA_(month) === 'NA' || valueOrNA_(year) === 'NA') return true;
  const date = parseDateOnly_(value);
  if (!date) return false;
  return String(date.getMonth() + 1) === String(Number(month)) && String(date.getFullYear()) === String(year);
}

function missingDataMatches_(row, mode) {
  const selected = valueOrNA_(mode);
  if (selected === 'NA') return true;
  const missingBatch = isMissingTrackingValue_(row['Batch No.']);
  const missingImplementation = isMissingTrackingValue_(row['Target Implementation Date']);
  const missingBilling = isMissingTrackingValue_(row['Target Billing / Delivery Date']);
  const missingInitiator = isMissingTrackingValue_(getInitiatorValue_(row));
  if (selected === 'batch') return missingBatch;
  if (selected === 'implementation') return missingImplementation;
  if (selected === 'billing') return missingBilling;
  if (selected === 'batchImplementationBilling') return missingBatch || missingImplementation || missingBilling;
  if (selected === 'initiator') return missingInitiator;
  if (selected === 'critical') return missingBatch || missingImplementation || missingBilling || missingInitiator;
  return true;
}

function isMissingTrackingValue_(value) {
  const text = String(value === undefined || value === null ? '' : value).trim().toLowerCase();
  return text === '' || text === 'na' || text === 'n/a' || text === 'null' || text === 'undefined' || text === 'not defined' || text === 'not yet defined';
}

function getInitiatorValue_(row) {
  return valueOrNA_(row['CNF Initiator']) !== 'NA' ? valueOrNA_(row['CNF Initiator']) : valueOrNA_(row.Initiator);
}

function dateWithinRange_(value, start, end) {
  if (valueOrNA_(start) === 'NA' && valueOrNA_(end) === 'NA') return true;
  const date = parseDateOnly_(String(value || '').slice(0, 10));
  if (!date) {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return false;
    return dateWithinRange_(Utilities.formatDate(parsed, APP_TZ, 'yyyy-MM-dd'), start, end);
  }
  const startDate = valueOrNA_(start) !== 'NA' ? parseDateOnly_(start) : null;
  const endDate = valueOrNA_(end) !== 'NA' ? parseDateOnly_(end) : null;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

/** Create a new CNF record with batch-aware product splitting. Generates primary keys and CNF numbers automatically. */
function saveCNFRecord(payload) {
  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = getUserEmail_();
    const now = nowStamp_();
    const normalizedPayload = payload || {};
    const products = normalizeCNFProductsPayload_(normalizedPayload);
    const warnings = collectCNFValidationWarnings_(normalizedPayload, products);
    const duplicate = findDuplicateCNFNo_(normalizedPayload.cnfNo, null);
    if (duplicate) {
      logAuditTrail({
        module: 'CNF Database',
        action: 'Failed duplicate CNF No. attempt',
        recordId: duplicate[PRIMARY_KEY],
        cnfNo: valueOrNA_(normalizedPayload.cnfNo),
        fieldName: 'CNF No.',
        oldValue: duplicate['CNF No.'],
        newValue: valueOrNA_(normalizedPayload.cnfNo),
        remarks: 'Save blocked because the attempted CNF No. already exists in active or archived records.'
      });
      return {
        success: false,
        duplicate: true,
        message: 'Duplicate CNF No. detected. This CNF No. already exists. Please verify the existing record or enter a unique CNF No.'
      };
    }

    const existingKeys = getExistingPrimaryKeys_();
    const sheet = getSheet_(SHEETS.CNF);
    const rowsToWrite = [];
    const createdRecords = [];

    products.forEach(function (product, productIndex) {
      const productPayload = createProductPayload_(normalizedPayload, product);
      const batchCount = getPayloadBatchCount_(productPayload, 1);
      const batches = normalizeBatchPayload_(productPayload, batchCount);

      batches.forEach(function (batch) {
        const batchPayload = Object.assign({}, productPayload, {
          interimNo: batch.interimNo,
          interimStatus: batch.interimStatus
        });
        const record = buildCNFRecordFromPayload_(batchPayload, null, {
          primaryKey: generatePrimaryKey_(existingKeys),
          batchNo: batch.batchNo,
          batch: batch.batch,
          user: user,
          now: now,
          isCreate: true
        });

        if (record['CNF Status'] === 'Closed') {
          const closureCheck = validateRecordStatusesForClosure_(record);
          if (!closureCheck.allowed) {
            logAuditTrail({
              module: 'CNF Database',
              action: 'CNF closure saved with open document status warning',
              recordId: record[PRIMARY_KEY],
              cnfNo: record['CNF No.'],
              fieldName: closureCheck.blockers[0].documentType + ' Status',
              oldValue: 'NA',
              newValue: closureCheck.blockers[0].currentStatus,
              remarks: closureCheck.blockers[0].requiredAction
            });
          }
          record['Closed Date'] = now;
        }

        const priority = calculatePriority(record);
        record['Priority Level'] = priority.level;
        record['Open Branch Remarks'] = priority.reason + ' ' + priority.requiredAction;
        rowsToWrite.push(CNF_HEADERS.map(function (header) { return valueOrNA_(record[header]); }));
        createdRecords.push({
          record: record,
          productIndex: productIndex + 1
        });
      });
    });

    if (createdRecords.some(function (entry) { return entry.record['CNF Status'] === 'Closed'; })) {
      const closureMessage = getCNFClosureBlockerMessage_(
        valueOrNA_(normalizedPayload.cnfNo),
        createdRecords.map(function (entry) { return entry.record; })
      );
      if (closureMessage) {
        logAuditTrail({
          module: 'CNF Database',
          action: 'CNF closure blocked',
          recordId: valueOrNA_(normalizedPayload.cnfNo),
          cnfNo: valueOrNA_(normalizedPayload.cnfNo),
          fieldName: 'CNF Status',
          oldValue: 'Open',
          newValue: 'Closed',
          remarks: closureMessage
        });
        throw new Error(closureMessage);
      }
    }

    if (rowsToWrite.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToWrite.length, CNF_HEADERS.length).setValues(rowsToWrite);
    }

    createdRecords.forEach(function (entry) {
      const record = entry.record;
      logAuditTrail({
        module: 'CNF Database',
        action: 'CNF record created',
        recordId: record[PRIMARY_KEY],
        cnfNo: record['CNF No.'],
        fieldName: 'All Fields',
        oldValue: 'NA',
        newValue: 'Created',
        remarks: 'Created Product/Project ' + entry.productIndex + ' child record for Batch ' + record.Batch + '.'
      });
      logAuditTrail({
        module: 'CNF Database',
        action: 'CNF Categorization update',
        recordId: record[PRIMARY_KEY],
        cnfNo: record['CNF No.'],
        fieldName: 'CNF Categorization',
        oldValue: 'NA',
        newValue: record['CNF Categorization'],
        remarks: 'Captured CNF Categorization during record creation.'
      });
    });

    const routingProduct = products.find(function (product) {
      return valueOrNA_(product.endorsementNo) !== 'NA' && valueOrNA_(product.endorsementStatus) === 'Routing';
    });

    return {
      success: true,
      message: 'CNF record saved successfully.',
      warnings: warnings,
      createdCount: createdRecords.length,
      redirectToEndorsement: Boolean(routingProduct),
      endorsementNo: routingProduct ? valueOrNA_(routingProduct.endorsementNo) : 'NA',
      cnfNo: valueOrNA_(normalizedPayload.cnfNo)
    };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Update an existing CNF record (single product). Falls through to updateCNFProductRecords_() if payload contains a products array. */
function updateCNFRecord(primaryKey, payload) {
  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = getUserEmail_();
    const now = nowStamp_();
    const match = findRecordByValue_(SHEETS.CNF, PRIMARY_KEY, primaryKey);
    if (!match) {
      throw new Error('CNF record was not found for primary key ' + primaryKey + '.');
    }

    if (payload && Array.isArray(payload.products)) {
      return updateCNFProductRecords_(primaryKey, payload, match, user, now);
    }

    const warnings = collectCNFValidationWarnings_(payload || {}, normalizeCNFProductsPayload_(payload || {}));
    const oldRecord = match.data;
    const newRecord = buildCNFRecordFromPayload_(payload || {}, oldRecord, {
      primaryKey: primaryKey,
      batchNo: getFirstBatchValue_(payload, 'batchNo', oldRecord['Batch No.']),
      batch: getFirstBatchValue_(payload, 'batch', oldRecord.Batch),
      user: user,
      now: now,
      isCreate: false
    });

    if (newRecord['CNF Status'] === 'Closed' && oldRecord['CNF Status'] !== 'Closed') {
      const closureMessage = getCNFClosureBlockerMessage_(newRecord['CNF No.'], [newRecord]);
      if (closureMessage) {
        logAuditTrail({
          module: 'CNF Database',
          action: 'CNF closure blocked',
          recordId: primaryKey,
          cnfNo: newRecord['CNF No.'],
          fieldName: 'CNF Status',
          oldValue: oldRecord['CNF Status'],
          newValue: 'Closed',
          remarks: closureMessage
        });
        throw new Error(closureMessage);
      }

      logAuditTrail({
        module: 'CNF Database',
        action: 'CNF closure attempted',
        recordId: primaryKey,
        cnfNo: newRecord['CNF No.'],
        fieldName: 'CNF Status',
        oldValue: oldRecord['CNF Status'],
        newValue: 'Closed',
        remarks: 'User attempted to close CNF record.'
      });

      newRecord['Closed Date'] = now;
      const closureCheck = validateCNFClosure_(newRecord['CNF No.'], createOverrideMap_(primaryKey, newRecord));
      if (!closureCheck.allowed) {
        const first = closureCheck.blockers[0];
        logAuditTrail({
          module: 'CNF Database',
          action: 'CNF closure saved with open document status warning',
          recordId: primaryKey,
          cnfNo: newRecord['CNF No.'],
          fieldName: first.documentType + ' Status',
          oldValue: first.currentStatus,
          newValue: 'Closed',
          remarks: first.requiredAction
        });
      }
    }

    const priority = calculatePriority(newRecord);
    newRecord['Priority Level'] = priority.level;
    newRecord['Open Branch Remarks'] = priority.reason + ' ' + priority.requiredAction;

    writeRecordToRow_(SHEETS.CNF, match.rowIndex, CNF_HEADERS, newRecord);
    logChangedFields_(oldRecord, newRecord, {
      module: 'CNF Database',
      action: 'CNF record updated',
      recordId: primaryKey,
      cnfNo: newRecord['CNF No.']
    });

    if (newRecord['CNF Status'] === 'Closed' && oldRecord['CNF Status'] !== 'Closed') {
      closeAllCNFRows_(newRecord['CNF No.'], now, user);
      logAuditTrail({
        module: 'CNF Database',
        action: 'CNF closure completed',
        recordId: primaryKey,
        cnfNo: newRecord['CNF No.'],
        fieldName: 'CNF Status',
        oldValue: oldRecord['CNF Status'],
        newValue: 'Closed',
        remarks: 'CNF closure completed after all document branches were verified.'
      });
    }

    return {
      success: true,
      message: 'CNF record updated successfully.',
      warnings: warnings,
      record: newRecord,
      redirectToEndorsement: newRecord['Endorsement No.'] !== 'NA' && newRecord['Endorsement Status'] === 'Routing',
      endorsementNo: newRecord['Endorsement No.']
    };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Batch-update product child records for a CNF (replaces existing products atomically). Internal — called from updateCNFRecord(). */
function updateCNFProductRecords_(primaryKey, payload, anchorMatch, user, now) {
  const normalizedPayload = payload || {};
  const products = normalizeCNFProductsPayload_(normalizedPayload);
  const warnings = collectCNFValidationWarnings_(normalizedPayload, products);

  const oldCnfNo = valueOrNA_(anchorMatch.data['CNF No.']);
  const duplicate = findDuplicateCNFNo_(normalizedPayload.cnfNo || oldCnfNo, oldCnfNo);
  if (duplicate) {
    logAuditTrail({
      module: 'CNF Database',
      action: 'Failed duplicate CNF No. attempt',
      recordId: duplicate[PRIMARY_KEY],
      cnfNo: valueOrNA_(normalizedPayload.cnfNo || oldCnfNo),
      fieldName: 'CNF No.',
      oldValue: oldCnfNo,
      newValue: valueOrNA_(normalizedPayload.cnfNo || oldCnfNo),
      remarks: 'Update blocked because the attempted CNF No. already exists in active or archived records.'
    });
    return {
      success: false,
      duplicate: true,
      message: 'Duplicate CNF No. detected. This CNF No. already exists. Please verify the existing record or enter a unique CNF No.'
    };
  }
  const cnfRecords = getSheetRecords_(SHEETS.CNF);
  const relatedRows = cnfRecords.rows.filter(function (row) {
    return isActiveRow_(row.data) && valueOrNA_(row.data['CNF No.']) === oldCnfNo;
  });
  const relatedByKey = {};
  relatedRows.forEach(function (row) {
    relatedByKey[row.data[PRIMARY_KEY]] = row;
  });

  const existingKeys = getExistingPrimaryKeys_();
  const desiredEntries = [];
  const desiredKeySet = {};

  products.forEach(function (product, productIndex) {
    const productPayload = createProductPayload_(normalizedPayload, product);
    const batchCount = getPayloadBatchCount_(productPayload, 1);
    const batches = normalizeBatchPayload_(productPayload, batchCount);

    batches.forEach(function (batch) {
      const suppliedKey = valueOrNA_(batch.primaryKey);
      const existingRow = suppliedKey !== 'NA' && relatedByKey[suppliedKey] ? relatedByKey[suppliedKey] : null;
      const batchPayload = Object.assign({}, productPayload, {
        interimNo: batch.interimNo,
        interimStatus: batch.interimStatus
      });
      const record = buildCNFRecordFromPayload_(batchPayload, existingRow ? existingRow.data : null, {
        primaryKey: existingRow ? existingRow.data[PRIMARY_KEY] : generatePrimaryKey_(existingKeys),
        batchNo: batch.batchNo,
        batch: batch.batch,
        user: user,
        now: now,
        isCreate: !existingRow
      });

      const priority = calculatePriority(record);
      record['Priority Level'] = priority.level;
      record['Open Branch Remarks'] = priority.reason + ' ' + priority.requiredAction;

      desiredEntries.push({
        row: existingRow,
        record: record,
        productIndex: productIndex + 1
      });
      desiredKeySet[record[PRIMARY_KEY]] = true;
    });
  });

  if (valueOrNA_(normalizedPayload.cnfStatus || 'Open') === 'Closed') {
    const closureMessage = getCNFClosureBlockerMessage_(
      valueOrNA_(normalizedPayload.cnfNo || oldCnfNo),
      desiredEntries.map(function (entry) { return entry.record; })
    );
    if (closureMessage) {
      logAuditTrail({
        module: 'CNF Database',
        action: 'CNF closure blocked',
        recordId: primaryKey,
        cnfNo: valueOrNA_(normalizedPayload.cnfNo || oldCnfNo),
        fieldName: 'CNF Status',
        oldValue: anchorMatch.data['CNF Status'],
        newValue: 'Closed',
        remarks: closureMessage
      });
      throw new Error(closureMessage);
    }

    const closureCheck = validateCNFClosureRecords_(desiredEntries.map(function (entry) { return entry.record; }));
    if (!closureCheck.allowed) {
      const first = closureCheck.blockers[0];
      logAuditTrail({
        module: 'CNF Database',
        action: 'CNF closure saved with open document status warning',
        recordId: primaryKey,
        cnfNo: valueOrNA_(normalizedPayload.cnfNo),
        fieldName: first.documentType + ' Status',
        oldValue: first.currentStatus,
        newValue: 'Closed',
        remarks: first.requiredAction
      });
    }
    desiredEntries.forEach(function (entry) {
      entry.record['Closed Date'] = now;
    });
  }

  let updatedCount = 0;
  let addedCount = 0;
  desiredEntries.forEach(function (entry) {
    if (entry.row) {
      writeRecordToRow_(SHEETS.CNF, entry.row.rowIndex, CNF_HEADERS, entry.record);
      logChangedFields_(entry.row.data, entry.record, {
        module: 'CNF Database',
        action: 'CNF product child record updated',
        recordId: entry.record[PRIMARY_KEY],
        cnfNo: entry.record['CNF No.']
      });
      if (valueOrNA_(entry.row.data['Product/Project Entry Status']) !== valueOrNA_(entry.record['Product/Project Entry Status'])) {
        logAuditTrail({
          module: 'CNF Database',
          action: valueOrNA_(entry.record['Product/Project Entry Status']) === 'Inactive' ? 'Product/Project Inactivated' : 'Product/Project Reactivated',
          recordId: entry.record[PRIMARY_KEY],
          cnfNo: entry.record['CNF No.'],
          fieldName: 'Product/Project Entry Status',
          oldValue: entry.row.data['Product/Project Entry Status'],
          newValue: entry.record['Product/Project Entry Status'],
          remarks: 'Product/Project: ' + entry.record['Product Name / Project'] + '; Product Code: ' + entry.record['Product Code'] + '; Remarks: ' + valueOrNA_(entry.record['Product/Project Remarks'])
        });
      }
      if (valueOrNA_(entry.row.data['CNF Categorization']) !== valueOrNA_(entry.record['CNF Categorization'])) {
        logAuditTrail({
          module: 'CNF Database',
          action: 'CNF Categorization update',
          recordId: entry.record[PRIMARY_KEY],
          cnfNo: entry.record['CNF No.'],
          fieldName: 'CNF Categorization',
          oldValue: entry.row.data['CNF Categorization'],
          newValue: entry.record['CNF Categorization'],
          remarks: 'Updated CNF Categorization for this CNF record.'
        });
      }
      if (valueOrNA_(entry.row.data['Product/Project Remarks']) !== valueOrNA_(entry.record['Product/Project Remarks'])) {
        logAuditTrail({
          module: 'CNF Database',
          action: 'Product/Project Remarks update',
          recordId: entry.record[PRIMARY_KEY],
          cnfNo: entry.record['CNF No.'],
          fieldName: 'Product/Project Remarks',
          oldValue: entry.row.data['Product/Project Remarks'],
          newValue: entry.record['Product/Project Remarks'],
          remarks: 'Updated Product/Project remarks for ' + entry.record['Product Name / Project'] + '.'
        });
      }
      updatedCount += 1;
    } else {
      getSheet_(SHEETS.CNF).appendRow(CNF_HEADERS.map(function (header) { return valueOrNA_(entry.record[header]); }));
      logAuditTrail({
        module: 'CNF Database',
        action: 'CNF product child record added',
        recordId: entry.record[PRIMARY_KEY],
        cnfNo: entry.record['CNF No.'],
        fieldName: 'Product/Project ' + entry.productIndex,
        oldValue: 'NA',
        newValue: entry.record['Product Name / Project'],
        remarks: 'Added Product/Project ' + entry.productIndex + ' child record for Batch ' + entry.record.Batch + '.'
      });
      addedCount += 1;
    }
  });

  let removedCount = 0;
  relatedRows.forEach(function (row) {
    const key = row.data[PRIMARY_KEY];
    if (desiredKeySet[key]) return;
    const removedRecord = Object.assign({}, row.data, {
      'Is Active': 'No',
      'Updated By': user,
      'Updated At': now
    });
    writeRecordToRow_(SHEETS.CNF, row.rowIndex, CNF_HEADERS, removedRecord);
    logAuditTrail({
      module: 'CNF Database',
      action: 'CNF product child record removed',
      recordId: key,
      cnfNo: row.data['CNF No.'],
      fieldName: 'Product/Project',
      oldValue: row.data['Product Name / Project'],
      newValue: 'Removed',
      remarks: 'Removed product child record for Batch ' + row.data.Batch + ' before saving the CNF update.'
    });
    removedCount += 1;
  });

  const routingProduct = products.find(function (product) {
    return valueOrNA_(product.endorsementNo) !== 'NA' && valueOrNA_(product.endorsementStatus) === 'Routing';
  });

  return {
    success: true,
    message: 'CNF record updated successfully.',
    warnings: warnings,
    updatedCount: updatedCount,
    addedCount: addedCount,
    removedCount: removedCount,
    redirectToEndorsement: Boolean(routingProduct),
    endorsementNo: routingProduct ? valueOrNA_(routingProduct.endorsementNo) : 'NA',
    cnfNo: valueOrNA_(normalizedPayload.cnfNo)
  };
}

/** Check whether a CNF can be closed based on its document statuses. Logs the check result to audit trail. */
function validateCNFClosure(cnfNo) {
  initializeDatabase();
  const result = validateCNFClosure_(cnfNo, {});
  logAuditTrail({
    module: 'CNF Database',
    action: result.allowed ? 'CNF closure attempted' : 'CNF closure blocked due to open document status',
    recordId: cnfNo,
    cnfNo: cnfNo,
    fieldName: 'CNF Status',
    oldValue: 'Open',
    newValue: result.allowed ? 'Closure allowed' : 'Closure blocked',
    remarks: result.allowed
      ? 'CNF can be closed because all applicable document statuses are completed.'
      : result.blockers[0].requiredAction
  });
  return result;
}

/** Calculate priority level from the nearest applicable target date. */
function calculatePriority(record) {
  const row = record || {};
  if (!isActiveProductProject_(row)) {
    return {
      level: 'Low',
      targetDate: 'NA',
      daysRemaining: 9999,
      priorityRank: 999,
      reason: 'Product/Project entry is inactive.',
      requiredAction: 'No active workflow monitoring is required.'
    };
  }
  const today = getTodayManila_();
  const implementationDate = parseDateOnly_(row['Target Implementation Date']);
  const billingDate = parseDateOnly_(row['Target Billing / Delivery Date']);
  const dateOptions = [];

  if (implementationDate) {
    dateOptions.push({
      label: 'Target Implementation Date',
      date: implementationDate,
      display: valueOrNA_(row['Target Implementation Date'])
    });
  }

  if (billingDate) {
    dateOptions.push({
      label: 'Target Billing / Delivery Date',
      date: billingDate,
      display: valueOrNA_(row['Target Billing / Delivery Date'])
    });
  }

  if (!dateOptions.length) {
    return {
      level: 'Low',
      targetDate: 'NA',
      priorityRank: 999,
      reason: 'No target date is available.',
      requiredAction: 'Review the CNF schedule.'
    };
  }

  dateOptions.sort(function (a, b) {
    return Math.abs(a.date.getTime() - today.getTime()) - Math.abs(b.date.getTime() - today.getTime());
  });

  const nearest = dateOptions.reduce(function (selected, item) {
    const days = daysBetween_(today, item.date);
    if (!selected || days < selected.days) {
      return {
        label: item.label,
        date: item.date,
        display: item.display,
        days: days
      };
    }
    return selected;
  }, null);

  const priority = calculateTargetDatePriority_(nearest.date, nearest.label);

  return {
    level: priority.level,
    targetDate: nearest.display,
    daysRemaining: nearest.days,
    priorityRank: priority.rank,
    reason: priority.reason,
    requiredAction: priority.requiredAction
  };
}

function calculateTargetDatePriority_(targetDate, label) {
  const today = getTodayManila_();
  if (!targetDate) {
    return {
      level: 'Low',
      rank: 999,
      daysRemaining: 9999,
      reason: 'No target date is available.',
      requiredAction: 'Review the schedule.'
    };
  }
  const days = daysBetween_(today, targetDate);
  if (days < 0) return { level: 'Overdue', rank: 1, daysRemaining: days, reason: label + ' is overdue.', requiredAction: 'Complete or disposition the overdue item.' };
  if (days === 0) return { level: 'Due today', rank: 2, daysRemaining: days, reason: label + ' is due today.', requiredAction: 'Complete or update the item today.' };
  if (label === 'Endorsement item' && days === 1) return { level: 'Due within 15 days', rank: 3, daysRemaining: days, reason: label + ' is due tomorrow.', requiredAction: 'Monitor closely and update progress.' };
  if (label === 'Endorsement item' && days <= 3) return { level: 'Due within 15 days', rank: 3, daysRemaining: days, reason: label + ' is due within 3 days.', requiredAction: 'Monitor closely and update progress.' };
  if (days <= 15) return { level: 'Due within 15 days', rank: 3, daysRemaining: days, reason: label + ' is due within 15 days.', requiredAction: 'Monitor closely and update progress.' };
  if (days <= 30) return { level: 'Due within 30 days', rank: 4, daysRemaining: days, reason: label + ' is due within 30 days.', requiredAction: 'Confirm implementation readiness.' };
  if (days <= 31) return { level: 'Due within 1 month', rank: 5, daysRemaining: days, reason: label + ' is due within 1 month.', requiredAction: 'Confirm ownership and schedule.' };
  if (days <= 90) return { level: 'Due within 3 months', rank: 6, daysRemaining: days, reason: label + ' is due within 3 months.', requiredAction: 'Keep the item in the monitoring worklist.' };
  return {
    level: 'Low',
    rank: 999,
    daysRemaining: days,
    reason: label + ' is outside the priority window.',
    requiredAction: 'Continue routine monitoring.'
  };
}

/** Get dashboard summary: counts by status, priority items, and active records. */
function getDashboardData() {
  const records = getActiveCNFRecords_();
  const uniqueOpen = {};
  const uniqueClosed = {};
  let critical = 0;
  let high = 0;
  let dueWithin7 = 0;
  let overdue = 0;
  let pendingProtocol = 0;
  let pendingReport = 0;
  let pendingEndorsement = 0;
  const today = getTodayManila_();

  records.forEach(function (row) {
    const cnfNo = valueOrNA_(row['CNF No.']);
    const isOpen = row['CNF Status'] !== 'Closed';
    if (!isOpen) {
      uniqueClosed[cnfNo] = true;
    } else {
      uniqueOpen[cnfNo] = true;
    }

    const priority = calculatePriority(row);
    if (isOpen && priority.priorityRank <= 3) critical += 1;
    if (isOpen && priority.priorityRank > 3 && priority.priorityRank <= 6) high += 1;
    if (isOpen && typeof priority.daysRemaining === 'number') {
      if (priority.daysRemaining <= 7 && priority.daysRemaining >= 0) dueWithin7 += 1;
      if (priority.daysRemaining < 0) overdue += 1;
    }

    if (isOpen && !isFinalDocumentStatus_(row['Protocol Status'])) pendingProtocol += 1;
    if (isOpen && !isFinalDocumentStatus_(row['Report Status'])) pendingReport += 1;
    if (isOpen && !isFinalDocumentStatus_(row['Endorsement Status'])) pendingEndorsement += 1;
  });

  return {
    cards: {
      totalOpen: Object.keys(uniqueOpen).length,
      totalClosed: Object.keys(uniqueClosed).length,
      critical: critical,
      high: high,
      dueWithin7: dueWithin7,
      overdue: overdue,
      pendingProtocol: pendingProtocol,
      pendingReport: pendingReport,
      pendingEndorsement: pendingEndorsement
    },
    worklist: getPriorityWorklist(),
    generatedAt: nowStamp_(),
    today: Utilities.formatDate(today, APP_TZ, 'yyyy-MM-dd')
  };
}

function getPriorityWorklist() {
  const rows = getActiveCNFRecords_().filter(function (row) {
    return row['CNF Status'] !== 'Closed' && isActiveProductProject_(row);
  }).map(function (row) {
    const priority = calculatePriority(row);
    return {
      primaryKey: row[PRIMARY_KEY],
      source: 'cnf',
      priorityLevel: priority.level,
      priorityRank: priority.priorityRank,
      cnfNo: row['CNF No.'],
      product: row['Product Name / Project'],
      productCode: row['Product Code'],
      client: row.Client,
      cnfCategorization: valueOrNA_(row['CNF Categorization']),
      batchNo: row['Batch No.'],
      batch: row.Batch,
      targetDate: priority.targetDate,
      targetImplementationDate: row['Target Implementation Date'],
      targetBillingDeliveryDate: row['Target Billing / Delivery Date'],
      protocolNo: row['Protocol No.'],
      protocolStatus: row['Protocol Status'],
      moBmrRefNo: row['MO/BMR Ref. No.'],
      poBprRefNo: row['PO/BPR Ref. No.'],
      reportStatus: row['Report Status'],
      endorsementStatus: row['Endorsement Status'],
      cnfStatus: row['CNF Status'],
      reasonForPriority: priority.reason,
      requiredAction: priority.requiredAction,
      daysRemaining: priority.daysRemaining
    };
  }).filter(function (row) {
    return row.priorityLevel !== 'Low';
  });

  getEndorsementPriorityWorklist_().forEach(function (row) {
    rows.push(row);
  });

  rows.sort(function (a, b) {
    const rankDiff = Number(a.priorityRank || 999) - Number(b.priorityRank || 999);
    if (rankDiff !== 0) return rankDiff;
    return Number(a.daysRemaining || 9999) - Number(b.daysRemaining || 9999);
  });
  return rows;
}

function getEndorsementPriorityWorklist_() {
  const cnfRows = getActiveCNFRecords_();
  const rows = getSheetRecords_(SHEETS.ENDORSEMENT).rows.map(function (row) { return row.data; }).filter(function (row) {
    if (!isActiveRow_(row)) return false;
    const implementationStatus = valueOrNA_(row['Implementation Status']);
    const endorsementStatus = valueOrNA_(row['Endorsement Status']);
    if (implementationStatus === 'Done' || implementationStatus === 'Cancelled') return false;
    if (endorsementStatus === 'Not Applicable' || endorsementStatus === 'Cancelled' || endorsementStatus === 'NA') return false;
    return true;
  }).map(function (row) {
    const trace = findCNFTraceForEndorsementRow_(row, cnfRows);
    const targetDate = parseDateOnly_(row['Target Implementation Date']);
    const priority = calculateTargetDatePriority_(targetDate, 'Endorsement item');
    return {
      source: 'endorsement',
      endorsementId: row['Endorsement ID'],
      priorityLevel: priority.level,
      priorityRank: priority.rank,
      cnfNo: row['CNF No.'],
      product: row.Product,
      productCode: row['Product Code'],
      client: trace.client,
      cnfCategorization: trace.cnfCategorization,
      endorsementNo: row['Endorsement No.'],
      endorsementStatus: row['Endorsement Status'],
      targetDate: row['Target Implementation Date'],
      targetImplementationDate: row['Target Implementation Date'],
      daysRemaining: priority.daysRemaining,
      implementedBy: row['Implemented By'],
      implementationStatus: row['Implementation Status'],
      reasonForPriority: priority.reason,
      requiredAction: priority.requiredAction
    };
  }).filter(function (row) {
    return row.priorityRank < 999;
  });
  return rows;
}

function saveEndorsementItem(payload) {
  if (payload && Array.isArray(payload.items)) {
    return saveEndorsementItems(payload);
  }

  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = getUserEmail_();
    const now = nowStamp_();
    const data = payload || {};
    const endorsementNo = valueOrNA_(data.endorsementNo);
    if (endorsementNo === 'NA') {
      throw new Error('Endorsement No. is required.');
    }

    const existingKeys = getExistingEndorsementIds_();
    const trace = findEndorsementTrace_(endorsementNo, data.cnfNo, data.product, data.productCode, data.endorsementStatus);
    const cnfNo = trace.cnfNo;
    const itemNo = getNextEndorsementItemNo_(endorsementNo);
    const record = {
      'Endorsement ID': generateEndorsementId_(existingKeys),
      'CNF No.': cnfNo,
      Product: trace.product,
      'Product Code': trace.productCode,
      'CNF Categorization': trace.cnfCategorization,
      'Endorsement No.': endorsementNo,
      'Endorsement Status': trace.endorsementStatus,
      'Item No.': itemNo,
      'Endorsement Item': valueOrNA_(data.endorsementItem),
      'Target Implementation Date': valueOrNA_(data.targetImplementationDate),
      'Implemented By': valueOrNA_(data.implementedBy),
      'Implementation Status': valueOrNA_(data.implementationStatus || 'Planned'),
      'Target Verification Date': valueOrNA_(data.targetVerificationDate),
      'Verified By Validation': valueOrNA_(data.verifiedByValidation),
      'Validation Verification Date': valueOrNA_(data.validationVerificationDate),
      'Verified By GMP': valueOrNA_(data.verifiedByGmp),
      'GMP Verification Date': valueOrNA_(data.gmpVerificationDate),
      'Closure Status': 'Open',
      'Created By': user,
      'Created At': now,
      'Updated By': user,
      'Updated At': now,
      'Is Archived': 'No',
      'Is Active': 'Yes'
    };
    record['Closure Status'] = isEndorsementItemClosed_(record) ? 'Closed' : 'Open';

    getSheet_(SHEETS.ENDORSEMENT)
      .appendRow(ENDORSEMENT_HEADERS.map(function (header) { return record[header] || 'NA'; }));

    logAuditTrail({
      module: 'Endorsement Tracker',
      action: 'Endorsement item created',
      recordId: record['Endorsement ID'],
      cnfNo: cnfNo,
      endorsementNo: endorsementNo,
      fieldName: 'Endorsement Item',
      oldValue: 'NA',
      newValue: record['Endorsement Item'],
      remarks: 'Created endorsement item ' + itemNo + ' for endorsement ' + endorsementNo + '.'
    });

    syncEndorsementStatus_(endorsementNo);
    return {
      success: true,
      message: 'Endorsement item saved successfully.',
      record: record
    };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Batch-create multiple endorsement items in one sheet operation. */
function saveEndorsementItems(payload) {
  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = getUserEmail_();
    const now = nowStamp_();
    const data = payload || {};
    const endorsementNo = valueOrNA_(data.endorsementNo);
    if (endorsementNo === 'NA') {
      throw new Error('Endorsement No. is required.');
    }

    const existingKeys = getExistingEndorsementIds_();
    const trace = findEndorsementTrace_(endorsementNo, data.cnfNo, data.product, data.productCode, data.endorsementStatus);
    const cnfNo = trace.cnfNo;
    const items = normalizeEndorsementItemsPayload_(data);
    const sheet = getSheet_(SHEETS.ENDORSEMENT);
    const rowsToWrite = [];
    const createdRecords = [];
    let nextItemNo = getNextEndorsementItemNo_(endorsementNo);

    items.forEach(function (item, index) {
      const record = buildEndorsementRecordFromPayload_(item, null, {
        id: generateEndorsementId_(existingKeys),
        cnfNo: cnfNo,
        product: trace.product,
        productCode: trace.productCode,
        cnfCategorization: trace.cnfCategorization,
        endorsementNo: endorsementNo,
        endorsementStatus: trace.endorsementStatus,
        itemNo: nextItemNo + index,
        user: user,
        now: now,
        isCreate: true
      });
      rowsToWrite.push(ENDORSEMENT_HEADERS.map(function (header) { return valueOrNA_(record[header]); }));
      createdRecords.push(record);
    });

    if (rowsToWrite.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToWrite.length, ENDORSEMENT_HEADERS.length).setValues(rowsToWrite);
    }

    createdRecords.forEach(function (record) {
      logAuditTrail({
        module: 'Endorsement Tracker',
        action: 'Endorsement item created',
        recordId: record['Endorsement ID'],
        cnfNo: cnfNo,
        endorsementNo: endorsementNo,
        fieldName: 'Endorsement Item ' + record['Item No.'],
        oldValue: 'NA',
        newValue: record['Endorsement Item'],
        remarks: 'Created endorsement item ' + record['Item No.'] + ' under endorsement ' + endorsementNo + '.'
      });
    });

    syncEndorsementStatus_(endorsementNo);
    return {
      success: true,
      message: 'Endorsement entry saved successfully.',
      createdCount: createdRecords.length,
      records: createdRecords
    };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Batch-update or replace endorsement items for one endorsement number. */
function updateEndorsementItems(recordId, payload) {
  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = getUserEmail_();
    const now = nowStamp_();
    const anchor = findRecordByValue_(SHEETS.ENDORSEMENT, 'Endorsement ID', recordId);
    if (!anchor) {
      throw new Error('Endorsement item was not found.');
    }

    const data = payload || {};
    const oldEndorsementNo = valueOrNA_(anchor.data['Endorsement No.']);
    const endorsementNo = valueOrNA_(data.endorsementNo);
    if (endorsementNo === 'NA') {
      throw new Error('Endorsement No. is required.');
    }

    const trace = findEndorsementTrace_(endorsementNo, data.cnfNo, data.product, data.productCode, data.endorsementStatus);
    const cnfNo = trace.cnfNo;
    const relatedRows = getSheetRecords_(SHEETS.ENDORSEMENT).rows.filter(function (row) {
      return isActiveRow_(row.data) && valueOrNA_(row.data['Endorsement No.']) === oldEndorsementNo;
    });
    const relatedById = {};
    relatedRows.forEach(function (row) {
      relatedById[row.data['Endorsement ID']] = row;
    });

    const existingKeys = getExistingEndorsementIds_();
    const items = normalizeEndorsementItemsPayload_(data);
    const desiredIdSet = {};
    let updatedCount = 0;
    let addedCount = 0;

    items.forEach(function (item, index) {
      const suppliedId = valueOrNA_(item.recordId || item.endorsementId);
      const existingRow = suppliedId !== 'NA' && relatedById[suppliedId] ? relatedById[suppliedId] : null;
      const record = buildEndorsementRecordFromPayload_(item, existingRow ? existingRow.data : null, {
        id: existingRow ? existingRow.data['Endorsement ID'] : generateEndorsementId_(existingKeys),
        cnfNo: cnfNo,
        product: trace.product,
        productCode: trace.productCode,
        cnfCategorization: trace.cnfCategorization,
        endorsementNo: endorsementNo,
        endorsementStatus: trace.endorsementStatus,
        itemNo: index + 1,
        user: user,
        now: now,
        isCreate: !existingRow
      });
      desiredIdSet[record['Endorsement ID']] = true;

      if (existingRow) {
        writeRecordToRow_(SHEETS.ENDORSEMENT, existingRow.rowIndex, ENDORSEMENT_HEADERS, record);
        logChangedFields_(existingRow.data, record, {
          module: 'Endorsement Tracker',
          action: 'Endorsement item updated',
          recordId: record['Endorsement ID'],
          cnfNo: record['CNF No.'],
          endorsementNo: record['Endorsement No.']
        });
        updatedCount += 1;
      } else {
        getSheet_(SHEETS.ENDORSEMENT).appendRow(ENDORSEMENT_HEADERS.map(function (header) { return valueOrNA_(record[header]); }));
        logAuditTrail({
          module: 'Endorsement Tracker',
          action: 'Endorsement item added',
          recordId: record['Endorsement ID'],
          cnfNo: record['CNF No.'],
          endorsementNo: record['Endorsement No.'],
          fieldName: 'Endorsement Item ' + record['Item No.'],
          oldValue: 'NA',
          newValue: record['Endorsement Item'],
          remarks: 'Added endorsement item ' + record['Item No.'] + ' under endorsement ' + endorsementNo + '.'
        });
        addedCount += 1;
      }
    });

    let removedCount = 0;
    relatedRows.forEach(function (row) {
      if (desiredIdSet[row.data['Endorsement ID']]) return;
      const removedRecord = Object.assign({}, row.data, {
        'Is Active': 'No',
        'Updated By': user,
        'Updated At': now
      });
      writeRecordToRow_(SHEETS.ENDORSEMENT, row.rowIndex, ENDORSEMENT_HEADERS, removedRecord);
      logAuditTrail({
        module: 'Endorsement Tracker',
        action: 'Endorsement item removed',
        recordId: row.data['Endorsement ID'],
        cnfNo: row.data['CNF No.'],
        endorsementNo: row.data['Endorsement No.'],
        fieldName: 'Endorsement Item ' + row.data['Item No.'],
        oldValue: row.data['Endorsement Item'],
        newValue: 'Removed',
        remarks: 'Removed endorsement item ' + row.data['Item No.'] + ' before saving the endorsement entry.'
      });
      removedCount += 1;
    });

    syncEndorsementStatus_(endorsementNo);
    if (oldEndorsementNo !== endorsementNo) syncEndorsementStatus_(oldEndorsementNo);

    return {
      success: true,
      message: 'Endorsement entry updated successfully.',
      updatedCount: updatedCount,
      addedCount: addedCount,
      removedCount: removedCount
    };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Update a single endorsement item (field-level). */
function updateEndorsementItem(recordId, payload) {
  if (payload && Array.isArray(payload.items)) {
    return updateEndorsementItems(recordId, payload);
  }

  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = getUserEmail_();
    const now = nowStamp_();
    const match = findRecordByValue_(SHEETS.ENDORSEMENT, 'Endorsement ID', recordId);
    if (!match) {
      throw new Error('Endorsement item was not found.');
    }

    const data = payload || {};
    const oldRecord = match.data;
    const newRecord = Object.assign({}, oldRecord, {
      'CNF No.': pickValue_(data, 'cnfNo', oldRecord['CNF No.']),
      Product: pickValue_(data, 'product', oldRecord.Product),
      'Product Code': pickValue_(data, 'productCode', oldRecord['Product Code']),
      'Endorsement No.': pickValue_(data, 'endorsementNo', oldRecord['Endorsement No.']),
      'Endorsement Status': pickValue_(data, 'endorsementStatus', oldRecord['Endorsement Status']),
      'Endorsement Item': valueOrNA_(pickValue_(data, 'endorsementItem', oldRecord['Endorsement Item'])),
      'Target Implementation Date': valueOrNA_(pickValue_(data, 'targetImplementationDate', oldRecord['Target Implementation Date'])),
      'Implemented By': valueOrNA_(pickValue_(data, 'implementedBy', oldRecord['Implemented By'])),
      'Implementation Status': valueOrNA_(pickValue_(data, 'implementationStatus', oldRecord['Implementation Status'])),
      'Target Verification Date': valueOrNA_(pickValue_(data, 'targetVerificationDate', oldRecord['Target Verification Date'])),
      'Verified By Validation': valueOrNA_(pickValue_(data, 'verifiedByValidation', oldRecord['Verified By Validation'])),
      'Validation Verification Date': valueOrNA_(pickValue_(data, 'validationVerificationDate', oldRecord['Validation Verification Date'])),
      'Verified By GMP': valueOrNA_(pickValue_(data, 'verifiedByGmp', oldRecord['Verified By GMP'])),
      'GMP Verification Date': valueOrNA_(pickValue_(data, 'gmpVerificationDate', oldRecord['GMP Verification Date'])),
      'Updated By': user,
      'Updated At': now,
      'Is Archived': valueOrNA_(oldRecord['Is Archived']) === 'NA' ? 'No' : oldRecord['Is Archived'],
      'Is Active': valueOrNA_(oldRecord['Is Active']) === 'NA' ? 'Yes' : oldRecord['Is Active']
    });
    const trace = findEndorsementTrace_(
      newRecord['Endorsement No.'],
      newRecord['CNF No.'],
      newRecord.Product,
      newRecord['Product Code'],
      newRecord['Endorsement Status']
    );
    newRecord['CNF No.'] = trace.cnfNo;
    newRecord.Product = trace.product;
    newRecord['Product Code'] = trace.productCode;
    newRecord['CNF Categorization'] = trace.cnfCategorization;
    newRecord['Endorsement Status'] = trace.endorsementStatus;
    newRecord['Closure Status'] = isEndorsementItemClosed_(newRecord) ? 'Closed' : 'Open';

    writeRecordToRow_(SHEETS.ENDORSEMENT, match.rowIndex, ENDORSEMENT_HEADERS, newRecord);
    logChangedFields_(oldRecord, newRecord, {
      module: 'Endorsement Tracker',
      action: 'Endorsement item updated',
      recordId: recordId,
      cnfNo: newRecord['CNF No.'],
      endorsementNo: newRecord['Endorsement No.']
    });

    syncEndorsementStatus_(newRecord['Endorsement No.']);
    return {
      success: true,
      message: 'Endorsement item updated successfully.',
      record: newRecord
    };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Sync the aggregate endorsement-level status based on all child items. */
function syncEndorsementStatus(endorsementNo) {
  initializeDatabase();
  return syncEndorsementStatus_(endorsementNo);
}

function syncEndorsementStatus_(endorsementNo) {
  const normalizedEndorsementNo = valueOrNA_(endorsementNo);
  if (normalizedEndorsementNo === 'NA') {
    return { success: true, synced: false, message: 'No endorsement number was provided.' };
  }

  const tracker = getSheetRecords_(SHEETS.ENDORSEMENT);
  const items = tracker.rows.filter(function (row) {
    return isActiveRow_(row.data) && row.data['Endorsement No.'] === normalizedEndorsementNo;
  });

  if (!items.length) {
    return { success: true, synced: false, message: 'No endorsement items found.' };
  }

  const allClosed = items.every(function (row) {
    return isEndorsementItemClosed_(row.data);
  });

  items.forEach(function (row) {
    const expectedStatus = isEndorsementItemClosed_(row.data) ? 'Closed' : 'Open';
    if (row.data['Closure Status'] !== expectedStatus) {
      row.data['Closure Status'] = expectedStatus;
      writeRecordToRow_(SHEETS.ENDORSEMENT, row.rowIndex, ENDORSEMENT_HEADERS, row.data);
    }
  });

  if (!allClosed) {
    return { success: true, synced: false, message: 'Endorsement still has open items.' };
  }

  const user = getUserEmail_();
  const now = nowStamp_();
  const cnfRecords = getSheetRecords_(SHEETS.CNF);
  let updatedCount = 0;

  cnfRecords.rows.forEach(function (row) {
    const record = row.data;
    if (isActiveRow_(record) && record['Endorsement No.'] === normalizedEndorsementNo && record['Endorsement Status'] !== 'Signed') {
      const oldStatus = record['Endorsement Status'];
      record['Endorsement Status'] = 'Signed';
      record['Updated By'] = user;
      record['Updated At'] = now;
      const priority = calculatePriority(record);
      record['Priority Level'] = priority.level;
      record['Open Branch Remarks'] = priority.reason + ' ' + priority.requiredAction;
      writeRecordToRow_(SHEETS.CNF, row.rowIndex, CNF_HEADERS, record);
      updatedCount += 1;
      logAuditTrail({
        module: 'Endorsement Tracker',
        action: 'Endorsement status changed to Signed',
        recordId: record[PRIMARY_KEY],
        cnfNo: record['CNF No.'],
        fieldName: 'Endorsement Status',
        oldValue: oldStatus,
        newValue: 'Signed',
        remarks: 'Updated Endorsement Status to Signed after all endorsement items were closed.'
      });
    }
  });

  return {
    success: true,
    synced: true,
    updatedCount: updatedCount,
    message: 'Endorsement status synchronized.'
  };
}

/** Archive a single active CNF record (move to ARCHIVED sheet, delete from CNF_DATABASE). */
function archiveRecord(primaryKey) {
  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const match = findRecordByValue_(SHEETS.CNF, PRIMARY_KEY, primaryKey);
    if (!match) {
      throw new Error('Active CNF record was not found for archive.');
    }

    const user = getUserEmail_();
    const now = nowStamp_();
    const record = Object.assign({}, match.data, {
      'Is Archived': 'Yes',
      'Is Active': 'No',
      'Updated By': user,
      'Updated At': now
    });

    appendArchivedRows_([record], user, now, 'Archived by user request.');
    getSheet_(SHEETS.CNF).deleteRow(match.rowIndex);
    enforceArchiveCapacityLimit();

    logAuditTrail({
      module: 'CNF Database',
      action: 'CNF record archived',
      recordId: primaryKey,
      cnfNo: record['CNF No.'],
      fieldName: 'Is Archived',
      oldValue: 'No',
      newValue: 'Yes',
      remarks: 'Archived CNF record by user request.'
    });

    return { success: true, message: 'CNF record archived successfully.' };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Restore a CNF record from the ARCHIVED sheet back to the active CNF sheet. */
function restoreArchivedRecord(primaryKey) {
  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const match = findRecordByValue_(SHEETS.ARCHIVED, PRIMARY_KEY, primaryKey);
    if (!match) {
      throw new Error('Archived CNF record was not found for restore.');
    }

    if (findRecordByValue_(SHEETS.CNF, PRIMARY_KEY, primaryKey)) {
      throw new Error('An active CNF record with the same primary key already exists.');
    }

    const user = getUserEmail_();
    const now = nowStamp_();
    const restored = {};
    CNF_HEADERS.forEach(function (header) {
      restored[header] = valueOrNA_(match.data[header]);
    });
    restored['Is Archived'] = 'No';
    restored['Is Active'] = 'Yes';
    restored['Updated By'] = user;
    restored['Updated At'] = now;
    const priority = calculatePriority(restored);
    restored['Priority Level'] = priority.level;
    restored['Open Branch Remarks'] = priority.reason + ' ' + priority.requiredAction;

    getSheet_(SHEETS.CNF).appendRow(CNF_HEADERS.map(function (header) { return restored[header] || 'NA'; }));
    getSheet_(SHEETS.ARCHIVED).deleteRow(match.rowIndex);

    logAuditTrail({
      module: 'Archived',
      action: 'CNF record restored',
      recordId: primaryKey,
      cnfNo: restored['CNF No.'],
      fieldName: 'Is Archived',
      oldValue: 'Yes',
      newValue: 'No',
      remarks: 'Restored archived CNF record to the active database.'
    });

    return { success: true, message: 'CNF record restored successfully.' };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Log data activity (import/export) to the audit trail. */
function logDataActivity(payload) {
  const data = payload || {};
  const moduleName = valueOrNA_(data.moduleName || data.module || 'Database');
  const fileType = valueOrNA_(data.fileType);
  const recordCount = Number(data.recordCount || 0);
  const resultSummary = valueOrNA_(data.resultSummary || 'Completed');
  logAuditTrail({
    module: moduleName,
    action: valueOrNA_(data.action || (moduleName + ' export completed')),
    recordId: valueOrNA_(data.fileName || 'NA'),
    cnfNo: 'NA',
    fieldName: 'Import/Export',
    oldValue: fileType,
    newValue: recordCount + ' record(s)',
    remarks: moduleName + ' ' + valueOrNA_(data.operation || 'export') + ' activity by ' + getUserEmail_() +
      ' on ' + nowStamp_() + '. File type: ' + fileType + '. Record count: ' + recordCount +
      '. Result: ' + resultSummary + '.'
  });
  return { success: true, message: 'Audit activity captured.' };
}

function previewImportRecords(moduleName, filePayload) {
  initializeDatabase();
  const config = getImportConfig_(moduleName);
  const file = filePayload || {};
  const parsed = parseUploadedTabularFile_(file);
  const table = parsed.rows || [];
  if (!table.length) {
    throw new Error('The import file is empty.');
  }

  const rawHeaders = table[0].map(function (value) { return valueOrNA_(value); });
  const headerMap = buildHeaderMap_(rawHeaders, config.headers);
  const missingHeaders = config.requiredHeaders.filter(function (header) {
    return headerMap[header] === undefined;
  });
  if (missingHeaders.length) {
    throw new Error('Import file structure is invalid. Missing required column(s): ' + missingHeaders.join(', ') + '.');
  }

  const existingKeys = {};
  getSheetRecords_(config.sheetName).rows.forEach(function (row) {
    existingKeys[valueOrNA_(row.data[PRIMARY_KEY])] = true;
  });

  const seenKeys = {};
  const records = [];
  let duplicateCount = 0;
  let errorCount = 0;

  for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
    const rawRow = table[rowIndex] || [];
    const isBlankRow = rawRow.every(function (cell) { return valueOrNA_(cell) === 'NA'; });
    if (isBlankRow) continue;

    const normalized = normalizeImportedRecord_(rawRow, headerMap, config);
    const errors = [];
    config.requiredValueHeaders.forEach(function (header) {
      if (valueOrNA_(normalized[header]) === 'NA') errors.push('Missing ' + header);
    });

    let primaryKey = valueOrNA_(normalized[PRIMARY_KEY]);
    if (primaryKey === 'NA') {
      primaryKey = generatePrimaryKey_(seenKeys);
      normalized[PRIMARY_KEY] = primaryKey;
    }

    if (seenKeys[primaryKey]) {
      errors.push('Duplicate primary key inside import file: ' + primaryKey);
    }
    seenKeys[primaryKey] = true;

    const duplicate = Boolean(existingKeys[primaryKey]);
    if (duplicate) duplicateCount += 1;
    if (errors.length) errorCount += 1;

    records.push({
      rowNumber: rowIndex + 1,
      primaryKey: primaryKey,
      duplicate: duplicate,
      errors: errors,
      record: normalized
    });
  }

  return {
    success: true,
    moduleName: config.moduleName,
    fileName: valueOrNA_(file.name),
    fileType: parsed.fileType,
    headers: config.headers,
    records: records,
    summary: {
      processed: records.length,
      duplicates: duplicateCount,
      errors: errorCount,
      ready: records.filter(function (row) { return !row.errors.length; }).length
    }
  };
}

function commitImportRecords(moduleName, importRecords, duplicateMode, fileMeta) {
  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const config = getImportConfig_(moduleName);
    const mode = valueOrNA_(duplicateMode || 'skip').toLowerCase();
    const rows = Array.isArray(importRecords) ? importRecords : [];
    const file = fileMeta || {};
    const duplicateRows = rows.filter(function (row) { return row.duplicate && !(row.errors || []).length; });

    if (mode === 'cancel' && duplicateRows.length) {
      const cancelSummary = 'Processed ' + rows.length + ' row(s); import cancelled because ' + duplicateRows.length + ' duplicate primary key(s) were found.';
      logDataActivity({
        moduleName: config.moduleName,
        operation: 'import',
        action: config.moduleName + ' import cancelled',
        fileType: valueOrNA_(file.fileType || file.type),
        fileName: valueOrNA_(file.fileName || file.name),
        recordCount: rows.length,
        resultSummary: cancelSummary
      });
      return {
        success: false,
        cancelled: true,
        message: 'Import cancelled because duplicate records were found.',
        summary: { processed: rows.length, imported: 0, skipped: rows.length, errors: 0, overwritten: 0 }
      };
    }

    const sheet = getSheet_(config.sheetName);
    const rowMatches = {};
    getSheetRecords_(config.sheetName).rows.forEach(function (row) {
      rowMatches[valueOrNA_(row.data[PRIMARY_KEY])] = row;
    });

    const appendRows = [];
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    let overwritten = 0;

    rows.forEach(function (entry) {
      const entryErrors = entry.errors || [];
      if (entryErrors.length) {
        errors += 1;
        return;
      }

      const record = normalizeRecordForSheet_(entry.record || {}, config);
      const key = valueOrNA_(record[PRIMARY_KEY]);
      const duplicate = Boolean(rowMatches[key]);

      if (duplicate && mode === 'skip') {
        skipped += 1;
        return;
      }

      if (duplicate && mode === 'overwrite') {
        writeRecordToRow_(config.sheetName, rowMatches[key].rowIndex, config.headers, record);
        overwritten += 1;
        imported += 1;
        return;
      }

      appendRows.push(config.headers.map(function (header) { return valueOrNA_(record[header]); }));
      imported += 1;
    });

    if (appendRows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, appendRows.length, config.headers.length).setValues(appendRows);
    }

    const resultSummary = 'Processed ' + rows.length + ' row(s); imported ' + imported +
      '; skipped ' + skipped + '; overwritten ' + overwritten + '; error rows ' + errors + '.';
    logDataActivity({
      moduleName: config.moduleName,
      operation: 'import',
      action: config.moduleName + ' import completed',
      fileType: valueOrNA_(file.fileType || file.type),
      fileName: valueOrNA_(file.fileName || file.name),
      recordCount: rows.length,
      resultSummary: resultSummary
    });

    return {
      success: true,
      message: 'Import completed. ' + resultSummary,
      summary: {
        processed: rows.length,
        imported: imported,
        skipped: skipped,
        overwritten: overwritten,
        errors: errors
      }
    };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Queue an audit trail entry. Entries are flushed in batch at the end of each operation via _flushAuditQueue_(). */
function logAuditTrail(payload) {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, SHEETS.AUDIT, AUDIT_HEADERS);
  const data = payload || {};
  const row = {
    'Audit ID': generateAuditId_(),
    Timestamp: nowStamp_(),
    User: sanitizeAuditValue(data.user || getUserEmail_()),
    Module: sanitizeAuditValue(data.module || 'General'),
    Action: sanitizeAuditValue(data.action || 'Action completed'),
    'Record ID': sanitizeAuditValue(data.recordId || 'NA'),
    'CNF No.': sanitizeAuditValue(data.cnfNo || 'NA'),
    'Endorsement No.': sanitizeAuditValue(data.endorsementNo || 'NA'),
    'Field Name': sanitizeAuditValue(data.fieldName || 'NA'),
    'Old Value': sanitizeAuditValue(data.oldValue),
    'New Value': sanitizeAuditValue(data.newValue),
    Remarks: sanitizeAuditValue(data.remarks || 'Action completed.')
  };
  _auditQueue.push(row);
  return { success: true };
}

function sanitizeAuditValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'NA';
  }

  let text = '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    text = Utilities.formatDate(value, APP_TZ, 'yyyy-MM-dd HH:mm:ss');
  } else if (Array.isArray(value)) {
    text = value.map(sanitizeAuditValue).join(', ');
  } else if (typeof value === 'object') {
    text = Object.keys(value).map(function (key) {
      return key + ': ' + sanitizeAuditValue(value[key]);
    }).join(', ');
  } else {
    text = String(value);
  }

  text = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\{\}\[\]"`<>]/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text || 'NA';
}

/** Get registry values (dropdown options), optionally filtered by type. */
function getRegistryValues(type) {
  initializeDatabase();
  const records = type ? getRegistryRowsForType_(type) : getAllRegistryRows_();
  const active = records.filter(function (row) {
    return valueOrNA_(row.Status) !== 'Inactive';
  });

  if (type) {
    return active
      .filter(function (row) { return row['Registry Type'] === type; })
      .map(function (row) { return row['Registry Value']; })
      .sort();
  }

  return active.reduce(function (grouped, row) {
    const registryType = row['Registry Type'];
    if (!grouped[registryType]) grouped[registryType] = [];
    grouped[registryType].push(row);
    return grouped;
  }, {});
}

/** Add, update, or deactivate a registry value (dropdown option). */
function saveRegistryValue(payload) {
  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const user = getUserEmail_();
    const now = nowStamp_();
    const data = payload || {};
    const action = valueOrNA_(data.action || 'add').toLowerCase();
    const registryType = valueOrNA_(data.registryType);
    const registryValue = valueOrNA_(data.registryValue);
    const description = valueOrNA_(data.description);

    if (registryType === 'NA' || registryValue === 'NA') {
      throw new Error('Registry Type and Registry Value are required.');
    }

    const sheetName = registrySheetName_(registryType);
    if (!getSheet_(sheetName)) ensureSheet_(getSpreadsheet_(), sheetName, REGISTRY_HEADERS);
    const sheet = getSheet_(sheetName);
    const records = getSheetRecords_(sheetName);
    const originalType = valueOrNA_(data.originalType || registryType);
    const originalValue = valueOrNA_(data.originalValue || registryValue);
    const match = records.rows.find(function (row) {
      return row.data['Registry Type'] === originalType && row.data['Registry Value'] === originalValue;
    });

    if (action === 'add') {
      const duplicate = records.rows.some(function (row) {
        return row.data['Registry Type'] === registryType &&
          row.data['Registry Value'].toLowerCase() === registryValue.toLowerCase() &&
          valueOrNA_(row.data.Status) !== 'Inactive';
      });
      if (duplicate) {
        throw new Error('Registry value already exists.');
      }
      const row = [registryType, registryValue, description, 'Active', user, now, user, now];
      sheet.appendRow(row);
      logAuditTrail({
        module: 'Registry',
        action: 'Registry value added',
        recordId: registryType + ': ' + registryValue,
        cnfNo: 'NA',
        fieldName: 'Registry Value',
        oldValue: 'NA',
        newValue: registryValue,
        remarks: 'Added registry value ' + registryValue + ' under ' + registryType + '.'
      });
      return { success: true, message: 'Registry value added successfully.' };
    }

    if (!match) {
      throw new Error('Registry value was not found.');
    }

    const oldRecord = match.data;
    const newRecord = Object.assign({}, oldRecord, {
      'Registry Type': registryType,
      'Registry Value': registryValue,
      Description: description,
      Status: action === 'deactivate' ? 'Inactive' : valueOrNA_(data.status || oldRecord.Status || 'Active'),
      'Updated By': user,
      'Updated At': now
    });

    writeRecordToRow_(sheetName, match.rowIndex, REGISTRY_HEADERS, newRecord);
    logAuditTrail({
      module: 'Registry',
      action: action === 'deactivate' ? 'Registry value deactivated' : 'Registry value updated',
      recordId: registryType + ': ' + registryValue,
      cnfNo: 'NA',
      fieldName: action === 'deactivate' ? 'Status' : 'Registry Value',
      oldValue: action === 'deactivate' ? oldRecord.Status : oldRecord['Registry Value'],
      newValue: action === 'deactivate' ? 'Inactive' : registryValue,
      remarks: action === 'deactivate'
        ? 'Deactivated registry value ' + oldRecord['Registry Value'] + '.'
        : 'Updated registry value ' + oldRecord['Registry Value'] + ' to ' + registryValue + '.'
    });

    return { success: true, message: 'Registry value saved successfully.' };
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Set up (or reset) the annual archive time-driven trigger. Skips if already set unless forceReset is true. */
function setupAnnualArchiveTrigger(forceReset) {
  const triggers = ScriptApp.getProjectTriggers();
  const matching = triggers.filter(function (trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === AUTO_ARCHIVE_HANDLER;
  });

  if (forceReset) {
    matching.forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
  } else if (matching.length) {
    return {
      success: true,
      message: 'Annual archive trigger already exists.'
    };
  }

  const nextRun = getNextAnnualArchiveDate_();
  ScriptApp.newTrigger(AUTO_ARCHIVE_HANDLER)
    .timeBased()
    .at(nextRun)
    .create();

  PropertiesService.getScriptProperties().setProperty('CNF_NEXT_ANNUAL_ARCHIVE_RUN', nextRun.toISOString());
  return {
    success: true,
    message: 'Annual archive trigger created.',
    nextRun: Utilities.formatDate(nextRun, APP_TZ, 'yyyy-MM-dd HH:mm:ss')
  };
}

function runAnnualAutoArchive() {
  initializeDatabase();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const result = archiveAllActiveCNFRecords();
    enforceArchiveCapacityLimit();
    logAuditTrail({
      module: 'Archived',
      action: 'Annual auto archive completed',
      recordId: 'Annual Auto Archive',
      cnfNo: 'NA',
      fieldName: 'Archive Count',
      oldValue: 'NA',
      newValue: String(result.archivedCount),
      remarks: 'Annual auto archive completed for ' + result.archivedCount + ' active CNF record(s).'
    });
    setupAnnualArchiveTrigger(true);
    return result;
  } finally {
    _clearCache_();
    _flushAuditQueue_();
    lock.releaseLock();
  }
}

/** Archive all active CNF records to the ARCHIVED sheet, then clear the CNF sheet for a fresh start. */
function archiveAllActiveCNFRecords() {
  const user = 'System Auto-Archive';
  const now = nowStamp_();
  const records = getSheetRecords_(SHEETS.CNF);
  const activeRows = records.rows.filter(function (row) { return isActiveRow_(row.data); });
  const inactiveRows = records.rows.filter(function (row) { return !isActiveRow_(row.data); });

  if (!activeRows.length) {
    return { success: true, archivedCount: 0, message: 'No active CNF records to archive.' };
  }

  const archivedRecords = activeRows.map(function (row) {
    return Object.assign({}, row.data, {
      'Is Archived': 'Yes',
      'Is Active': 'No',
      'Updated By': user,
      'Updated At': now
    });
  });

  appendArchivedRows_(archivedRecords, user, now, 'Annual auto-archive executed every December 31 at 12:00 midnight');

  const cnfSheet = getSheet_(SHEETS.CNF);
  clearDataRows_(cnfSheet);
  if (inactiveRows.length) {
    cnfSheet.getRange(2, 1, inactiveRows.length, CNF_HEADERS.length)
      .setValues(inactiveRows.map(function (row) {
        return CNF_HEADERS.map(function (header) { return row.data[header] || 'NA'; });
      }));
  }

  archivedRecords.forEach(function (record) {
    logAuditTrail({
      module: 'Archived',
      action: 'Annual auto archive completed',
      recordId: record[PRIMARY_KEY],
      cnfNo: record['CNF No.'],
      fieldName: 'Is Archived',
      oldValue: 'No',
      newValue: 'Yes',
      remarks: 'Archived CNF record during annual auto archive.'
    });
  });

  return {
    success: true,
    archivedCount: archivedRecords.length,
    message: 'Annual auto archive completed.'
  };
}

/** Trim the ARCHIVED sheet if it exceeds ARCHIVE_LIMIT rows (oldest first). */
function enforceArchiveCapacityLimit() {
  const count = Math.max(0, getSheet_(SHEETS.ARCHIVED).getLastRow() - 1);
  if (count <= ARCHIVE_LIMIT) {
    return { success: true, purgedCount: 0, message: 'Archive capacity is within limit.' };
  }
  return purgeOldestArchivedRecords(count - ARCHIVE_LIMIT);
}

function purgeOldestArchivedRecords(excessCount) {
  const excess = Number(excessCount || 0);
  if (excess <= 0) {
    return { success: true, purgedCount: 0, message: 'No archived records needed purging.' };
  }

  const sheet = getSheet_(SHEETS.ARCHIVED);
  const records = getSheetRecords_(SHEETS.ARCHIVED).rows.map(function (row) { return row.data; });
  records.sort(function (a, b) {
    return parsePrimaryKeyTime_(a[PRIMARY_KEY]) - parsePrimaryKeyTime_(b[PRIMARY_KEY]);
  });

  const toPurge = records.slice(0, excess);
  const toKeep = records.slice(excess).slice(-ARCHIVE_LIMIT);

  toPurge.forEach(function (record) {
    logAuditTrail({
      module: 'Archived',
      action: 'Oldest archived record removed due to 900 entry limit',
      recordId: record[PRIMARY_KEY],
      cnfNo: record['CNF No.'],
      fieldName: 'Archive Capacity',
      oldValue: 'Archived',
      newValue: 'Purged',
      remarks: 'Removed oldest archived record because archive limit reached 900 entries.'
    });
  });

  clearDataRows_(sheet);
  if (toKeep.length) {
    sheet.getRange(2, 1, toKeep.length, ARCHIVED_HEADERS.length)
      .setValues(toKeep.map(function (record) {
        return ARCHIVED_HEADERS.map(function (header) { return record[header] || 'NA'; });
      }));
  }

  return {
    success: true,
    purgedCount: toPurge.length,
    message: 'Oldest archived records purged successfully.'
  };
}

function getImportConfig_(moduleName) {
  const name = valueOrNA_(moduleName).toLowerCase();
  if (name.indexOf('archive') !== -1) {
    return {
      moduleName: 'Archived',
      sheetName: SHEETS.ARCHIVED,
      headers: ARCHIVED_HEADERS,
      requiredHeaders: ARCHIVED_IMPORT_REQUIRED_HEADERS,
      requiredValueHeaders: ARCHIVED_IMPORT_REQUIRED_HEADERS
    };
  }

  return {
    moduleName: 'Database',
    sheetName: SHEETS.CNF,
    headers: CNF_HEADERS,
    requiredHeaders: CNF_IMPORT_REQUIRED_HEADERS,
    requiredValueHeaders: CNF_IMPORT_REQUIRED_HEADERS
  };
}

function parseUploadedTabularFile_(filePayload) {
  const file = filePayload || {};
  const name = valueOrNA_(file.name);
  const extension = getFileExtension_(name);
  const data = String(file.data || '');
  const base64 = data.indexOf(',') !== -1 ? data.split(',').pop() : data;
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, valueOrNA_(file.mimeType || file.type), name);
  const text = blob.getDataAsString('UTF-8');

  if (extension === 'csv') {
    return { rows: Utilities.parseCsv(text), fileType: 'CSV' };
  }
  if (extension === 'tsv' || extension === 'tab') {
    return { rows: parseDelimitedText_(text, '\t'), fileType: 'TSV' };
  }
  if (extension === 'xlsx') {
    return { rows: parseXlsxRows_(blob), fileType: 'Excel' };
  }
  if (extension === 'xls') {
    if (text.indexOf('<table') !== -1 || text.indexOf('<tr') !== -1) {
      return { rows: parseHtmlTableRows_(text), fileType: 'Excel' };
    }
    return { rows: parseDelimitedText_(text, text.indexOf('\t') !== -1 ? '\t' : ','), fileType: 'Excel' };
  }

  throw new Error('Unsupported import file type. Upload Excel, CSV, or TSV files only.');
}

function parseDelimitedText_(text, delimiter) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (delimiter === ',') return Utilities.parseCsv(normalized);
  return normalized.split('\n').filter(function (line) {
    return line.trim() !== '';
  }).map(function (line) {
    return line.split(delimiter).map(function (value) { return value.trim(); });
  });
}

function parseHtmlTableRows_(html) {
  const rows = [];
  const rowMatches = String(html || '').match(/<tr[\s\S]*?<\/tr>/gi) || [];
  rowMatches.forEach(function (rowHtml) {
    const cells = [];
    const cellMatches = rowHtml.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
    cellMatches.forEach(function (cellHtml) {
      cells.push(decodeHtml_(cellHtml.replace(/<[^>]+>/g, '').trim()));
    });
    if (cells.length) rows.push(cells);
  });
  return rows;
}

function parseXlsxRows_(blob) {
  const files = Utilities.unzip(blob);
  const byName = {};
  files.forEach(function (file) {
    byName[file.getName()] = file;
  });

  const sharedStrings = parseXlsxSharedStrings_(byName['xl/sharedStrings.xml']);
  const sheetPath = getFirstXlsxSheetPath_(byName) || 'xl/worksheets/sheet1.xml';
  const sheetFile = byName[sheetPath];
  if (!sheetFile) {
    throw new Error('Excel import failed because the workbook has no readable first sheet.');
  }

  const xml = sheetFile.getDataAsString('UTF-8');
  const rows = [];
  const rowMatches = xml.match(/<row[\s\S]*?<\/row>/g) || [];
  rowMatches.forEach(function (rowXml) {
    const values = [];
    const cellMatches = rowXml.match(/<c[\s\S]*?<\/c>/g) || [];
    cellMatches.forEach(function (cellXml) {
      const refMatch = cellXml.match(/\sr="([A-Z]+)\d+"/);
      const columnIndex = refMatch ? xlsxColumnIndex_(refMatch[1]) : values.length;
      while (values.length < columnIndex) values.push('');
      values[columnIndex] = getXlsxCellValue_(cellXml, sharedStrings);
    });
    if (values.some(function (value) { return valueOrNA_(value) !== 'NA'; })) rows.push(values);
  });
  return rows;
}

function parseXlsxSharedStrings_(file) {
  if (!file) return [];
  const xml = file.getDataAsString('UTF-8');
  const strings = [];
  const matches = xml.match(/<si[\s\S]*?<\/si>/g) || [];
  matches.forEach(function (si) {
    const pieces = [];
    const textMatches = si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || [];
    textMatches.forEach(function (textXml) {
      pieces.push(decodeXml_(textXml.replace(/<[^>]+>/g, '')));
    });
    strings.push(pieces.join(''));
  });
  return strings;
}

function getFirstXlsxSheetPath_(byName) {
  const workbook = byName['xl/workbook.xml'];
  const rels = byName['xl/_rels/workbook.xml.rels'];
  if (!workbook || !rels) return '';
  const workbookXml = workbook.getDataAsString('UTF-8');
  const sheetMatch = workbookXml.match(/<sheet[^>]*r:id="([^"]+)"/);
  if (!sheetMatch) return '';
  const relId = sheetMatch[1];
  const relXml = rels.getDataAsString('UTF-8');
  const relRegex = new RegExp('<Relationship[^>]*Id="' + relId + '"[^>]*Target="([^"]+)"');
  const relMatch = relXml.match(relRegex);
  if (!relMatch) return '';
  const target = relMatch[1].replace(/^\//, '');
  return target.indexOf('xl/') === 0 ? target : 'xl/' + target;
}

function getXlsxCellValue_(cellXml, sharedStrings) {
  const typeMatch = cellXml.match(/\st="([^"]+)"/);
  const type = typeMatch ? typeMatch[1] : '';
  if (type === 'inlineStr') {
    const inlineMatches = cellXml.match(/<t[^>]*>[\s\S]*?<\/t>/g) || [];
    return inlineMatches.map(function (textXml) {
      return decodeXml_(textXml.replace(/<[^>]+>/g, ''));
    }).join('');
  }

  const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
  if (!valueMatch) return '';
  const raw = decodeXml_(valueMatch[1]);
  if (type === 's') {
    return sharedStrings[Number(raw)] || '';
  }
  return raw;
}

function xlsxColumnIndex_(letters) {
  let index = 0;
  String(letters || '').split('').forEach(function (letter) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  });
  return Math.max(0, index - 1);
}

function buildHeaderMap_(rawHeaders, expectedHeaders) {
  const byNormalized = {};
  rawHeaders.forEach(function (header, index) {
    byNormalized[normalizeHeaderName_(header)] = index;
  });

  const map = {};
  expectedHeaders.forEach(function (header) {
    const index = byNormalized[normalizeHeaderName_(header)];
    if (index !== undefined) map[header] = index;
  });
  return map;
}

function normalizeImportedRecord_(rawRow, headerMap, config) {
  const record = {};
  config.headers.forEach(function (header) {
    const index = headerMap[header];
    record[header] = index === undefined ? defaultImportValue_(header, config) : valueOrNA_(rawRow[index]);
  });
  return normalizeRecordForSheet_(record, config);
}

function normalizeRecordForSheet_(record, config) {
  const user = getUserEmail_();
  const now = nowStamp_();
  const normalized = {};
  config.headers.forEach(function (header) {
    normalized[header] = valueOrNA_(record[header]);
  });

  if (config.sheetName === SHEETS.CNF) {
    if (normalized[PRIMARY_KEY] === 'NA') normalized[PRIMARY_KEY] = generatePrimaryKey_(getExistingPrimaryKeys_());
    if (normalized['CNF Status'] === 'NA') normalized['CNF Status'] = 'Open';
    if (normalized['Created By'] === 'NA') normalized['Created By'] = user;
    if (normalized['Created At'] === 'NA') normalized['Created At'] = now;
    normalized['Updated By'] = user;
    normalized['Updated At'] = now;
    if (normalized['Is Archived'] === 'NA') normalized['Is Archived'] = 'No';
    if (normalized['Is Active'] === 'NA') normalized['Is Active'] = 'Yes';
    const priority = calculatePriority(normalized);
    normalized['Priority Level'] = priority.level;
    normalized['Open Branch Remarks'] = priority.reason + ' ' + priority.requiredAction;
  }

  if (config.sheetName === SHEETS.ARCHIVED) {
    if (normalized[PRIMARY_KEY] === 'NA') normalized[PRIMARY_KEY] = generatePrimaryKey_(getExistingPrimaryKeys_());
    if (normalized['CNF Status'] === 'NA') normalized['CNF Status'] = 'Open';
    if (normalized['Created By'] === 'NA') normalized['Created By'] = user;
    if (normalized['Created At'] === 'NA') normalized['Created At'] = now;
    normalized['Updated By'] = user;
    normalized['Updated At'] = now;
    normalized['Is Archived'] = 'Yes';
    normalized['Is Active'] = 'No';
    if (normalized['Archived By'] === 'NA') normalized['Archived By'] = user;
    if (normalized['Archived At'] === 'NA') normalized['Archived At'] = now;
    if (normalized['Archive Remarks'] === 'NA') normalized['Archive Remarks'] = 'Imported archived record.';
    const archivedPriority = calculatePriority(normalized);
    normalized['Priority Level'] = archivedPriority.level;
    normalized['Open Branch Remarks'] = archivedPriority.reason + ' ' + archivedPriority.requiredAction;
  }

  config.headers.forEach(function (header) {
    normalized[header] = valueOrNA_(normalized[header]);
  });
  return normalized;
}

function defaultImportValue_(header, config) {
  if (header === 'CNF Status') return 'Open';
  if (header === 'No. of Batch per Study') return '1';
  if (header === 'Batch') return '1 of 1';
  if (header === 'Created By' || header === 'Updated By' || header === 'Archived By') return getUserEmail_();
  if (header === 'Created At' || header === 'Updated At' || header === 'Archived At') return nowStamp_();
  if (header === 'Is Archived') return config.sheetName === SHEETS.ARCHIVED ? 'Yes' : 'No';
  if (header === 'Is Active') return config.sheetName === SHEETS.ARCHIVED ? 'No' : 'Yes';
  if (header === 'Archive Remarks') return 'Imported archived record.';
  return 'NA';
}

function normalizeHeaderName_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getFileExtension_(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function decodeXml_(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function decodeHtml_(value) {
  return decodeXml_(String(value || '').replace(/&nbsp;/g, ' '));
}

/** Get or create the database Spreadsheet. Cached per execution. */
function getSpreadsheet_() {
  if (_cache.spreadsheet) return _cache.spreadsheet;
  const props = PropertiesService.getScriptProperties();
  const storedId = props.getProperty(DB_PROPERTY_KEY);
  if (storedId) {
    try {
      _cache.spreadsheet = SpreadsheetApp.openById(storedId);
      return _cache.spreadsheet;
    } catch (error) {
      props.deleteProperty(DB_PROPERTY_KEY);
    }
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    _cache.spreadsheet = active;
    props.setProperty(DB_PROPERTY_KEY, active.getId());
    return active;
  }

  const ss = SpreadsheetApp.create('CNF Tracker Database');
  _cache.spreadsheet = ss;
  props.setProperty(DB_PROPERTY_KEY, ss.getId());
  return ss;
}

function ensureSheet_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  _cache.headers[sheetName] = headers;
  _cache.headerMaps[sheetName] = null;
  try {
    CacheService.getScriptCache().put('headers:' + sheetName, JSON.stringify(headers), 21600);
  } catch (error) {}
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#eef2f3')
    .setFontColor('#1f2933');
  sheet.autoResizeColumns(1, Math.min(headers.length, 12));
  return sheet;
}

function getSheet_(sheetName) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    const knownHeaders = {};
    knownHeaders[SHEETS.CNF] = CNF_HEADERS;
    knownHeaders[SHEETS.ENDORSEMENT] = ENDORSEMENT_HEADERS;
    knownHeaders[SHEETS.AUDIT] = AUDIT_HEADERS;
    knownHeaders[SHEETS.REGISTRY] = REGISTRY_HEADERS;
    knownHeaders[SHEETS.ARCHIVED] = ARCHIVED_HEADERS;
    sheet = ensureSheet_(ss, sheetName, knownHeaders[sheetName] || REGISTRY_HEADERS);
  }
  return sheet;
}

function getHeaders_(sheet) {
  const sheetName = sheet.getName();
  if (_cache.headers[sheetName]) return _cache.headers[sheetName];
  const cache = CacheService.getScriptCache();
  const cacheKey = 'headers:' + sheetName;
  const cached = cache.get(cacheKey);
  if (cached) {
    _cache.headers[sheetName] = JSON.parse(cached);
    return _cache.headers[sheetName];
  }
  if (sheet.getLastColumn() === 0) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].filter(String);
  _cache.headers[sheetName] = headers;
  cache.put(cacheKey, JSON.stringify(headers), 21600);
  return headers;
}

function getHeaderMap_(sheetName) {
  if (_cache.headerMaps[sheetName]) return _cache.headerMaps[sheetName];
  const headers = getHeaders_(getSheet_(sheetName));
  const map = {};
  headers.forEach(function (header, index) {
    map[header] = index;
  });
  _cache.headerMaps[sheetName] = map;
  return map;
}

/** Read all rows from a sheet. Cached per execution so repeated calls return instantly. Clear via _clearCache_() after writes. */
function getSheetRecords_(sheetName) {
  if (_cache.sheetRecords[sheetName]) return _cache.sheetRecords[sheetName];
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    var empty = { sheet: sheet, headers: headers, rows: [] };
    _cache.sheetRecords[sheetName] = empty;
    return empty;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const rows = values.map(function (row, index) {
    const data = {};
    headers.forEach(function (header, colIndex) {
      data[header] = valueOrNA_(row[colIndex]);
    });
    return {
      rowIndex: index + 2,
      data: data
    };
  });
  var result = { sheet: sheet, headers: headers, rows: rows };
  _cache.sheetRecords[sheetName] = result;
  return result;
}

function seedRegistry_() {
  const user = getUserEmail_();
  const now = nowStamp_();
  Object.keys(DEFAULT_REGISTRY_VALUES).forEach(function (type) {
    const sheetName = registrySheetName_(type);
    const sheet = getSheet_(sheetName);
    const existing = getRegistryRowsForType_(type).reduce(function (set, row) {
      set[row['Registry Type'] + '|' + row['Registry Value'].toLowerCase()] = true;
      return set;
    }, {});
    const rows = [];
    DEFAULT_REGISTRY_VALUES[type].forEach(function (value) {
      const key = type + '|' + value.toLowerCase();
      if (!existing[key]) {
        rows.push([type, value, 'Default ' + type + ' value', 'Active', user, now, user, now]);
      }
    });
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, REGISTRY_HEADERS.length).setValues(rows);
      _cache.sheetRecords[sheetName] = null;
    }
  });
}

function ensureSeparateRegistrySheets_(ss) {
  Object.keys(SEPARATE_REGISTRY_SHEETS).forEach(function (key) {
    ensureSheet_(ss, SEPARATE_REGISTRY_SHEETS[key], REGISTRY_HEADERS);
  });
}

function migrateLegacyRegistry_() {
  const legacy = getSheetRecords_(SHEETS.REGISTRY).rows.map(function (row) { return row.data; });
  if (!legacy.length) return;
  legacy.forEach(function (row) {
    appendRegistryRowIfMissing_(row);
  });
}

function appendRegistryRowIfMissing_(row) {
  const registryType = valueOrNA_(row['Registry Type']);
  const registryValue = valueOrNA_(row['Registry Value']);
  if (registryType === 'NA' || registryValue === 'NA') return;
  const sheetName = registrySheetName_(registryType);
  const exists = getRegistryRowsForType_(registryType).some(function (existing) {
    return existing['Registry Type'] === registryType &&
      existing['Registry Value'].toLowerCase() === registryValue.toLowerCase();
  });
  if (exists) return;
  getSheet_(sheetName).appendRow(REGISTRY_HEADERS.map(function (header) { return valueOrNA_(row[header]); }));
  _cache.sheetRecords[sheetName] = null;
}

function registrySheetName_(type) {
  return SEPARATE_REGISTRY_SHEETS[type] || String(type || 'Registry').replace(/[^A-Za-z0-9]+/g, '_') + '_Registry';
}

function getRegistryRowsForType_(type) {
  const sheetName = registrySheetName_(type);
  if (!getSheet_(sheetName)) ensureSheet_(getSpreadsheet_(), sheetName, REGISTRY_HEADERS);
  return getSheetRecords_(sheetName).rows.map(function (row) { return row.data; });
}

function getAllRegistryRows_() {
  const seen = {};
  const rows = [];
  Object.keys(DEFAULT_REGISTRY_VALUES).concat(Object.keys(SEPARATE_REGISTRY_SHEETS)).forEach(function (type) {
    getRegistryRowsForType_(type).forEach(function (row) {
      const key = row['Registry Type'] + '|' + row['Registry Value'];
      if (!seen[key]) {
        seen[key] = true;
        rows.push(row);
      }
    });
  });
  return rows;
}

function getCombinedRegistrySheetData_() {
  return {
    headers: REGISTRY_HEADERS,
    rows: getAllRegistryRows_()
  };
}

function getExistingPrimaryKeys_() {
  const keys = {};
  [SHEETS.CNF, SHEETS.ARCHIVED].forEach(function (sheetName) {
    getSheetRecords_(sheetName).rows.forEach(function (row) {
      keys[row.data[PRIMARY_KEY]] = true;
    });
  });
  return keys;
}

function getExistingEndorsementIds_() {
  const ids = {};
  getSheetRecords_(SHEETS.ENDORSEMENT).rows.forEach(function (row) {
    ids[row.data['Endorsement ID']] = true;
  });
  return ids;
}

function generatePrimaryKey_(existingKeys) {
  let key = '';
  do {
    key = Utilities.formatDate(new Date(), APP_TZ, 'dd-MMM-yyyy HH:mm:ss-SSS');
    if (existingKeys && existingKeys[key]) {
      Utilities.sleep(2);
    }
  } while (existingKeys && existingKeys[key]);

  if (existingKeys) existingKeys[key] = true;
  return key;
}

function generateEndorsementId_(existingKeys) {
  let id = '';
  do {
    id = 'END-' + Utilities.formatDate(new Date(), APP_TZ, 'yyyyMMddHHmmssSSS');
    if (existingKeys && existingKeys[id]) Utilities.sleep(2);
  } while (existingKeys && existingKeys[id]);
  if (existingKeys) existingKeys[id] = true;
  return id;
}

function generateAuditId_() {
  return 'AUD-' + Utilities.formatDate(new Date(), APP_TZ, 'yyyyMMddHHmmssSSS');
}

function nowStamp_() {
  return Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM-dd HH:mm:ss');
}

function getUserEmail_() {
  try {
    return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'Unknown User';
  } catch (error) {
    return 'Unknown User';
  }
}

function valueOrNA_(value) {
  if (value === null || value === undefined) return 'NA';
  const text = String(value).trim();
  return text === '' ? 'NA' : text;
}

function lower_(value) {
  return valueOrNA_(value).toLowerCase();
}

function pickValue_(payload, prop, fallback) {
  if (payload && Object.prototype.hasOwnProperty.call(payload, prop)) {
    return payload[prop];
  }
  return fallback;
}

function normalizeCNFProductsPayload_(payload) {
  const source = payload || {};
  const supplied = Array.isArray(source.products) && source.products.length ? source.products : [source];
  return supplied.map(function (product, index) {
    const item = product || {};
    const batchCount = getPayloadBatchCount_(item, getPayloadBatchCount_(source, 1));
    const normalized = Object.assign({}, item);
    normalized.productIndex = index + 1;
    normalized.noOfBatchPerStudy = batchCount;
    if (valueOrNA_(source.cnfCategorization) === 'Non-Process') {
      if (valueOrNA_(normalized.noOfBatchPerStudy) === 'NA') normalized.noOfBatchPerStudy = 0;
      if (valueOrNA_(normalized.moBmrRefNo) === 'NA') normalized.moBmrRefNo = 'NA';
      if (valueOrNA_(normalized.moBmrStatus) === 'NA') normalized.moBmrStatus = 'NA';
      if (valueOrNA_(normalized.poBprRefNo) === 'NA') normalized.poBprRefNo = 'NA';
      if (valueOrNA_(normalized.poBprStatus) === 'NA') normalized.poBprStatus = 'NA';
    }
    normalized.batches = normalizeBatchPayload_(normalized, batchCount);
    return normalized;
  });
}

function createProductPayload_(parentPayload, productPayload) {
  const parent = parentPayload || {};
  const product = productPayload || {};
  return Object.assign({}, product, {
    cnfNo: pickValue_(parent, 'cnfNo', product.cnfNo),
    cnfInitiator: pickValue_(parent, 'cnfInitiator', product.cnfInitiator),
    qrmrNo: pickValue_(parent, 'qrmrNo', product.qrmrNo),
    cnfCategorization: pickValue_(parent, 'cnfCategorization', product.cnfCategorization),
    cnfStatus: pickValue_(parent, 'cnfStatus', product.cnfStatus || 'Open'),
    closedDate: pickValue_(parent, 'closedDate', product.closedDate || 'NA')
  });
}

function normalizeBatchPayload_(payload, batchCount) {
  const supplied = Array.isArray(payload.batches) ? payload.batches : [];
  const batches = [];
  if (Number(batchCount || 0) <= 0) {
    return [{
      primaryKey: valueOrNA_(supplied[0] && supplied[0].primaryKey),
      batchNo: 'NA',
      batch: 'NA',
      interimNo: 'NA',
      interimStatus: 'NA'
    }];
  }
  for (let i = 0; i < batchCount; i += 1) {
    const item = supplied[i] || {};
    batches.push({
      primaryKey: valueOrNA_(item.primaryKey),
      batchNo: valueOrNA_(item.batchNo || payload.batchNo),
      batch: valueOrNA_(item.batch) === 'NA' ? (i + 1) + ' of ' + batchCount : valueOrNA_(item.batch),
      interimNo: valueOrNA_(item.interimNo || payload.interimNo),
      interimStatus: valueOrNA_(item.interimStatus || payload.interimStatus)
    });
  }
  return batches;
}

function getPayloadBatchCount_(payload, fallback) {
  const source = payload || {};
  const hasValue = Object.prototype.hasOwnProperty.call(source, 'noOfBatchPerStudy') &&
    valueOrNA_(source.noOfBatchPerStudy) !== 'NA';
  return Math.max(0, Number(hasValue ? source.noOfBatchPerStudy : fallback));
}

function getFirstBatchValue_(payload, field, fallback) {
  if (payload && Array.isArray(payload.batches) && payload.batches.length && Object.prototype.hasOwnProperty.call(payload.batches[0], field)) {
    return payload.batches[0][field];
  }
  if (payload && Object.prototype.hasOwnProperty.call(payload, field)) {
    return payload[field];
  }
  return fallback;
}

function validateRequiredCNFFields_(payload, products) {
  return collectCNFValidationWarnings_(payload, products);
}

function collectCNFValidationWarnings_(payload, products) {
  const parent = payload || {};
  const categorization = valueOrNA_(parent.cnfCategorization);
  const warnings = [];
  const productList = products && products.length ? products : [parent];
  productList.forEach(function (product, index) {
    if (!isActiveProductProject_(product)) return;
    const prefix = productList.length > 1 ? 'Product/Project ' + (index + 1) + ' ' : '';
    [
      ['productName', 'Product/Project'],
      ['productCode', 'Product Code'],
      ['client', 'Client'],
      ['descriptionOfChange', 'Description of Change'],
      ['department', 'Department'],
      ['study', 'Study'],
      ['noOfBatchPerStudy', 'No. of Batch per Study'],
      ['targetImplementationDate', 'Target Implementation Date'],
      ['targetBillingDeliveryDate', 'Target Billing / Delivery Date']
    ].forEach(function (item) {
      if (valueOrNA_(product[item[0]]) === 'NA') warnings.push(prefix + item[1]);
    });
    normalizeBatchPayload_(product, getPayloadBatchCount_(product, 1)).forEach(function (batch, batchIndex) {
      if (valueOrNA_(batch.batchNo) === 'NA') warnings.push(prefix + 'Batch No. ' + (batchIndex + 1));
      if (valueOrNA_(batch.batch) === 'NA') warnings.push(prefix + 'Batch Sequence / Status');
    });
    const docFields = categorization === 'Non-Process' ? [
      ['protocolNo', 'Protocol No.'],
      ['protocolStatus', 'Protocol Status']
    ] : [
      ['moBmrRefNo', 'MO/BMR Ref. No.'],
      ['moBmrStatus', 'MO/BMR Status'],
      ['poBprRefNo', 'PO/BPR Ref. No.'],
      ['poBprStatus', 'PO/BPR Status'],
      ['protocolNo', 'Protocol No.'],
      ['protocolStatus', 'Protocol Status']
    ];
    docFields.forEach(function (item) {
      if (valueOrNA_(product[item[0]]) === 'NA') warnings.push(prefix + item[1]);
    });
    normalizeBatchPayload_(product, getPayloadBatchCount_(product, 1)).forEach(function (batch, batchIndex) {
      if (!isNotApplicable_(batch.interimStatus)) {
        if (valueOrNA_(batch.interimNo) === 'NA') warnings.push(prefix + 'Interim No. ' + (batchIndex + 1));
        if (valueOrNA_(batch.interimStatus) === 'NA') warnings.push(prefix + 'Interim Status ' + (batchIndex + 1));
      }
    });
    if (valueOrNA_(product.reportNo) === 'NA') warnings.push(prefix + 'Report No.');
    if (valueOrNA_(product.reportStatus) === 'NA') warnings.push(prefix + 'Report Status');
    if (!isNotApplicable_(product.endorsementStatus)) {
      if (valueOrNA_(product.endorsementNo) === 'NA') warnings.push(prefix + 'Endorsement No.');
      if (valueOrNA_(product.endorsementStatus) === 'NA') warnings.push(prefix + 'Endorsement Status');
    }
  });
  if (valueOrNA_(parent.cnfCategorization) === 'NA') warnings.push('CNF Categorization');
  if (valueOrNA_(parent.cnfStatus) === 'NA') warnings.push('CNF Status');
  if (valueOrNA_(parent.closedDate) === 'NA') warnings.push('Closed Date');
  return warnings;
}

function buildCNFRecordFromPayload_(payload, existing, options) {
  const base = existing ? Object.assign({}, existing) : {};
  const opts = options || {};
  const user = opts.user || getUserEmail_();
  const now = opts.now || nowStamp_();

  const mapping = {
    'CNF No.': 'cnfNo',
    'CNF Initiator': 'cnfInitiator',
    'QRMR No.': 'qrmrNo',
    'CNF Categorization': 'cnfCategorization',
    'Product Name / Project': 'productName',
    'Product Code': 'productCode',
    Client: 'client',
    'Description of Change': 'descriptionOfChange',
    Department: 'department',
    Study: 'study',
    'No. of Batch per Study': 'noOfBatchPerStudy',
    'Target Implementation Date': 'targetImplementationDate',
    'Target Billing / Delivery Date': 'targetBillingDeliveryDate',
    'MO/BMR Ref. No.': 'moBmrRefNo',
    'MO/BMR Status': 'moBmrStatus',
    'PO/BPR Ref. No.': 'poBprRefNo',
    'PO/BPR Status': 'poBprStatus',
    'Protocol No.': 'protocolNo',
    'Protocol Status': 'protocolStatus',
    'Interim No.': 'interimNo',
    'Interim Status': 'interimStatus',
    'Report No.': 'reportNo',
    'Report Status': 'reportStatus',
    'Endorsement No.': 'endorsementNo',
    'Endorsement Status': 'endorsementStatus',
    'Billing Status': 'billingStatus',
    'Billing Department Notified': 'billingDepartmentNotified',
    'Product/Project Entry Status': 'entryStatus',
    'Product/Project Remarks': 'productRemarks',
    'CNF Status': 'cnfStatus',
    'Closed Date': 'closedDate'
  };

  CNF_HEADERS.forEach(function (header) {
    if (!Object.prototype.hasOwnProperty.call(base, header)) {
      base[header] = 'NA';
    }
  });

  base[PRIMARY_KEY] = opts.primaryKey || base[PRIMARY_KEY] || generatePrimaryKey_(getExistingPrimaryKeys_());
  Object.keys(mapping).forEach(function (header) {
    const prop = mapping[header];
    const fallback = header === 'CNF Status' ? 'Open' : base[header];
    const rawValue = pickValue_(payload, prop, fallback);
    base[header] = valueOrNA_(rawValue);
  });

  NA_DEFAULT_FIELDS.forEach(function (header) {
    base[header] = valueOrNA_(base[header]);
  });

  if (base['CNF Status'] === 'NA') base['CNF Status'] = 'Open';
  if (base['CNF Status'] !== 'Closed') base['Closed Date'] = valueOrNA_(base['Closed Date']);
  if (valueOrNA_(base['Billing Status']) !== 'Billable') {
    base['Billing Department Notified'] = 'No';
  }
  base['Batch No.'] = valueOrNA_(opts.batchNo);
  base.Batch = valueOrNA_(opts.batch);
  base['No. of Batch per Study'] = valueOrNA_(base['No. of Batch per Study']);
  if (base['CNF Categorization'] === 'Non-Process') {
    if (valueOrNA_(base['MO/BMR Ref. No.']) === 'NA') base['MO/BMR Ref. No.'] = 'NA';
    if (valueOrNA_(base['MO/BMR Status']) === 'NA') base['MO/BMR Status'] = 'NA';
    if (valueOrNA_(base['PO/BPR Ref. No.']) === 'NA') base['PO/BPR Ref. No.'] = 'NA';
    if (valueOrNA_(base['PO/BPR Status']) === 'NA') base['PO/BPR Status'] = 'NA';
    if (valueOrNA_(base['No. of Batch per Study']) === 'NA') base['No. of Batch per Study'] = '0';
  }
  if (valueOrNA_(base['Product/Project Entry Status']) === 'NA') base['Product/Project Entry Status'] = 'Active';

  if (opts.isCreate) {
    base['Created By'] = user;
    base['Created At'] = now;
  } else {
    base['Created By'] = valueOrNA_(base['Created By']);
    base['Created At'] = valueOrNA_(base['Created At']);
  }

  base['Updated By'] = user;
  base['Updated At'] = now;
  base['Is Archived'] = opts.isCreate ? 'No' : (valueOrNA_(base['Is Archived']) === 'NA' ? 'No' : base['Is Archived']);
  base['Is Active'] = opts.isCreate ? 'Yes' : (valueOrNA_(base['Is Active']) === 'NA' ? 'Yes' : base['Is Active']);

  return base;
}

function createOverrideMap_(primaryKey, record) {
  const overrides = {};
  overrides[primaryKey] = record;
  return overrides;
}

function validateRecordStatusesForClosure_(record) {
  const blockers = [];
  if (!isActiveProductProject_(record)) return { allowed: true, blockers: blockers };
  getApplicableDocumentFields_(record).forEach(function (field) {
    const status = valueOrNA_(record[field.status]);
    if (!isFinalDocumentStatus_(status)) {
      blockers.push(createClosureBlocker_(record, field));
    }
  });
  return { allowed: blockers.length === 0, blockers: blockers };
}

function validateCNFClosureRecords_(records) {
  const blockers = [];
  (records || []).forEach(function (record) {
    if (!isActiveProductProject_(record)) return;
    getApplicableDocumentFields_(record).forEach(function (field) {
      const status = valueOrNA_(record[field.status]);
      if (!isFinalDocumentStatus_(status)) {
        blockers.push(createClosureBlocker_(record, field));
      }
    });
  });
  return { allowed: blockers.length === 0, blockers: blockers };
}

function validateCNFClosure_(cnfNo, overrides) {
  const activeRows = getActiveCNFRecords_().filter(function (row) {
    return row['CNF No.'] === cnfNo;
  }).map(function (row) {
    return overrides && overrides[row[PRIMARY_KEY]] ? overrides[row[PRIMARY_KEY]] : row;
  });

  if (!activeRows.length && overrides) {
    Object.keys(overrides).forEach(function (key) {
      if (overrides[key]['CNF No.'] === cnfNo) activeRows.push(overrides[key]);
    });
  }

  const blockers = [];
  activeRows.forEach(function (row) {
    if (!isActiveProductProject_(row)) return;
    getApplicableDocumentFields_(row).forEach(function (field) {
      const status = valueOrNA_(row[field.status]);
      if (!isFinalDocumentStatus_(status)) {
        blockers.push(createClosureBlocker_(row, field));
      }
    });
  });

  return {
    allowed: blockers.length === 0,
    blockers: blockers,
    message: blockers.length ? formatClosureBlockerMessage_(blockers) : 'CNF is ready for closure.'
  };
}

function getCNFClosureBlockerMessage_(cnfNo, candidateRecords) {
  const normalizedCnf = valueOrNA_(cnfNo);
  const candidateByKey = {};
  (candidateRecords || []).forEach(function (record) {
    if (valueOrNA_(record[PRIMARY_KEY]) !== 'NA') {
      candidateByKey[record[PRIMARY_KEY]] = record;
    }
  });

  let rows = getActiveCNFRecords_().filter(function (record) {
    return valueOrNA_(record['CNF No.']) === normalizedCnf;
  }).map(function (record) {
    return candidateByKey[record[PRIMARY_KEY]] || record;
  });

  (candidateRecords || []).forEach(function (record) {
    const exists = rows.some(function (row) { return row[PRIMARY_KEY] === record[PRIMARY_KEY]; });
    if (!exists && valueOrNA_(record['CNF No.']) === normalizedCnf) rows.push(record);
  });

  const productOpen = rows.some(function (record) {
    if (!isActiveProductProject_(record)) return false;
    const coreFields = getApplicableDocumentFields_(record).filter(function (field) { return field.type !== 'Endorsement'; });
    if (coreFields.some(function (field) {
      return !isFinalDocumentStatus_(record[field.status]);
    })) return true;
    if (isNotApplicable_(record['Endorsement Status'])) return false;
    return valueOrNA_(record['Endorsement No.']) === 'NA' || !isFinalEndorsementClosureStatus_(record['Endorsement Status']);
  });

  const endorsementOpen = rows.some(function (record) {
    if (!isActiveProductProject_(record)) return false;
    if (isNotApplicable_(record['Endorsement Status'])) return false;
    const endorsementNo = valueOrNA_(record['Endorsement No.']);
    if (endorsementNo === 'NA') return true;
    const related = getActiveEndorsementRecords_().filter(function (item) {
      return valueOrNA_(item['Endorsement No.']) === endorsementNo ||
        (valueOrNA_(item['CNF No.']) === normalizedCnf &&
          valueOrNA_(item['Product Code']) === valueOrNA_(record['Product Code']));
    });
    if (!related.length) return !isFinalEndorsementClosureStatus_(record['Endorsement Status']);
    return related.some(function (item) { return !isEndorsementItemCompleteForClosure_(item); });
  });

  if (productOpen && endorsementOpen) {
    return 'This CNF cannot be closed yet because there are related Product/Project or Endorsement entries that are still open. Please close or complete the related Product/Project and Endorsement entries first.';
  }
  if (productOpen) {
    return 'This CNF cannot be closed yet because one or more related Product/Project entries are still open. Please close or complete the Product/Project entries first.';
  }
  if (endorsementOpen) {
    return 'This CNF cannot be closed yet because one or more related Endorsement entries are still open. Please close or complete the Endorsement entries first.';
  }
  return '';
}

function getActiveEndorsementRecords_() {
  return getSheetRecords_(SHEETS.ENDORSEMENT).rows
    .map(function (row) { return row.data; })
    .filter(isActiveRow_);
}

function isEndorsementItemCompleteForClosure_(record) {
  if (valueOrNA_(record['Closure Status']) === 'Closed') return true;
  const status = valueOrNA_(record['Implementation Status']);
  return status === 'Cancelled' || status === 'Not Applicable' || status === 'NA';
}

function createClosureBlocker_(record, field) {
  return {
    cnfNo: record['CNF No.'],
    product: record['Product Name / Project'],
    batchNo: record['Batch No.'],
    batch: record.Batch,
    documentType: field.type,
    documentReferenceNo: valueOrNA_(record[field.ref]),
    currentStatus: valueOrNA_(record[field.status]),
    requiredAction: 'Set ' + field.type + ' Status to Signed, Cancelled, or NA before closure.'
  };
}

function isNotApplicable_(status) {
  return valueOrNA_(status) === NOT_APPLICABLE_STATUS;
}

function formatClosureBlockerMessage_(blockers) {
  const first = blockers[0];
  return [
    'CNF closure blocked.',
    'CNF No.: ' + first.cnfNo,
    'Product/Project: ' + first.product,
    'Batch No.: ' + first.batchNo,
    'Batch: ' + first.batch,
    'Document Type: ' + first.documentType,
    'Document Reference No.: ' + first.documentReferenceNo,
    'Current Status: ' + first.currentStatus,
    'Required Action: ' + first.requiredAction
  ].join('\n');
}

function isFinalDocumentStatus_(status) {
  return FINAL_DOCUMENT_STATUSES.indexOf(valueOrNA_(status)) !== -1;
}

function isFinalEndorsementClosureStatus_(status) {
  return ENDORSEMENT_CLOSURE_FINAL_STATUSES.indexOf(valueOrNA_(status)) !== -1;
}

function getActiveCNFRecords_() {
  return getSheetRecords_(SHEETS.CNF).rows
    .map(function (row) { return row.data; })
    .filter(isActiveRow_);
}

function isActiveRow_(row) {
  return valueOrNA_(row['Is Archived']) !== 'Yes' && valueOrNA_(row['Is Active']) !== 'No';
}

function isActiveProductProject_(row) {
  return valueOrNA_(row['Product/Project Entry Status']) !== 'Inactive';
}

function getApplicableDocumentFields_(row) {
  const fields = DOCUMENT_FIELDS.slice();
  if (valueOrNA_(row['CNF Categorization']) === 'Non-Process') {
    return fields.filter(function (field) {
      return field.type !== 'MO/BMR' && field.type !== 'PO/BPR';
    });
  }
  return fields;
}

function normalizeCNFNoForCompare_(value) {
  return valueOrNA_(value).toLowerCase();
}

function findDuplicateCNFNo_(cnfNo, allowedExistingCnfNo) {
  const needle = normalizeCNFNoForCompare_(cnfNo);
  if (needle === 'na') return null;
  const allowed = normalizeCNFNoForCompare_(allowedExistingCnfNo);
  const lookup = getCNFNoLookupMap_();
  const matches = lookup[needle] || [];
  const match = matches.find(function (row) {
    return normalizeCNFNoForCompare_(row.data['CNF No.']) !== allowed;
  });
  return match ? match.data : null;
}

function getCNFNoLookupMap_() {
  const map = {};
  [SHEETS.CNF, SHEETS.ARCHIVED].forEach(function (sheetName) {
    getSheetRecords_(sheetName).rows.forEach(function (row) {
      const key = normalizeCNFNoForCompare_(row.data['CNF No.']);
      if (key === 'na') return;
      if (!map[key]) map[key] = [];
      map[key].push(row);
    });
  });
  return map;
}

function writeRecordToRow_(sheetName, rowIndex, headers, record) {
  getSheet_(sheetName).getRange(rowIndex, 1, 1, headers.length)
    .setValues([headers.map(function (header) { return valueOrNA_(record[header]); })]);
}

function findRecordByValue_(sheetName, headerName, value) {
  const records = getSheetRecords_(sheetName);
  const needle = String(value || '').trim();
  const match = records.rows.find(function (row) {
    return String(row.data[headerName] || '').trim() === needle;
  });
  return match || null;
}

/** Compare old/new records and queue audit entries for every changed field. Uses _auditQueue (batched write). */
function logChangedFields_(oldRecord, newRecord, context) {
  const ignored = {
    'Updated By': true,
    'Updated At': true,
    'Open Branch Remarks': true,
    'Priority Level': true
  };

  Object.keys(newRecord).forEach(function (field) {
    if (ignored[field]) return;
    const oldValue = valueOrNA_(oldRecord[field]);
    const newValue = valueOrNA_(newRecord[field]);
    if (field === 'Billing Department Notified' && valueOrNA_(newRecord['Billing Status']) !== 'Billable') return;
    if (oldValue !== newValue) {
      _auditQueue.push({
        'Audit ID': generateAuditId_(),
        Timestamp: nowStamp_(),
        User: sanitizeAuditValue(getUserEmail_()),
        Module: sanitizeAuditValue(context.module),
        Action: sanitizeAuditValue(context.action),
        'Record ID': sanitizeAuditValue(context.recordId),
        'CNF No.': sanitizeAuditValue(context.cnfNo),
        'Endorsement No.': sanitizeAuditValue(context.endorsementNo || newRecord['Endorsement No.'] || 'NA'),
        'Field Name': sanitizeAuditValue(field),
        'Old Value': sanitizeAuditValue(oldValue),
        'New Value': sanitizeAuditValue(newValue),
        Remarks: sanitizeAuditValue('Changed ' + field + ' from ' + oldValue + ' to ' + newValue + '.')
      });
    }
  });
}

function closeAllCNFRows_(cnfNo, closedDate, user) {
  const records = getSheetRecords_(SHEETS.CNF);
  records.rows.forEach(function (row) {
    const record = row.data;
    if (isActiveRow_(record) && record['CNF No.'] === cnfNo) {
      record['CNF Status'] = 'Closed';
      record['Closed Date'] = closedDate;
      record['Updated By'] = user;
      record['Updated At'] = closedDate;
      const priority = calculatePriority(record);
      record['Priority Level'] = priority.level;
      record['Open Branch Remarks'] = priority.reason + ' ' + priority.requiredAction;
      writeRecordToRow_(SHEETS.CNF, row.rowIndex, CNF_HEADERS, record);
    }
  });
}

function updatePriorityLevels_() {
  const records = getSheetRecords_(SHEETS.CNF);
  records.rows.forEach(function (row) {
    if (!isActiveRow_(row.data)) return;
    const priority = calculatePriority(row.data);
    const remarks = priority.reason + ' ' + priority.requiredAction;
    if (row.data['Priority Level'] !== priority.level || row.data['Open Branch Remarks'] !== remarks) {
      row.data['Priority Level'] = priority.level;
      row.data['Open Branch Remarks'] = remarks;
      writeRecordToRow_(SHEETS.CNF, row.rowIndex, CNF_HEADERS, row.data);
    }
  });
}

function findPriorityIssue_(row, today) {
  const implementationDate = parseDateOnly_(row['Target Implementation Date']);
  const billingDate = parseDateOnly_(row['Target Billing / Delivery Date']);
  const implementationDays = implementationDate ? daysBetween_(today, implementationDate) : null;
  const billingDays = billingDate ? daysBetween_(today, billingDate) : null;
  const nearImplementation = implementationDays !== null && implementationDays <= 14;
  const nearBilling = billingDays !== null && billingDays <= 14;
  const missing = function (value) { return valueOrNA_(value) === 'NA'; };
  const issue = function (days, reason, requiredAction) {
    return { days: days === null ? 9999 : days, reason: reason, requiredAction: requiredAction };
  };

  if (valueOrNA_(row['CNF Categorization']) === 'Non-Process') {
    if (nearImplementation && missing(row['Protocol No.'])) {
      return issue(implementationDays, 'Non-Process CNF is nearing the Target Implementation Date, but Protocol is not yet identified.', 'Provide the Protocol number or update the Protocol status.');
    }
    return null;
  }

  if (nearImplementation && missing(row['MO/BMR Ref. No.'])) {
    return issue(implementationDays, 'CNF is approaching the Target Implementation Date, but MO/BMR is not yet identified.', 'Provide the MO/BMR reference number or update the MO/BMR status.');
  }
  if (nearImplementation && missing(row['PO/BPR Ref. No.'])) {
    return issue(implementationDays, 'CNF is approaching the Target Implementation Date, but PO/BPR is not yet identified.', 'Provide the PO/BPR reference number or update the PO/BPR status.');
  }
  if (nearImplementation && missing(row['Protocol No.'])) {
    return issue(implementationDays, 'CNF is approaching the Target Implementation Date, but Protocol is not yet identified.', 'Provide the Protocol number or update the Protocol status.');
  }
  if (nearBilling && ((!isNotApplicable_(row['Interim Status']) && missing(row['Interim No.'])) || missing(row['Report No.']))) {
    return issue(billingDays, 'CNF is approaching the Target Billing / Delivery Date, but Interim Report or Full Report is not yet identified.', 'Provide the Interim or Full Report number, or mark Interim as Not Applicable.');
  }
  if (valueOrNA_(row['Billing Status']) === 'Billable' &&
      (valueOrNA_(row['Interim Status']) === 'Signed' || valueOrNA_(row['Report Status']) === 'Signed') &&
      valueOrNA_(row['Billing Department Notified']) !== 'Yes') {
    return issue(billingDays, 'CNF is billable, but the Billing Department has not yet been notified.', 'Select Billing Department has been notified after notifying Billing.');
  }
  if (valueOrNA_(row['Report Status']) === 'Signed' &&
      missing(row['Endorsement Status']) &&
      !isNotApplicable_(row['Endorsement Status'])) {
    return issue(billingDays, 'Full Report is already signed, but Endorsement Report is not yet identified.', 'Provide the Endorsement Report or mark Endorsement Status as Not Applicable.');
  }
  return null;
}

function parseDateOnly_(value) {
  const text = valueOrNA_(value);
  if (text === 'NA') return null;
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  match = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) {
    return new Date(Number(match[3]), monthIndex_(match[2]), Number(match[1]));
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function getTodayManila_() {
  const parts = Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM-dd').split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function daysBetween_(fromDate, toDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((toDate.getTime() - fromDate.getTime()) / msPerDay);
}

function parsePrimaryKeyTime_(value) {
  const text = valueOrNA_(value);
  let match = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})(?:-(\d{1,3}))?$/);
  if (match) {
    return new Date(
      Number(match[3]),
      monthIndex_(match[2]),
      Number(match[1]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
      Number(match[7] || 0)
    ).getTime();
  }

  match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:-(\d{1,3}))?$/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
      Number(match[7] || 0)
    ).getTime();
  }

  const parsed = Date.parse(text);
  return isNaN(parsed) ? 0 : parsed;
}

function parseAuditTime_(value) {
  const text = valueOrNA_(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6])
    ).getTime();
  }
  const parsed = Date.parse(text);
  return isNaN(parsed) ? 0 : parsed;
}

function monthIndex_(monthText) {
  const key = String(monthText || '').slice(0, 3).toLowerCase();
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  return months[key] || 0;
}

function appendArchivedRows_(records, archivedBy, archivedAt, remarks) {
  if (!records.length) return;
  const rows = records.map(function (record) {
    const output = {};
    CNF_HEADERS.forEach(function (header) {
      output[header] = valueOrNA_(record[header]);
    });
    output['Archived By'] = archivedBy;
    output['Archived At'] = archivedAt;
    output['Archive Remarks'] = remarks;
    return ARCHIVED_HEADERS.map(function (header) { return valueOrNA_(output[header]); });
  });
  const sheet = getSheet_(SHEETS.ARCHIVED);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ARCHIVED_HEADERS.length).setValues(rows);
}

function clearDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
}

function getNextAnnualArchiveDate_() {
  const now = new Date();
  const year = Number(Utilities.formatDate(now, APP_TZ, 'yyyy'));
  const thisYearRun = new Date(Date.UTC(year, 11, 30, 16, 0, 0));
  if (now.getTime() < thisYearRun.getTime()) {
    return thisYearRun;
  }
  return new Date(Date.UTC(year + 1, 11, 30, 16, 0, 0));
}

function getNextEndorsementItemNo_(endorsementNo) {
  const rows = getSheetRecords_(SHEETS.ENDORSEMENT).rows.filter(function (row) {
    return isActiveRow_(row.data) && row.data['Endorsement No.'] === endorsementNo;
  });
  return rows.length + 1;
}

function findCNFNoByEndorsement_(endorsementNo) {
  const match = getActiveCNFRecords_().find(function (record) {
    return record['Endorsement No.'] === endorsementNo;
  });
  return match ? match['CNF No.'] : 'NA';
}

function findEndorsementTrace_(endorsementNo, cnfNo, product, productCode, endorsementStatus) {
  const normalizedEndorsement = valueOrNA_(endorsementNo);
  const normalizedCnf = valueOrNA_(cnfNo);
  const normalizedProduct = valueOrNA_(product);
  const normalizedCode = valueOrNA_(productCode);
  const match = getActiveCNFRecords_().find(function (record) {
    const endorsementMatch = normalizedEndorsement !== 'NA' && valueOrNA_(record['Endorsement No.']) === normalizedEndorsement;
    const cnfMatch = normalizedCnf !== 'NA' && valueOrNA_(record['CNF No.']) === normalizedCnf;
    const codeMatch = normalizedCode === 'NA' || valueOrNA_(record['Product Code']) === normalizedCode;
    const productMatch = normalizedProduct === 'NA' || valueOrNA_(record['Product Name / Project']) === normalizedProduct;
    return (endorsementMatch || cnfMatch) && codeMatch && productMatch;
  }) || getActiveCNFRecords_().find(function (record) {
    return normalizedEndorsement !== 'NA' && valueOrNA_(record['Endorsement No.']) === normalizedEndorsement;
  });

  return {
    cnfNo: normalizedCnf !== 'NA' ? normalizedCnf : (match ? valueOrNA_(match['CNF No.']) : 'NA'),
    product: normalizedProduct !== 'NA' ? normalizedProduct : (match ? valueOrNA_(match['Product Name / Project']) : 'NA'),
    productCode: normalizedCode !== 'NA' ? normalizedCode : (match ? valueOrNA_(match['Product Code']) : 'NA'),
    cnfCategorization: match ? valueOrNA_(match['CNF Categorization']) : 'NA',
    endorsementStatus: valueOrNA_(endorsementStatus) !== 'NA' ? valueOrNA_(endorsementStatus) : (match ? valueOrNA_(match['Endorsement Status']) : 'NA')
  };
}

function findCNFTraceForEndorsementRow_(row, cnfRows) {
  const rows = cnfRows || getActiveCNFRecords_();
  const endorsementNo = valueOrNA_(row['Endorsement No.']);
  const cnfNo = valueOrNA_(row['CNF No.']);
  const productCode = valueOrNA_(row['Product Code']);
  const product = valueOrNA_(row.Product);
  const match = rows.find(function (record) {
    const endorsementMatch = endorsementNo !== 'NA' && valueOrNA_(record['Endorsement No.']) === endorsementNo;
    const cnfMatch = cnfNo !== 'NA' && valueOrNA_(record['CNF No.']) === cnfNo;
    const codeMatch = productCode === 'NA' || valueOrNA_(record['Product Code']) === productCode;
    const productMatch = product === 'NA' || valueOrNA_(record['Product Name / Project']) === product;
    return (endorsementMatch || cnfMatch) && codeMatch && productMatch;
  }) || rows.find(function (record) {
    return endorsementNo !== 'NA' && valueOrNA_(record['Endorsement No.']) === endorsementNo;
  });
  return {
    cnfCategorization: match ? valueOrNA_(match['CNF Categorization']) : valueOrNA_(row['CNF Categorization']),
    client: match ? valueOrNA_(match.Client) : 'NA'
  };
}

function backfillEndorsementTrace_() {
  const tracker = getSheetRecords_(SHEETS.ENDORSEMENT);
  tracker.rows.forEach(function (row) {
    const record = row.data;
    if (!isActiveRow_(record)) return;
    const needsTrace = valueOrNA_(record.Product) === 'NA' ||
      valueOrNA_(record['Product Code']) === 'NA' ||
      valueOrNA_(record['CNF Categorization']) === 'NA' ||
      valueOrNA_(record['Endorsement Status']) === 'NA';
    if (!needsTrace) return;
    const trace = findEndorsementTrace_(
      record['Endorsement No.'],
      record['CNF No.'],
      record.Product,
      record['Product Code'],
      record['Endorsement Status']
    );
    record['CNF No.'] = trace.cnfNo;
    record.Product = trace.product;
    record['Product Code'] = trace.productCode;
    record['CNF Categorization'] = trace.cnfCategorization;
    record['Endorsement Status'] = trace.endorsementStatus;
    writeRecordToRow_(SHEETS.ENDORSEMENT, row.rowIndex, ENDORSEMENT_HEADERS, record);
  });
}

function normalizeEndorsementItemsPayload_(payload) {
  const supplied = Array.isArray(payload.items) && payload.items.length ? payload.items : [payload || {}];
  return supplied.map(function (item, index) {
    const normalized = Object.assign({}, item || {});
    normalized.endorsementItem = valueOrNA_(normalized.endorsementItem) === 'NA'
      ? 'Endorsement Item ' + (index + 1)
      : valueOrNA_(normalized.endorsementItem);
    return normalized;
  });
}

function buildEndorsementRecordFromPayload_(payload, existing, options) {
  const item = payload || {};
  const base = existing ? Object.assign({}, existing) : {};
  const opts = options || {};
  ENDORSEMENT_HEADERS.forEach(function (header) {
    if (!Object.prototype.hasOwnProperty.call(base, header)) {
      base[header] = 'NA';
    }
  });

  base['Endorsement ID'] = opts.id || base['Endorsement ID'] || generateEndorsementId_(getExistingEndorsementIds_());
  base['CNF No.'] = valueOrNA_(opts.cnfNo);
  base.Product = valueOrNA_(opts.product || item.product || base.Product);
  base['Product Code'] = valueOrNA_(opts.productCode || item.productCode || base['Product Code']);
  base['CNF Categorization'] = valueOrNA_(opts.cnfCategorization || item.cnfCategorization || base['CNF Categorization']);
  base['Endorsement No.'] = valueOrNA_(opts.endorsementNo);
  base['Endorsement Status'] = valueOrNA_(opts.endorsementStatus || item.endorsementStatus || base['Endorsement Status']);
  base['Item No.'] = valueOrNA_(opts.itemNo);
  base['Endorsement Item'] = valueOrNA_(item.endorsementItem || ('Endorsement Item ' + valueOrNA_(opts.itemNo)));
  base['Target Implementation Date'] = valueOrNA_(item.targetImplementationDate);
  base['Implemented By'] = valueOrNA_(item.implementedBy);
  base['Implementation Status'] = valueOrNA_(item.implementationStatus || 'Planned');
  base['Target Verification Date'] = valueOrNA_(item.targetVerificationDate);
  base['Verified By Validation'] = valueOrNA_(item.verifiedByValidation);
  base['Validation Verification Date'] = valueOrNA_(item.validationVerificationDate);
  base['Verified By GMP'] = valueOrNA_(item.verifiedByGmp);
  base['GMP Verification Date'] = valueOrNA_(item.gmpVerificationDate);
  base['Closure Status'] = isEndorsementItemClosed_(base) ? 'Closed' : 'Open';

  if (opts.isCreate) {
    base['Created By'] = opts.user;
    base['Created At'] = opts.now;
  } else {
    base['Created By'] = valueOrNA_(base['Created By']);
    base['Created At'] = valueOrNA_(base['Created At']);
  }

  base['Updated By'] = opts.user;
  base['Updated At'] = opts.now;
  base['Is Archived'] = opts.isCreate ? 'No' : (valueOrNA_(base['Is Archived']) === 'NA' ? 'No' : base['Is Archived']);
  base['Is Active'] = opts.isCreate ? 'Yes' : (valueOrNA_(base['Is Active']) === 'NA' ? 'Yes' : base['Is Active']);
  return base;
}

function isEndorsementItemClosed_(record) {
  const status = valueOrNA_(record['Implementation Status']);
  if (status === 'Cancelled' || status === 'NA') {
    return true;
  }
  if (status !== 'Done') {
    return false;
  }
  return valueOrNA_(record['Verified By Validation']) !== 'NA' &&
    valueOrNA_(record['Validation Verification Date']) !== 'NA' &&
    valueOrNA_(record['Verified By GMP']) !== 'NA' &&
    valueOrNA_(record['GMP Verification Date']) !== 'NA';
}
