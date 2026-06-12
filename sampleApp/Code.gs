const APP_TZ = 'Asia/Manila';
const PROJECT_TRACKER_SPREADSHEET_ID = '1bBTkZXaPjx7kWY2ZELw0wy6B2MfSslgpN1vrlypYrLg';
const PROJECT_TRACKER_SPREADSHEET_NAME = 'Project Tracker';
const DB_PROPERTY_KEY = 'PROJECT_TRACKER_SPREADSHEET_ID';
const DB_SETUP_VERSION_KEY = 'PROJECT_TRACKER_SETUP_VERSION';
const DB_SETUP_VERSION = '2026-06-12-v3';

const SHEETS = {
  PROJECTS: 'PROJECTS',
  SUPPORT: 'SUPPORT_ACTIVITIES',
  NOTIFICATIONS: 'NOTIFICATIONS',
  AUDIT: 'AUDIT_TRAIL',
  REGISTRY: 'REGISTRY',
  ADMIN_MESSAGES: 'ADMIN_MESSAGES'
};

const SHEET_ALIASES = {
  PROJECTS: ['PROJECTS', 'Projects', 'projects', 'Project Database', 'PROJECT_DATABASE'],
  SUPPORT_ACTIVITIES: ['SUPPORT_ACTIVITIES', 'Support Activities', 'support_activities', 'Support Activity Database'],
  NOTIFICATIONS: ['NOTIFICATIONS', 'Notifications', 'notifications'],
  AUDIT_TRAIL: ['AUDIT_TRAIL', 'Audit Trail', 'audit_trail', 'AuditTrail', 'audit_logs'],
  REGISTRY: ['REGISTRY', 'Registry', 'registry', 'Registries'],
  ADMIN_MESSAGES: ['ADMIN_MESSAGES', 'Admin Messages', 'admin_messages', 'Messages to Admin']
};

const PRIMARY_KEY = 'Record ID';

const PROJECT_HEADERS = [
  PRIMARY_KEY,
  'project_id',
  'project_owner',
  'activity_type',
  'client_name',
  'so_no',
  'fg_code',
  'product_name',
  'batch_instance_id',
  'unique_batch',
  'mo_instance_id',
  'mo_control_no',
  'po_instance_id',
  'po_control_no',
  'fg_month',
  'business_unit',
  'updatedDocsVer',
  'cnf_reference',
  'qrmr_ref_no',
  'change_description',
  'cnf_status',
  'client_approval_target_date',
  'remarks',
  'cnf_entries_json',
  'manufacturing_start_week',
  'mo_bmr_po_submission_status',
  'mo_bmr_po_target_date',
  'mo_bmr_po_activation_status',
  'mo_bmr_po_activation_date',
  'protocol_no',
  'protocol_Status',
  'protocol_target_date',
  'Val_Activity',
  'Val_Stability',
  'Val_Batch_Seq_No',
  'Val_Strategy',
  'Val_Strategy_remarks',
  'val_report_no',
  'Report_Sub_Status',
  'Report_target_Date',
  'ar_availability_date',
  'packaging_schedule',
  'final_status',
  'final_status_other',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At',
  'Is Active'
];

const SUPPORT_HEADERS = [
  'activity_id',
  'project_id',
  'activity_kind',
  'Department',
  'Material',
  'Line',
  'Bulk',
  'Machinability_Protocol',
  'Machinability_Protocol_Status',
  'Machinability_Report',
  'Machinability_Report_Status',
  'Product_User',
  'Principal',
  'Product',
  'Target_Date',
  'Planning_Schedule',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At',
  'Is Active'
];

const NOTIFICATION_HEADERS = [
  'notification_id',
  'project_id',
  'record_id',
  'fg_month',
  'severity',
  'title',
  'message',
  'status',
  'Created At'
];

const AUDIT_HEADERS = [
  'Audit ID',
  'Timestamp',
  'User',
  'Module',
  'Action',
  'Record ID',
  'project_id',
  'Field Name',
  'Old Value',
  'New Value',
  'Remarks'
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

const ADMIN_MESSAGE_HEADERS = [
  'message_id',
  'Timestamp',
  'User',
  'Category',
  'Subject',
  'Message',
  'Status'
];

const DEFAULT_REGISTRY = {
  activity_type: ['PILOT/TRIAL', 'TRC', 'VAL/VER'],
  business_unit: ['CM', 'BM', 'PL'],
  cnf_status: ['CNF Creation', 'Routing', 'Client Approval', 'Approved'],
  updatedDocsVer: ['Yes', 'No'],
  yn_status: ['Y', 'N'],
  Val_Activity: ['VAL', 'VER', 'CHAR', 'COMML'],
  Val_Stability: ['Yes', 'No'],
  Val_Batch_Seq_No: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  Val_Strategy: ['Concurrent', 'Prospective'],
  Report_Sub_Status: ['In-process', 'Routing', 'Client Approval', 'Approved'],
  final_status: ['OPEN', 'CLOSED', 'CANCELLED', 'Others'],
  department: ['DPM', 'LPM', 'DPP', 'LPP', 'CO', 'COS', 'TOP', 'STEROIDS', 'CEPHA'],
  doc_status: ['In-process', 'Routing', 'Client Approval', 'Approved']
};

const NA_VALUE = 'N/A';
const AM_FIELDS = [
  'project_owner', 'activity_type', 'client_name', 'so_no', 'fg_code', 'product_name',
  'unique_batch', 'mo_control_no', 'po_control_no', 'fg_month', 'business_unit', 'updatedDocsVer'
];
const PP_FIELDS = ['manufacturing_start_week', 'packaging_schedule', 'final_status'];
const TSD_FIELDS = [
  'mo_bmr_po_submission_status', 'mo_bmr_po_target_date',
  'mo_bmr_po_activation_status', 'mo_bmr_po_activation_date'
];
const VAL_FIELDS = [
  'protocol_no', 'protocol_Status', 'protocol_target_date', 'Val_Activity', 'Val_Stability',
  'Val_Batch_Seq_No', 'Val_Strategy', 'Val_Strategy_remarks', 'val_report_no',
  'Report_Sub_Status', 'Report_target_Date'
];
const QC_FIELDS = ['ar_availability_date'];
const PRIORITY_MILESTONE_FIELDS = [
  'cnf_status', 'client_approval_target_date', 'protocol_no', 'protocol_Status',
  'Val_Activity', 'Val_Strategy', 'manufacturing_start_week', 'ar_availability_date',
  'packaging_schedule', 'Report_target_Date', 'Report_Sub_Status', 'final_status'
];
const MONTH_HEADERS = { fg_month: true };
const DATETIME_HEADERS = {
  Timestamp: true,
  'Created At': true,
  'Updated At': true
};
const PRIORITY_ACTION_LABELS = {
  cnf_status: 'Complete CNF Status / Client Approval',
  client_approval_target_date: 'Set Client Approval Target Date',
  protocol_no: 'Enter Validation Protocol No.',
  protocol_Status: 'Complete Protocol Status',
  Val_Activity: 'Select Validation Activity',
  Val_Strategy: 'Select Validation Strategy',
  manufacturing_start_week: 'Set Manufacturing Start Week',
  ar_availability_date: 'Set AR Availability Date',
  packaging_schedule: 'Set Packaging Schedule',
  Report_target_Date: 'Set Validation Report Target Date',
  Report_Sub_Status: 'Complete Validation Report Status',
  final_status: 'Complete Final Status'
};

const _cache = { initialized: false, auditQueue: [] };

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Project Tracker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  const allowed = { Style: true, Script: true };
  const name = String(filename || '').trim();
  if (!name) return '';
  if (!allowed[name]) {
    throw new Error('Invalid include "' + name + '". Allowed includes: Style, Script.');
  }
  try {
    return HtmlService.createHtmlOutputFromFile(name).getContent();
  } catch (error) {
    throw new Error('Unable to include HTML file "' + name + '.html". Confirm that the file exists in this Apps Script project. ' + errorMessage_(error));
  }
}

function initializeDatabase() {
  if (_cache.initialized) {
    const cachedSs = getSpreadsheet_();
    return {
      success: true,
      cached: true,
      spreadsheetId: cachedSs.getId(),
      spreadsheetName: cachedSs.getName(),
      spreadsheetUrl: cachedSs.getUrl(),
      sheetBindings: getSheetBindings_(cachedSs),
      timezone: APP_TZ
    };
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = getSpreadsheet_();
    ensureSheet_(ss, SHEETS.PROJECTS, PROJECT_HEADERS);
    ensureSheet_(ss, SHEETS.SUPPORT, SUPPORT_HEADERS);
    ensureSheet_(ss, SHEETS.NOTIFICATIONS, NOTIFICATION_HEADERS);
    ensureSheet_(ss, SHEETS.AUDIT, AUDIT_HEADERS);
    ensureSheet_(ss, SHEETS.REGISTRY, REGISTRY_HEADERS);
    ensureSheet_(ss, SHEETS.ADMIN_MESSAGES, ADMIN_MESSAGE_HEADERS);
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty(DB_SETUP_VERSION_KEY) !== DB_SETUP_VERSION || getRegistryRows_().length === 0) {
      seedRegistry_();
      props.setProperty(DB_SETUP_VERSION_KEY, DB_SETUP_VERSION);
      SpreadsheetApp.flush();
    }
    _cache.initialized = true;
    try {
      backfillSupportProjectIds_();
    } catch (error) {
      _cache.initialized = false;
      throw error;
    }
    return {
      success: true,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      sheetBindings: getSheetBindings_(ss),
      timezone: APP_TZ
    };
  } finally {
    lock.releaseLock();
  }
}

function getSheetData(sheetName) {
  const canonicalName = requireSheetName_(sheetName, 'getSheetData');
  initializeDatabase();
  const result = getSheetRecords_(canonicalName);
  let rows = result.rows.map(function (row) { return row.data; });
  if (canonicalName === SHEETS.PROJECTS || canonicalName === SHEETS.SUPPORT) {
    rows = rows.filter(isActiveRow_);
  }
  if (canonicalName === SHEETS.AUDIT) {
    rows.sort(function (a, b) {
      return parseAuditTime_(b.Timestamp) - parseAuditTime_(a.Timestamp);
    });
  }
  const safeRows = rows.map(sanitizeRecordForTransport_);
  return { headers: result.headers, rows: safeRows };
}

function getDatabaseData() {
  initializeDatabase();
  return {
    projects: getSheetRecords_(SHEETS.PROJECTS).rows.map(function (row) {
      return row.data;
    }).filter(isActiveRow_).map(sanitizeRecordForTransport_),
    support: getSheetRecords_(SHEETS.SUPPORT).rows.map(function (row) {
      return row.data;
    }).filter(isActiveRow_).map(sanitizeRecordForTransport_)
  };
}

function getArchivedData() {
  initializeDatabase();
  return {
    projects: getSheetRecords_(SHEETS.PROJECTS).rows.map(function (row) {
      return row.data;
    }).filter(function (row) {
      return !isActiveRow_(row);
    }).map(sanitizeRecordForTransport_),
    support: getSheetRecords_(SHEETS.SUPPORT).rows.map(function (row) {
      return row.data;
    }).filter(function (row) {
      return !isActiveRow_(row);
    }).map(sanitizeRecordForTransport_)
  };
}

function getSupportActivityByProjectId(projectId) {
  projectId = requireId_(projectId, 'project_id', 'getSupportActivityByProjectId');
  initializeDatabase();
  const match = getSheetRecords_(SHEETS.SUPPORT).rows.map(function (row) {
    return row.data;
  }).find(function (row) {
    return idsEqual_(row.project_id, projectId);
  });
  return match ? sanitizeRecordForTransport_(match) : null;
}

function getPagedSheetData(sheetName, options) {
  const canonicalName = requireSheetName_(sheetName, 'getPagedSheetData');
  initializeDatabase();
  const opts = options || {};
  const limit = Math.max(1, Math.min(Number(opts.limit || 100), 500));
  const offset = Math.max(0, Number(opts.offset || 0));
  const filters = opts.filters || {};
  const result = getSheetRecords_(canonicalName);
  let rows = result.rows.map(function (row) { return row.data; });

  if (canonicalName === SHEETS.PROJECTS) {
    rows = rows.filter(isActiveRow_).filter(function (row) {
      return projectRowMatchesFilters_(row, filters);
    });
  } else if (canonicalName === SHEETS.SUPPORT) {
    rows = rows.filter(isActiveRow_).filter(function (row) {
      return supportRowMatchesFilters_(row, filters);
    });
  } else if (canonicalName === SHEETS.AUDIT) {
    rows = rows.filter(function (row) {
      return auditRowMatchesFilters_(row, filters);
    });
    rows.sort(function (a, b) {
      return parseAuditTime_(b.Timestamp) - parseAuditTime_(a.Timestamp);
    });
  }

  const total = rows.length;
  const slice = rows.slice(offset, offset + limit).map(sanitizeRecordForTransport_);
  return {
    headers: result.headers,
    rows: slice,
    total: total,
    offset: offset,
    limit: limit,
    hasMore: offset + slice.length < total
  };
}

function getProjectById(projectId) {
  const requestedProjectId = requireId_(projectId, 'project_id', 'getProjectById');
  initializeDatabase();
  const allRows = getSheetRecords_(SHEETS.PROJECTS).rows.map(function (row) { return row.data; });
  const matchingRows = allRows.filter(function (row) {
    return idsEqual_(row.project_id, requestedProjectId);
  });
  const activeRows = matchingRows.filter(isActiveRow_);
  let rows = activeRows;
  if (!rows.length && matchingRows.length) {
    const latestUpdate = matchingRows.reduce(function (latest, row) {
      return Math.max(latest, parseAuditTime_(row['Updated At']));
    }, 0);
    rows = matchingRows.filter(function (row) {
      return parseAuditTime_(row['Updated At']) === latestUpdate;
    });
  }
  const project = buildProjectHierarchy_(rows);
  if (!project) return null;
  const terminal = rows.length > 0 && rows.every(function (row) {
    const status = valueOrNA_(row.final_status);
    return status === 'CLOSED' || status === 'CANCELLED';
  });
  project.read_only = activeRows.length === 0 || terminal;
  project.record_state = activeRows.length === 0 ? 'Archived' : terminal ? 'Historical' : 'Active';
  return project;
}

function getNextProjectId() {
  initializeDatabase();
  return { project_id: generateProjectId_() };
}

function getDatabaseDiagnostics() {
  initializeDatabase();
  const ss = getSpreadsheet_();
  const bindings = getSheetBindings_(ss);
  const counts = {};
  Object.keys(bindings).forEach(function (canonicalName) {
    counts[canonicalName] = getSheetRecords_(canonicalName).rows.length;
  });
  return {
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheetBindings: bindings,
    rowCounts: counts
  };
}

function saveProject(payload) {
  payload = requireObjectPayload_(payload, 'saveProject', 'project');
  initializeDatabase();
  const user = getActiveUser_();
  const now = nowStamp_();
  const projectId = valueOrNA_(payload.project_id) === 'NA'
    ? generateProjectId_()
    : String(payload.project_id).trim();
  const lines = flattenProjectPayload_(payload, projectId);
  if (!lines.length) throw new Error('At least one PO control line is required.');

  validateProjectLines_(lines);
  const sheet = getSheet_(SHEETS.PROJECTS);
  const headerMap = getHeaderMap_(SHEETS.PROJECTS);
  const saved = [];

  lines.forEach(function (line) {
    const recordId = generateRecordId_();
    const rowObj = {};
    PROJECT_HEADERS.forEach(function (header) {
      if (header === PRIMARY_KEY) rowObj[header] = recordId;
      else if (header === 'Created By') rowObj[header] = user;
      else if (header === 'Created At') rowObj[header] = now;
      else if (header === 'Updated By') rowObj[header] = user;
      else if (header === 'Updated At') rowObj[header] = now;
      else if (header === 'Is Active') rowObj[header] = 'TRUE';
      else rowObj[header] = normalizeProjectValue_(line[header]);
    });
    appendRowObject_(sheet, headerMap, rowObj);
    logAuditEntries_('Projects', 'CREATE', recordId, projectId, {}, rowObj, 'Project created');
    saved.push(rowObj);
  });

  refreshNotificationsForProject_(projectId);
  SpreadsheetApp.flush();
  const persisted = getSheetRecords_(SHEETS.PROJECTS).rows.map(function (row) { return row.data; }).filter(function (row) {
    return idsEqual_(row.project_id, projectId) && isActiveRow_(row);
  });
  if (persisted.length < saved.length) throw new Error('Project save verification failed. Expected ' + saved.length + ' row(s), found ' + persisted.length + '.');
  return { success: true, project_id: projectId, records: saved, persistedCount: persisted.length };
}

function updateProject(projectId, payload) {
  projectId = requireId_(projectId, 'project_id', 'updateProject');
  payload = requireObjectPayload_(payload, 'updateProject', 'project');
  initializeDatabase();
  const user = getActiveUser_();
  const now = nowStamp_();
  const existing = getActiveProjectRows_().filter(function (row) {
    return idsEqual_(row.project_id, projectId);
  });
  if (!existing.length) throw recordNotFoundError_('Project', 'project_id', projectId, SHEETS.PROJECTS);

  const lines = flattenProjectPayload_(payload, projectId);
  if (!lines.length) throw new Error('At least one PO control line is required.');
  validateProjectLines_(lines);

  const sheet = getSheet_(SHEETS.PROJECTS);
  const headerMap = getHeaderMap_(SHEETS.PROJECTS);
  const existingByKey = {};
  existing.forEach(function (row) {
    existingByKey[poLineKey_(row)] = row;
  });

  const incomingKeys = {};
  lines.forEach(function (line) {
    const key = poLineKeyFromLine_(line);
    incomingKeys[key] = true;
    const prior = existingByKey[key];
    if (prior) {
      const updates = {};
      PROJECT_HEADERS.forEach(function (header) {
        if (['Created By', 'Created At', PRIMARY_KEY, 'Is Active'].indexOf(header) !== -1) return;
        if (header === 'Updated By') updates[header] = user;
        else if (header === 'Updated At') updates[header] = now;
        else updates[header] = normalizeProjectValue_(line[header]);
      });
      updateRowObject_(sheet, headerMap, prior[PRIMARY_KEY], updates);
      logAuditDiff_('Projects', 'UPDATE', prior[PRIMARY_KEY], projectId, prior, Object.assign({}, prior, updates));
    } else {
      const recordId = generateRecordId_();
      const rowObj = {};
      PROJECT_HEADERS.forEach(function (header) {
        if (header === PRIMARY_KEY) rowObj[header] = recordId;
        else if (header === 'Created By') rowObj[header] = user;
        else if (header === 'Created At') rowObj[header] = now;
        else if (header === 'Updated By') rowObj[header] = user;
        else if (header === 'Updated At') rowObj[header] = now;
        else if (header === 'Is Active') rowObj[header] = 'TRUE';
        else rowObj[header] = normalizeProjectValue_(line[header]);
      });
      appendRowObject_(sheet, headerMap, rowObj);
      logAuditEntries_('Projects', 'CREATE', recordId, projectId, {}, rowObj, 'PO line added');
    }
  });

  existing.forEach(function (row) {
    const key = poLineKey_(row);
    if (!incomingKeys[key]) {
      updateRowObject_(sheet, headerMap, row[PRIMARY_KEY], {
        'Is Active': 'FALSE',
        'Updated By': user,
        'Updated At': now
      });
      logAuditEntries_('Projects', 'DELETE', row[PRIMARY_KEY], projectId, row, {}, 'PO line removed');
    }
  });

  refreshNotificationsForProject_(projectId);
  SpreadsheetApp.flush();
  const persisted = getActiveProjectRows_().filter(function (row) {
    return idsEqual_(row.project_id, projectId);
  });
  if (!persisted.length) throw new Error('Project update verification failed. No active rows were found after saving.');
  return { success: true, project_id: projectId, persistedCount: persisted.length };
}

function deleteProject(projectId) {
  projectId = requireId_(projectId, 'project_id', 'deleteProject');
  initializeDatabase();
  const user = getActiveUser_();
  const now = nowStamp_();
  const existing = getActiveProjectRows_().filter(function (row) {
    return idsEqual_(row.project_id, projectId);
  });
  if (!existing.length) throw recordNotFoundError_('Project', 'project_id', projectId, SHEETS.PROJECTS);
  const sheet = getSheet_(SHEETS.PROJECTS);
  const headerMap = getHeaderMap_(SHEETS.PROJECTS);
  existing.forEach(function (row) {
    updateRowObject_(sheet, headerMap, row[PRIMARY_KEY], {
      'Is Active': 'FALSE',
      'Updated By': user,
      'Updated At': now
    });
    logAuditEntries_('Projects', 'DELETE', row[PRIMARY_KEY], projectId, row, {}, 'Project archived');
  });
  SpreadsheetApp.flush();
  return { success: true };
}

function saveSupportActivity(payload) {
  payload = requireObjectPayload_(payload, 'saveSupportActivity', 'support activity');
  initializeDatabase();
  const user = getActiveUser_();
  const now = nowStamp_();
  const activityId = valueOrNA_(payload.activity_id) === 'NA'
    ? generateSupportId_()
    : String(payload.activity_id).trim();
  const sheet = getSheet_(SHEETS.SUPPORT);
  const headerMap = getHeaderMap_(SHEETS.SUPPORT);
  const existing = findRowByPrimary_(SHEETS.SUPPORT, 'activity_id', activityId);
  const supportProjectId = existing && valueOrNA_(existing.project_id) !== 'NA'
    ? String(existing.project_id).trim()
    : generateSupportProjectId_();

  const rowObj = {};
  SUPPORT_HEADERS.forEach(function (header) {
    if (header === 'activity_id') rowObj[header] = activityId;
    else if (header === 'project_id') rowObj[header] = supportProjectId;
    else if (header === 'Created By') rowObj[header] = existing ? existing['Created By'] : user;
    else if (header === 'Created At') rowObj[header] = existing ? existing['Created At'] : now;
    else if (header === 'Updated By') rowObj[header] = user;
    else if (header === 'Updated At') rowObj[header] = now;
    else if (header === 'Is Active') rowObj[header] = 'TRUE';
    else rowObj[header] = valueOrEmpty_(payload[header]);
  });

  if (existing) {
    updateRowObject_(sheet, headerMap, existing.activity_id, rowObj, 'activity_id');
    logAuditDiff_('Support Activities', 'UPDATE', activityId, valueOrNA_(rowObj.project_id), existing, rowObj);
  } else {
    appendRowObject_(sheet, headerMap, rowObj);
    logAuditEntries_('Support Activities', 'CREATE', activityId, valueOrNA_(rowObj.project_id), {}, rowObj, 'Support activity created');
  }
  SpreadsheetApp.flush();
  const persisted = findRowByPrimary_(SHEETS.SUPPORT, 'activity_id', activityId);
  if (!persisted) throw new Error('Support activity save verification failed.');
  return { success: true, activity_id: activityId, project_id: supportProjectId, record: persisted };
}

function deleteSupportActivity(activityId) {
  activityId = requireId_(activityId, 'activity_id', 'deleteSupportActivity');
  initializeDatabase();
  const user = getActiveUser_();
  const now = nowStamp_();
  const existing = findRowByPrimary_(SHEETS.SUPPORT, 'activity_id', activityId);
  if (!existing) throw recordNotFoundError_('Support activity', 'activity_id', activityId, SHEETS.SUPPORT);
  const sheet = getSheet_(SHEETS.SUPPORT);
  const headerMap = getHeaderMap_(SHEETS.SUPPORT);
  updateRowObject_(sheet, headerMap, activityId, {
    'Is Active': 'FALSE',
    'Updated By': user,
    'Updated At': now
  }, 'activity_id');
  logAuditEntries_('Support Activities', 'DELETE', activityId, valueOrNA_(existing.project_id), existing, {}, 'Support activity archived');
  SpreadsheetApp.flush();
  return { success: true };
}

function getDashboardData() {
  initializeDatabase();
  const rows = getActiveProjectRows_();
  const supportRows = getSheetRecords_(SHEETS.SUPPORT).rows.map(function (row) { return row.data; }).filter(isActiveRow_);
  const projects = {};
  const cnfStatusCounts = {
    'CNF Creation': 0,
    'Routing': 0,
    'Client Approval': 0,
    'Approved': 0
  };
  const finalStatusCounts = { OPEN: 0, CLOSED: 0, CANCELLED: 0, Others: 0 };
  const dueDateCounts = { overdue: 0, today: 0, within3: 0, within7: 0, within15: 0, within30: 0 };
  const pendingRoleCounts = { 'AM/BM/PL': 0, PP: 0, TSD: 0, VAL: 0, QC: 0 };
  let openCount = 0;
  let closedCount = 0;
  let pendingCnf = 0;
  let pendingReport = 0;
  let pendingProtocol = 0;
  const today = getTodayManila_();
  const worklist = [];
  const recentRecords = [];

  rows.forEach(function (row) {
    projects[row.project_id] = true;
    const finalStatus = valueOrNA_(row.final_status);
    const isOpen = isOpenFinalStatus_(finalStatus);
    if (isOpen) openCount += 1;
    else if (finalStatus === 'CLOSED') closedCount += 1;

    const cnfStatus = valueOrNA_(row.cnf_status);
    if (cnfStatusCounts[cnfStatus] !== undefined) cnfStatusCounts[cnfStatus] += 1;
    if (finalStatusCounts[finalStatus] !== undefined) finalStatusCounts[finalStatus] += 1;
    else if (finalStatus !== 'NA') finalStatusCounts.Others += 1;

    const fgDate = parseDateValue_(row.fg_month);
    const days = fgDate ? daysBetween_(today, fgDate) : null;
    if (isOpen && days !== null) {
      if (days < 0) dueDateCounts.overdue += 1;
      else if (days === 0) dueDateCounts.today += 1;
      else if (days <= 3) dueDateCounts.within3 += 1;
      else if (days <= 7) dueDateCounts.within7 += 1;
      else if (days <= 15) dueDateCounts.within15 += 1;
      else if (days <= 30) dueDateCounts.within30 += 1;
    }
    worklist.push(buildWorklistItem_(row));

    if (isOpen && cnfStatus !== 'Approved') pendingCnf += 1;
    if (isOpen && !isApprovedStatus_(row.protocol_Status)) pendingProtocol += 1;
    if (isOpen && !isApprovedStatus_(row.Report_Sub_Status)) pendingReport += 1;

    if (isOpen) {
      if (hasMissingFields_(row, AM_FIELDS)) pendingRoleCounts['AM/BM/PL'] += 1;
      if (hasMissingFields_(row, PP_FIELDS)) pendingRoleCounts.PP += 1;
      if (hasMissingFields_(row, TSD_FIELDS)) pendingRoleCounts.TSD += 1;
      if (hasMissingFields_(row, VAL_FIELDS)) pendingRoleCounts.VAL += 1;
      if (hasMissingFields_(row, QC_FIELDS)) pendingRoleCounts.QC += 1;
    }

    recentRecords.push({
      recordId: row[PRIMARY_KEY],
      project_id: row.project_id,
      client_name: row.client_name,
      product_name: row.product_name,
      cnf_reference: row.cnf_reference,
      cnf_status: row.cnf_status,
      final_status: row.final_status,
      fg_month: row.fg_month,
      updatedAt: row['Updated At']
    });
  });

  worklist.sort(function (a, b) {
    return a.priorityRank - b.priorityRank ||
      a.fgSort - b.fgSort ||
      b.incompleteCount - a.incompleteCount ||
      String(a.project_id).localeCompare(String(b.project_id));
  });

  recentRecords.sort(function (a, b) {
    return parseAuditTime_(b.updatedAt) - parseAuditTime_(a.updatedAt);
  });

  return {
    cards: {
      totalProjects: Object.keys(projects).length,
      totalRecords: rows.length,
      totalOpen: openCount,
      totalClosed: closedCount,
      overdue: dueDateCounts.overdue,
      dueWithin7: dueDateCounts.within7,
      pendingCnf: pendingCnf,
      pendingProtocol: pendingProtocol,
      pendingReport: pendingReport,
      pendingPP: pendingRoleCounts.PP,
      pendingTSD: pendingRoleCounts.TSD,
      pendingVAL: pendingRoleCounts.VAL,
      pendingQC: pendingRoleCounts.QC,
      pendingAM: pendingRoleCounts['AM/BM/PL']
    },
    cnfStatusCounts: cnfStatusCounts,
    finalStatusCounts: finalStatusCounts,
    dueDateCounts: dueDateCounts,
    pendingRoleCounts: pendingRoleCounts,
    worklist: worklist.slice(0, 100),
    recentRecords: recentRecords.slice(0, 10),
    monthlyTrend: buildMonthlyTrend_(rows),
    supportSummary: buildSupportSummary_(supportRows),
    recentSupportActivities: supportRows.sort(function (a, b) {
      return parseAuditTime_(b['Updated At']) - parseAuditTime_(a['Updated At']);
    }).slice(0, 8),
    generatedAt: nowStamp_()
  };
}

function buildSupportSummary_(rows) {
  const summary = { total: rows.length, TSD: 0, RnD: 0, overdue: 0, dueSoon: 0 };
  const today = getTodayManila_();
  rows.forEach(function (row) {
    const kind = valueOrNA_(row.activity_kind);
    if (kind === 'TSD') summary.TSD += 1;
    if (kind === 'RnD') summary.RnD += 1;
    const target = parseDateValue_(row.Target_Date);
    if (!target) return;
    const days = daysBetween_(today, target);
    if (days < 0) summary.overdue += 1;
    else if (days <= 14) summary.dueSoon += 1;
  });
  return summary;
}

function getNotifications() {
  initializeDatabase();
  refreshAllNotifications_();
  const rows = getSheetRecords_(SHEETS.NOTIFICATIONS).rows.map(function (r) { return r.data; });
  return rows.filter(function (row) {
    return valueOrNA_(row.status) === 'OPEN';
  }).sort(function (a, b) {
    return parseAuditTime_(b['Created At']) - parseAuditTime_(a['Created At']);
  });
}

function getRegistryValues(type) {
  initializeDatabase();
  const rows = getRegistryRows_().filter(function (row) {
    return row.Status === 'Active' && (!type || row['Registry Type'] === type);
  });
  return rows.map(function (row) { return row['Registry Value']; });
}

function getRegistryBundle() {
  initializeDatabase();
  const bundle = {};
  Object.keys(DEFAULT_REGISTRY).forEach(function (key) {
    bundle[key] = getRegistryValues(key);
    if (!bundle[key].length) bundle[key] = DEFAULT_REGISTRY[key].slice();
  });
  return bundle;
}

function saveRegistryValue(payload) {
  initializeDatabase();
  const type = String(payload.type || '').trim();
  const value = String(payload.value || '').trim();
  if (!type || !value) throw new Error('Registry type and value are required.');
  const user = getActiveUser_();
  const now = nowStamp_();
  const sheet = getSheet_(SHEETS.REGISTRY);
  const headerMap = getHeaderMap_(SHEETS.REGISTRY);
  const rows = getRegistryRows_();
  const duplicate = rows.some(function (row) {
    return row['Registry Type'] === type && row['Registry Value'] === value;
  });
  if (duplicate) throw new Error('Registry value already exists.');
  appendRowObject_(sheet, headerMap, {
    'Registry Type': type,
    'Registry Value': value,
    'Description': valueOrEmpty_(payload.description),
    'Status': 'Active',
    'Created By': user,
    'Created At': now,
    'Updated By': user,
    'Updated At': now
  });
  logAuditEntries_('Registry', 'CREATE', type + ':' + value, 'NA', {}, { type: type, value: value }, 'Registry value added');
  SpreadsheetApp.flush();
  return { success: true };
}

function submitAdminMessage(payload) {
  payload = requireObjectPayload_(payload, 'submitAdminMessage', 'message');
  initializeDatabase();
  const category = valueOrEmpty_(payload.category);
  const subject = valueOrEmpty_(payload.subject);
  const message = valueOrEmpty_(payload.message);
  if (!category) throw new Error('Select a message category.');
  if (!subject) throw new Error('Enter a subject.');
  if (!message) throw new Error('Enter your message.');

  const sheet = getSheet_(SHEETS.ADMIN_MESSAGES);
  appendRowObject_(sheet, getHeaderMap_(SHEETS.ADMIN_MESSAGES), {
    message_id: generateAdminMessageId_(),
    Timestamp: nowStamp_(),
    User: getActiveUser_(),
    Category: category,
    Subject: subject,
    Message: message,
    Status: 'NEW'
  });
  SpreadsheetApp.flush();
  return { success: true };
}

function logDataActivity(payload) {
  logAuditTrail(payload || {});
  return { success: true };
}

function logAuditTrail(payload) {
  initializeDatabase();
  const sheet = getSheet_(SHEETS.AUDIT);
  const headerMap = getHeaderMap_(SHEETS.AUDIT);
  appendRowObject_(sheet, headerMap, {
    'Audit ID': generateAuditId_(),
    'Timestamp': nowStamp_(),
    'User': getActiveUser_(),
    'Module': valueOrEmpty_(payload.module),
    'Action': valueOrEmpty_(payload.action),
    'Record ID': valueOrEmpty_(payload.recordId),
    'project_id': valueOrEmpty_(payload.projectId),
    'Field Name': valueOrEmpty_(payload.fieldName),
    'Old Value': sanitizeAuditValue_(payload.oldValue),
    'New Value': sanitizeAuditValue_(payload.newValue),
    'Remarks': valueOrEmpty_(payload.remarks)
  });
  SpreadsheetApp.flush();
  return { success: true };
}

function buildWorklistItem_(row) {
  const meta = getProjectPriority_(row);
  return {
    recordId: row[PRIMARY_KEY],
    project_id: row.project_id,
    product_name: row.product_name,
    client_name: row.client_name,
    po_control_no: row.po_control_no,
    fg_month: row.fg_month,
    cnf_status: row.cnf_status,
    final_status: row.final_status,
    daysRemaining: meta.daysRemaining === null ? NA_VALUE : meta.daysRemaining,
    severity: meta.severity,
    priorityRank: meta.rank,
    fgSort: meta.fgSort,
    incompleteCount: meta.incompleteCount,
    nextAction: meta.nextAction
  };
}

function getProjectPriority_(row) {
  const status = valueOrNA_(row.final_status);
  const fgDate = parseDateValue_(row.fg_month);
  const fgSort = fgDate ? fgDate.getTime() : Number.MAX_SAFE_INTEGER;
  if (status === 'CANCELLED') return { rank: 6, severity: 'cancelled', daysRemaining: null, fgSort: fgSort, incompleteCount: 0, nextAction: 'No active action' };
  if (status === 'CLOSED') return { rank: 5, severity: 'closed', daysRemaining: null, fgSort: fgSort, incompleteCount: 0, nextAction: 'No active action' };

  const today = getTodayManila_();
  const dueDates = [];
  if (fgDate) dueDates.push(fgDate);
  addPendingMilestoneDate_(dueDates, row.client_approval_target_date, row.cnf_status === 'Approved');
  addPendingMilestoneDate_(dueDates, row.protocol_target_date, isApprovedStatus_(row.protocol_Status));
  addPendingMilestoneDate_(dueDates, row.manufacturing_start_week, false);
  addPendingMilestoneDate_(dueDates, row.ar_availability_date, false);
  addPendingMilestoneDate_(dueDates, row.packaging_schedule, false);
  addPendingMilestoneDate_(dueDates, row.Report_target_Date, isApprovedStatus_(row.Report_Sub_Status));
  dueDates.sort(function (a, b) { return a.getTime() - b.getTime(); });
  const days = dueDates.length ? daysBetween_(today, dueDates[0]) : null;
  let rank = 4;
  let severity = 'low';
  if (days !== null && days < 0) { rank = 0; severity = 'overdue'; }
  else if (days !== null && days <= 15) { rank = 1; severity = 'critical'; }
  else if (days !== null && days <= 30) { rank = 2; severity = 'high'; }
  else if (days !== null && days <= 60) { rank = 3; severity = 'moderate'; }
  return {
    rank: rank,
    severity: severity,
    daysRemaining: days,
    fgSort: fgSort,
    incompleteCount: countIncompleteMilestones_(row),
    nextAction: getNextRequiredAction_(row)
  };
}

function addPendingMilestoneDate_(dates, value, complete) {
  if (complete) return;
  const date = parseDateValue_(value);
  if (date) dates.push(date);
}

function countIncompleteMilestones_(row) {
  return PRIORITY_MILESTONE_FIELDS.reduce(function (count, field) {
    if (field === 'cnf_status') return count + (row[field] === 'Approved' ? 0 : 1);
    if (field === 'protocol_Status' || field === 'Report_Sub_Status') {
      return count + (isApprovedStatus_(row[field]) ? 0 : 1);
    }
    return count + (isMissingProjectValue_(row[field]) ? 1 : 0);
  }, 0);
}

function getNextRequiredAction_(row) {
  for (let i = 0; i < PRIORITY_MILESTONE_FIELDS.length; i += 1) {
    const field = PRIORITY_MILESTONE_FIELDS[i];
    if (field === 'cnf_status' && row[field] !== 'Approved') return PRIORITY_ACTION_LABELS[field];
    if ((field === 'protocol_Status' || field === 'Report_Sub_Status') && !isApprovedStatus_(row[field])) {
      return PRIORITY_ACTION_LABELS[field];
    }
    if (field !== 'cnf_status' && field !== 'protocol_Status' && field !== 'Report_Sub_Status' &&
        isMissingProjectValue_(row[field])) {
      return PRIORITY_ACTION_LABELS[field];
    }
  }
  return 'Monitor project readiness';
}

function refreshAllNotifications_() {
  const rows = getActiveProjectRows_();
  const sheet = getSheet_(SHEETS.NOTIFICATIONS);
  clearSheetData_(sheet, NOTIFICATION_HEADERS);
  const headerMap = getHeaderMap_(SHEETS.NOTIFICATIONS);
  const today = getTodayManila_();
  rows.forEach(function (row) {
    const fgDate = parseDateValue_(row.fg_month);
    if (!fgDate) return;
    const days = daysBetween_(today, fgDate);
    const isOpen = ['OPEN', 'Others', 'NA', NA_VALUE].indexOf(valueOrNA_(row.final_status)) !== -1;
    if (!isOpen) return;
    if (days < 0) {
      appendNotification_(sheet, headerMap, row, 'critical', 'FG Month overdue', 'FG Month target has passed for PO ' + row.po_control_no);
    } else if (days <= 7) {
      appendNotification_(sheet, headerMap, row, 'high', 'FG Month due soon', 'FG Month is within 7 days for PO ' + row.po_control_no);
    }
    if (valueOrNA_(row.cnf_status) !== 'Approved' && days <= 14) {
      appendNotification_(sheet, headerMap, row, 'medium', 'CNF approval pending', 'CNF status is not Approved for PO ' + row.po_control_no);
    }
  });
}

function refreshNotificationsForProject_(projectId) {
  refreshAllNotifications_();
}

function appendNotification_(sheet, headerMap, row, severity, title, message) {
  appendRowObject_(sheet, headerMap, {
    notification_id: generateNotificationId_(),
    project_id: row.project_id,
    record_id: row[PRIMARY_KEY],
    fg_month: row.fg_month,
    severity: severity,
    title: title,
    message: message,
    status: 'OPEN',
    'Created At': nowStamp_()
  });
}

function buildProjectHierarchy_(rows) {
  if (!rows.length) return null;
  const head = rows[0];
  const project = {
    project_id: head.project_id,
    project_owner: head.project_owner,
    activity_type: head.activity_type,
    client_name: head.client_name,
    so_no: head.so_no,
    fg_code: head.fg_code,
    product_name: head.product_name,
    batches: []
  };
  const batchMap = {};
  const moMaps = {};
  rows.forEach(function (row) {
    const batchKey = valueOrNA_(row.batch_instance_id) !== 'NA'
      ? row.batch_instance_id
      : valueOrNA_(row.unique_batch);
    if (!batchMap[batchKey]) {
      batchMap[batchKey] = {
        batch_instance_id: valueOrNA_(row.batch_instance_id) !== 'NA' ? row.batch_instance_id : generateHierarchyId_('BAT'),
        unique_batch: row.unique_batch,
        mo_controls: []
      };
      project.batches.push(batchMap[batchKey]);
      moMaps[batchKey] = {};
    }
    const moKey = valueOrNA_(row.mo_instance_id) !== 'NA'
      ? row.mo_instance_id
      : valueOrNA_(row.mo_control_no);
    let mo = moMaps[batchKey][moKey];
    if (!mo) {
      mo = {
        mo_instance_id: valueOrNA_(row.mo_instance_id) !== 'NA' ? row.mo_instance_id : generateHierarchyId_('MO'),
        mo_control_no: row.mo_control_no,
        po_controls: []
      };
      batchMap[batchKey].mo_controls.push(mo);
      moMaps[batchKey][moKey] = mo;
    }
    mo.po_controls.push(extractPoFields_(row));
  });
  return project;
}

function extractPoFields_(row) {
  const po = {};
  PROJECT_HEADERS.forEach(function (header) {
    if (['project_id', 'project_owner', 'activity_type', 'client_name', 'so_no', 'fg_code', 'product_name', 'batch_instance_id', 'unique_batch', 'mo_instance_id', 'mo_control_no'].indexOf(header) !== -1) return;
    if (header === PRIMARY_KEY) po.record_id = row[PRIMARY_KEY];
    else if (header.indexOf('Created') === 0 || header.indexOf('Updated') === 0 || header === 'Is Active') return;
    else po[header] = row[header];
  });
  po.cnf_entries = parseCnfEntries_(row);
  return po;
}

function flattenProjectPayload_(payload, projectId) {
  const lines = [];
  const head = {
    project_id: projectId,
    project_owner: payload.project_owner,
    activity_type: payload.activity_type,
    client_name: payload.client_name,
    so_no: payload.so_no,
    fg_code: payload.fg_code,
    product_name: payload.product_name
  };
  (payload.batches || []).forEach(function (batch) {
    (batch.mo_controls || []).forEach(function (mo) {
      (mo.po_controls || []).forEach(function (po) {
        const cnfEntries = normalizeCnfEntries_(po.cnf_entries, po);
        const firstCnf = cnfEntries[0];
        const line = Object.assign({}, head, {
          batch_instance_id: batch.batch_instance_id,
          unique_batch: batch.unique_batch,
          mo_instance_id: mo.mo_instance_id,
          mo_control_no: mo.mo_control_no
        }, po, firstCnf, {
          cnf_entries_json: JSON.stringify(cnfEntries)
        });
        delete line.cnf_entries;
        lines.push(line);
      });
    });
  });
  return lines;
}

function parseCnfEntries_(row) {
  const raw = String(row.cnf_entries_json || '').trim();
  if (raw && raw !== NA_VALUE) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return normalizeCnfEntries_(parsed, row);
    } catch (e) {
      // Fall back to the legacy single-CNF columns.
    }
  }
  return normalizeCnfEntries_([], row);
}

function normalizeCnfEntries_(entries, legacyRow) {
  const keys = [
    'cnf_reference', 'qrmr_ref_no', 'change_description',
    'cnf_status', 'client_approval_target_date', 'remarks'
  ];
  const source = Array.isArray(entries) && entries.length ? entries : [legacyRow || {}];
  return source.map(function (entry) {
    const normalized = {};
    keys.forEach(function (key) {
      normalized[key] = normalizeProjectValue_(entry[key]);
    });
    return normalized;
  });
}

function validateProjectLines_(lines) {
  if (!lines.length) throw new Error('At least one PO control line is required.');
}

function projectRowMatchesFilters_(row, filters) {
  const search = lower_(filters.search);
  if (search) {
    const blob = [
      row.project_id, row.project_owner, row.client_name, row.product_name,
      row.so_no, row.fg_code, row.unique_batch, row.mo_control_no, row.po_control_no,
      row.cnf_reference, row.final_status
    ].join(' ').toLowerCase();
    if (blob.indexOf(search) === -1) return false;
  }
  if (filters.owner && valueOrNA_(row.project_owner) !== filters.owner) return false;
  if (filters.activity_type && valueOrNA_(row.activity_type) !== filters.activity_type) return false;
  if (filters.final_status && valueOrNA_(row.final_status) !== filters.final_status) return false;
  if (filters.fg_month && !monthYearMatches_(row.fg_month, filters.fg_month, filters.fg_year)) return false;
  if (filters.fg_year && !monthYearMatches_(row.fg_month, filters.fg_month, filters.fg_year)) return false;
  return true;
}

function supportRowMatchesFilters_(row, filters) {
  const search = lower_(filters.search);
  if (search) {
    const blob = Object.keys(row).map(function (k) { return row[k]; }).join(' ').toLowerCase();
    if (blob.indexOf(search) === -1) return false;
  }
  if (filters.activity_kind && valueOrNA_(row.activity_kind) !== filters.activity_kind) return false;
  if (filters.department && valueOrNA_(row.Department) !== filters.department) return false;
  return true;
}

function auditRowMatchesFilters_(row, filters) {
  const search = lower_(filters.search);
  if (search) {
    const blob = Object.keys(row).map(function (k) { return row[k]; }).join(' ').toLowerCase();
    if (blob.indexOf(search) === -1) return false;
  }
  if (filters.module && valueOrNA_(row.Module) !== filters.module) return false;
  if (filters.action && valueOrNA_(row.Action) !== filters.action) return false;
  if (filters.user && lower_(row.User).indexOf(lower_(filters.user)) === -1) return false;
  if (filters.project_id && lower_(row.project_id).indexOf(lower_(filters.project_id)) === -1) return false;
  if (filters.startDate || filters.endDate) {
    if (!dateWithinRange_(row.Timestamp, filters.startDate, filters.endDate)) return false;
  }
  return true;
}

function logAuditDiff_(module, action, recordId, projectId, oldRow, newRow) {
  const skip = { 'Updated By': true, 'Updated At': true };
  Object.keys(newRow).forEach(function (field) {
    if (skip[field]) return;
    const oldVal = sanitizeAuditValue_(oldRow[field]);
    const newVal = sanitizeAuditValue_(newRow[field]);
    if (oldVal !== newVal) {
      logAuditTrail({
        module: module,
        action: action,
        recordId: recordId,
        projectId: projectId,
        fieldName: field,
        oldValue: oldVal,
        newValue: newVal,
        remarks: action + ' via Project Tracker'
      });
    }
  });
}

function logAuditEntries_(module, action, recordId, projectId, oldRow, newRow, remarks) {
  if (action === 'CREATE' || action === 'DELETE') {
    logAuditTrail({
      module: module,
      action: action,
      recordId: recordId,
      projectId: projectId,
      fieldName: 'ALL',
      oldValue: action === 'DELETE' ? JSON.stringify(oldRow) : '',
      newValue: action === 'CREATE' ? JSON.stringify(newRow) : '',
      remarks: remarks
    });
    return;
  }
  logAuditDiff_(module, action, recordId, projectId, oldRow, newRow);
}

function seedRegistry_() {
  const sheet = getSheet_(SHEETS.REGISTRY);
  const headerMap = getHeaderMap_(SHEETS.REGISTRY);
  const user = getActiveUser_();
  const now = nowStamp_();
  const existing = {};
  getRegistryRows_().forEach(function (row) {
    existing[row['Registry Type'] + '||' + row['Registry Value']] = true;
  });
  Object.keys(DEFAULT_REGISTRY).forEach(function (type) {
    DEFAULT_REGISTRY[type].forEach(function (value) {
      if (existing[type + '||' + value]) return;
      appendRowObject_(sheet, headerMap, {
        'Registry Type': type,
        'Registry Value': value,
        'Description': value,
        'Status': 'Active',
        'Created By': user,
        'Created At': now,
        'Updated By': user,
        'Updated At': now
      });
    });
  });
}

function requireObjectPayload_(payload, functionName, label) {
  if (!payload || Object.prototype.toString.call(payload) !== '[object Object]') {
    throw new Error(
      functionName + ' requires a ' + label + ' payload object. ' +
      'Call this function from the application UI or pass a valid object when testing.'
    );
  }
  return payload;
}

function requireId_(value, fieldName, functionName) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  if (!text || text.toUpperCase() === 'NA' || text.toUpperCase() === 'N/A') {
    throw new Error(functionName + ' requires a valid ' + fieldName + '.');
  }
  return text;
}

function idsEqual_(left, right) {
  return String(left === null || left === undefined ? '' : left).trim().toLowerCase() ===
    String(right === null || right === undefined ? '' : right).trim().toLowerCase();
}

function requireSheetName_(sheetName, functionName) {
  const canonical = canonicalSheetName_(sheetName);
  if (!canonical) {
    throw new Error(
      functionName + ' requires a valid sheet name. Allowed sheets: ' +
      Object.keys(SHEETS).map(function (key) { return SHEETS[key]; }).join(', ') + '.'
    );
  }
  return canonical;
}

function canonicalSheetName_(sheetName) {
  const key = normalizeName_(sheetName);
  if (!key) return '';
  const canonicalNames = Object.keys(SHEETS).map(function (name) { return SHEETS[name]; });
  for (let i = 0; i < canonicalNames.length; i += 1) {
    const canonical = canonicalNames[i];
    const aliases = sheetAliases_(canonical);
    if (aliases.some(function (alias) { return normalizeName_(alias) === key; })) {
      return canonical;
    }
  }
  return '';
}

function sheetAliases_(canonicalName) {
  return SHEET_ALIASES[canonicalName] || [canonicalName];
}

function resolveSheet_(ss, canonicalName, preferPopulated) {
  const accepted = {};
  sheetAliases_(canonicalName).forEach(function (name) {
    accepted[normalizeName_(name)] = true;
  });
  const candidates = ss.getSheets().filter(function (sheet) {
    return accepted[normalizeName_(sheet.getName())];
  });
  if (!candidates.length) return null;
  candidates.sort(function (a, b) {
    if (preferPopulated) {
      const rowDifference = b.getLastRow() - a.getLastRow();
      if (rowDifference) return rowDifference;
    }
    const aCanonical = normalizeName_(a.getName()) === normalizeName_(canonicalName) ? 0 : 1;
    const bCanonical = normalizeName_(b.getName()) === normalizeName_(canonicalName) ? 0 : 1;
    return aCanonical - bCanonical;
  });
  return candidates[0];
}

function expectedHeaders_(sheetName) {
  if (sheetName === SHEETS.PROJECTS) return PROJECT_HEADERS;
  if (sheetName === SHEETS.SUPPORT) return SUPPORT_HEADERS;
  if (sheetName === SHEETS.NOTIFICATIONS) return NOTIFICATION_HEADERS;
  if (sheetName === SHEETS.AUDIT) return AUDIT_HEADERS;
  if (sheetName === SHEETS.REGISTRY) return REGISTRY_HEADERS;
  if (sheetName === SHEETS.ADMIN_MESSAGES) return ADMIN_MESSAGE_HEADERS;
  return [];
}

function canonicalHeader_(header, sheetName) {
  const text = String(header || '').trim();
  if (!text) return '';
  const key = normalizeName_(text);
  const expected = expectedHeaders_(sheetName);
  for (let i = 0; i < expected.length; i += 1) {
    if (normalizeName_(expected[i]) === key) return expected[i];
  }
  return text;
}

function normalizeName_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function errorMessage_(error) {
  if (error && error.message) return error.message;
  return String(error || 'Unknown error');
}

function getSheetBindings_(ss) {
  const bindings = {};
  Object.keys(SHEETS).forEach(function (key) {
    const canonicalName = SHEETS[key];
    const sheet = resolveSheet_(ss, canonicalName, true);
    bindings[canonicalName] = sheet ? sheet.getName() : '';
  });
  return bindings;
}

function recordNotFoundError_(label, fieldName, value, sheetName) {
  const sheet = getSheet_(sheetName);
  return new Error(
    label + ' not found for ' + fieldName + ' "' + value + '" in sheet "' + sheet.getName() +
    '". Refresh the UI and confirm the ID exists and is active.'
  );
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(DB_PROPERTY_KEY, PROJECT_TRACKER_SPREADSHEET_ID);
  try {
    const ss = SpreadsheetApp.openById(PROJECT_TRACKER_SPREADSHEET_ID);
    if (ss.getId() !== PROJECT_TRACKER_SPREADSHEET_ID) {
      throw new Error('Connected spreadsheet ID does not match the configured Project Tracker database.');
    }
    return ss;
  } catch (error) {
    throw new Error(
      'Unable to open Google Sheet "' + PROJECT_TRACKER_SPREADSHEET_NAME +
      '" (' + PROJECT_TRACKER_SPREADSHEET_ID + '). Confirm the Apps Script deployment account has edit access. ' +
      (error && error.message ? error.message : error)
    );
  }
}

function ensureSheet_(ss, sheetName, headers) {
  let sheet = resolveSheet_(ss, sheetName, true);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const existingKeys = {};
    existing.forEach(function (header) {
      existingKeys[normalizeName_(header)] = true;
    });
    headers.forEach(function (header) {
      if (!existingKeys[normalizeName_(header)]) {
        existing.push(header);
        sheet.getRange(1, existing.length).setValue(header);
        existingKeys[normalizeName_(header)] = true;
      }
    });
    alignSheetHeaders_(sheet, headers);
  }
  return sheet;
}

function alignSheetHeaders_(sheet, expectedHeaders) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const byName = {};
  current.forEach(function (header, index) {
    const key = normalizeName_(header);
    if (!key || byName[key]) return;
    byName[key] = { header: String(header || '').trim(), index: index };
  });
  const reordered = expectedHeaders.map(function (header) {
    const match = byName[normalizeName_(header)];
    return match ? match.header : header;
  });
  const extras = current.filter(function (header) {
    const key = normalizeName_(header);
    return key && !expectedHeaders.some(function (expected) {
      return normalizeName_(expected) === key;
    });
  }).map(function (header) { return String(header || '').trim(); }).filter(Boolean);
  const finalHeaders = reordered.concat(extras);
  if (finalHeaders.length === current.length &&
    finalHeaders.every(function (header, index) {
      return normalizeName_(header) === normalizeName_(current[index]);
    })) {
    return;
  }
  if (sheet.getLastRow() > 1) {
    const dataRowCount = sheet.getLastRow() - 1;
    const dataValues = sheet.getRange(2, 1, dataRowCount, lastCol).getValues();
    const reorderedRows = dataValues.map(function (row) {
      const mapped = {};
      current.forEach(function (header, index) {
        const key = normalizeName_(header);
        if (!key) return;
        mapped[key] = row[index];
      });
      const nextRow = finalHeaders.map(function (header) {
        const value = mapped[normalizeName_(header)];
        return value === undefined ? '' : value;
      });
      while (nextRow.length < finalHeaders.length) nextRow.push('');
      return nextRow;
    });
    sheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
    if (reorderedRows.length) {
      sheet.getRange(2, 1, reorderedRows.length, finalHeaders.length).setValues(reorderedRows);
    }
    if (lastCol > finalHeaders.length) {
      sheet.deleteColumns(finalHeaders.length + 1, lastCol - finalHeaders.length);
    }
  } else {
    sheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
  }
  sheet.setFrozenRows(1);
}

function getSheet_(sheetName) {
  const canonicalName = requireSheetName_(sheetName, 'getSheet_');
  const ss = getSpreadsheet_();
  const sheet = resolveSheet_(ss, canonicalName, true);
  if (!sheet) {
    const available = ss.getSheets().map(function (item) { return item.getName(); }).join(', ');
    throw new Error(
      'Required sheet "' + canonicalName + '" was not found. Accepted names: ' +
      sheetAliases_(canonicalName).join(', ') + '. Available sheets: ' + (available || '(none)') + '.'
    );
  }
  return sheet;
}

function getSheetRecords_(sheetName) {
  const canonicalName = requireSheetName_(sheetName, 'getSheetRecords_');
  const sheet = getSheet_(canonicalName);
  const headers = getHeaders_(sheet, canonicalName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !headers.length) return { headers: headers, rows: [] };
  const numRows = lastRow - 1;
  const numCols = headers.length;
  const values = sheet.getRange(2, 1, numRows, numCols).getValues();
  const rows = values.map(function (valuesRow, index) {
    return {
      rowNumber: index + 2,
      data: rowToObject_(headers, valuesRow)
    };
  }).filter(function (row) {
    return rowHasData_(row.data);
  });
  return { headers: headers, rows: rows };
}

function rowToObject_(headers, valuesRow) {
  const data = {};
  headers.forEach(function (header, colIndex) {
    if (!header) return;
    data[header] = formatSheetValue_(valuesRow[colIndex], header);
  });
  return data;
}

function formatSheetValue_(value, header) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    if (MONTH_HEADERS[header]) {
      return Utilities.formatDate(value, APP_TZ, 'yyyy-MM');
    }
    if (DATETIME_HEADERS[header]) {
      return Utilities.formatDate(value, APP_TZ, 'yyyy-MM-dd HH:mm:ss');
    }
    return Utilities.formatDate(value, APP_TZ, 'yyyy-MM-dd');
  }
  if (value === null || value === undefined) return '';
  return value;
}

function sanitizeRecordForTransport_(row) {
  const safe = {};
  Object.keys(row || {}).forEach(function (key) {
    safe[key] = sanitizeTransportValue_(row[key], key);
  });
  return safe;
}

function sanitizeTransportValue_(value, header) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return isNaN(value.getTime()) ? '' : formatSheetValue_(value, header);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return isNaN(value) ? '' : value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }
  return String(value);
}

function rowHasData_(row) {
  return Object.keys(row).some(function (key) {
    const value = row[key];
    return value !== '' && value !== null && value !== undefined;
  });
}

function getHeaders_(sheet, sheetName) {
  if (!sheet || typeof sheet.getLastColumn !== 'function') {
    throw new Error('Cannot read headers because the requested Google Sheet tab is unavailable.');
  }
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return canonicalHeader_(h, sheetName);
  });
}

function getHeaderMap_(sheetName) {
  const canonicalName = requireSheetName_(sheetName, 'getHeaderMap_');
  const headers = getHeaders_(getSheet_(canonicalName), canonicalName);
  const map = {};
  headers.forEach(function (header, index) {
    if (header) map[header] = index + 1;
  });
  return map;
}

function appendRowObject_(sheet, headerMap, rowObj) {
  if (!sheet || typeof sheet.appendRow !== 'function') {
    throw new Error('Cannot append data because the target Google Sheet tab is unavailable.');
  }
  if (!Object.keys(headerMap || {}).length) {
    throw new Error('Cannot append data because the target sheet has no recognized headers.');
  }
  const maxCol = Math.max.apply(null, Object.keys(headerMap).map(function (k) { return headerMap[k]; }));
  const row = new Array(maxCol).fill('');
  Object.keys(rowObj).forEach(function (key) {
    if (headerMap[key]) row[headerMap[key] - 1] = rowObj[key];
  });
  sheet.appendRow(row);
}

function updateRowObject_(sheet, headerMap, primaryValue, updates, primaryField) {
  const field = primaryField || PRIMARY_KEY;
  requireId_(primaryValue, field, 'updateRowObject_');
  if (!sheet || typeof sheet.getName !== 'function') {
    throw new Error('Cannot update data because the target Google Sheet tab is unavailable.');
  }
  const records = getSheetRecords_(sheet.getName());
  const match = records.rows.find(function (item) {
    return idsEqual_(item.data[field], primaryValue);
  });
  if (!match) {
    throw new Error(
      'Record not found for ' + field + ' "' + primaryValue + '" in sheet "' + sheet.getName() + '".'
    );
  }
  Object.keys(updates).forEach(function (key) {
    if (!headerMap[key]) return;
    sheet.getRange(match.rowNumber, headerMap[key]).setValue(updates[key]);
  });
}

function findRowByPrimary_(sheetName, primaryField, primaryValue) {
  const records = getSheetRecords_(sheetName);
  const match = records.rows.find(function (item) {
    return idsEqual_(item.data[primaryField], primaryValue);
  });
  return match ? match.data : null;
}

function clearSheetData_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
}

function getRegistryRows_() {
  return getSheetRecords_(SHEETS.REGISTRY).rows.map(function (r) { return r.data; });
}

function getActiveProjectRows_() {
  return getSheetRecords_(SHEETS.PROJECTS).rows.map(function (r) { return r.data; }).filter(isActiveRow_);
}

function isActiveRow_(row) {
  const flag = row['Is Active'];
  return flag === true || String(flag).toUpperCase() === 'TRUE' || valueOrNA_(flag) === 'NA';
}

function isApprovedStatus_(value) {
  return valueOrNA_(value) === 'Approved';
}

function poLineKey_(row) {
  return valueOrNA_(row[PRIMARY_KEY]) !== 'NA'
    ? 'record:' + row[PRIMARY_KEY]
    : valueOrNA_(row.po_instance_id) !== 'NA'
      ? 'po:' + row.po_instance_id
      : [row.unique_batch, row.mo_control_no, row.po_control_no].map(valueOrNA_).join('||');
}

function poLineKeyFromLine_(line) {
  return valueOrNA_(line.record_id) !== 'NA'
    ? 'record:' + line.record_id
    : valueOrNA_(line.po_instance_id) !== 'NA'
      ? 'po:' + line.po_instance_id
      : [line.unique_batch, line.mo_control_no, line.po_control_no].map(valueOrNA_).join('||');
}

function generateProjectId_() {
  const year = Utilities.formatDate(new Date(), APP_TZ, 'yyyy');
  const prefix = 'PROJ-' + year + '-';
  let max = 0;
  getSheetRecords_(SHEETS.PROJECTS).rows.forEach(function (item) {
    const id = valueOrNA_(item.data.project_id);
    if (id.indexOf(prefix) !== 0) return;
    const num = parseInt(id.slice(prefix.length), 10);
    if (!isNaN(num) && num > max) max = num;
  });
  return prefix + String(max + 1).padStart(3, '0');
}

function generateSupportProjectId_() {
  const year = Utilities.formatDate(new Date(), APP_TZ, 'yyyy');
  const prefix = 'SPROJ-' + year + '-';
  let max = 0;
  getSheetRecords_(SHEETS.SUPPORT).rows.forEach(function (item) {
    const id = valueOrNA_(item.data.project_id);
    if (id.indexOf(prefix) !== 0) return;
    const num = parseInt(id.slice(prefix.length), 10);
    if (!isNaN(num) && num > max) max = num;
  });
  return prefix + String(max + 1).padStart(3, '0');
}

function backfillSupportProjectIds_() {
  const result = getSheetRecords_(SHEETS.SUPPORT);
  const missing = result.rows.filter(function (item) {
    return valueOrNA_(item.data.project_id) === 'NA';
  });
  if (!missing.length) return 0;

  const sheet = getSheet_(SHEETS.SUPPORT);
  const headerMap = getHeaderMap_(SHEETS.SUPPORT);
  const user = getActiveUser_();
  const now = nowStamp_();
  missing.forEach(function (item) {
    const projectId = generateSupportProjectId_();
    const updates = {
      project_id: projectId,
      'Updated By': user,
      'Updated At': now
    };
    updateRowObject_(sheet, headerMap, item.data.activity_id, updates, 'activity_id');
    logAuditEntries_(
      'Support Activities',
      'UPDATE',
      item.data.activity_id,
      projectId,
      item.data,
      Object.assign({}, item.data, updates),
      'System assigned support Project ID'
    );
  });
  SpreadsheetApp.flush();
  return missing.length;
}

function isOpenFinalStatus_(status) {
  return status === 'OPEN' || status === 'Others' || status === 'NA' || status === NA_VALUE;
}

function hasMissingFields_(row, fields) {
  return fields.some(function (field) {
    return isMissingProjectValue_(row[field]);
  });
}

function normalizeProjectValue_(value) {
  return isMissingProjectValue_(value) ? NA_VALUE : String(value).trim();
}

function isMissingProjectValue_(value) {
  const text = String(value === null || value === undefined ? '' : value).trim().toUpperCase();
  return !text || text === 'NA' || text === 'N/A';
}

function buildMonthlyTrend_(rows) {
  const today = getTodayManila_();
  const trend = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const key = Utilities.formatDate(monthDate, APP_TZ, 'yyyy-MM');
    const label = Utilities.formatDate(monthDate, APP_TZ, 'MMM');
    let count = 0;
    rows.forEach(function (row) {
      if (valueOrNA_(row.final_status) !== 'CLOSED') return;
      const fg = parseDateValue_(row.fg_month);
      if (!fg) return;
      const fgKey = Utilities.formatDate(fg, APP_TZ, 'yyyy-MM');
      if (fgKey === key) count += 1;
    });
    trend.push({ label: label, count: count, monthKey: key });
  }
  return trend;
}

function generateRecordId_() {
  return 'REC-' + Utilities.formatDate(new Date(), APP_TZ, 'yyyyMMdd-HHmmss-SSS') + '-' + Math.floor(Math.random() * 1000);
}

function generateHierarchyId_(prefix) {
  return prefix + '-' + Utilities.getUuid();
}

function generateSupportId_() {
  return 'SUP-' + Utilities.formatDate(new Date(), APP_TZ, 'yyyyMMdd-HHmmss-SSS');
}

function generateAuditId_() {
  return 'AUD-' + Utilities.formatDate(new Date(), APP_TZ, 'yyyyMMdd-HHmmss-SSS');
}

function generateNotificationId_() {
  return 'NTF-' + Utilities.formatDate(new Date(), APP_TZ, 'yyyyMMdd-HHmmss-SSS');
}

function generateAdminMessageId_() {
  return 'MSG-' + Utilities.formatDate(new Date(), APP_TZ, 'yyyyMMdd-HHmmss-SSS') + '-' + Math.floor(Math.random() * 1000);
}

function getActiveUser_() {
  try {
    const email = Session.getActiveUser().getEmail();
    return email || 'system@project-tracker';
  } catch (e) {
    return 'system@project-tracker';
  }
}

function nowStamp_() {
  return Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM-dd HH:mm:ss');
}

function getTodayManila_() {
  const text = Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM-dd');
  const parts = text.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function parseDateValue_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const text = String(value).trim();
  if (!text) return null;
  const monthOnly = text.match(/^(\d{4})-(\d{2})$/);
  if (monthOnly) return new Date(Number(monthOnly[1]), Number(monthOnly[2]), 0);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(text);
  if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return null;
}

function daysBetween_(fromDate, toDate) {
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function parseAuditTime_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.getTime();
  }
  const text = String(value || '').trim();
  const timestamp = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (timestamp) {
    return new Date(
      Number(timestamp[1]),
      Number(timestamp[2]) - 1,
      Number(timestamp[3]),
      Number(timestamp[4]),
      Number(timestamp[5]),
      Number(timestamp[6] || 0)
    ).getTime();
  }
  const d = new Date(text);
  if (!isNaN(d.getTime())) return d.getTime();
  return 0;
}

function monthYearMatches_(value, month, year) {
  const d = parseDateValue_(value);
  if (!d) return !month && !year;
  if (month && (d.getMonth() + 1) !== Number(month)) return false;
  if (year && d.getFullYear() !== Number(year)) return false;
  return true;
}

function dateWithinRange_(value, start, end) {
  const d = parseDateValue_(value);
  if (!d) return false;
  if (start) {
    const s = parseDateValue_(start);
    if (s && d.getTime() < s.getTime()) return false;
  }
  if (end) {
    const e = parseDateValue_(end);
    if (e && d.getTime() > e.getTime()) return false;
  }
  return true;
}

function valueOrNA_(value) {
  if (value === undefined || value === null) return 'NA';
  const text = String(value).trim();
  return text === '' ? 'NA' : text;
}

function valueOrEmpty_(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function lower_(value) {
  return valueOrNA_(value).toLowerCase();
}

function sanitizeAuditValue_(value) {
  if (value === undefined || value === null) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, APP_TZ, 'yyyy-MM-dd');
  }
  const text = String(value);
  return text.length > 500 ? text.slice(0, 500) + '...' : text;
}
