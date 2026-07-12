/**
 * CleanSphere Pro: Housekeeping Management System Backend
 * Google Apps Script Web App Endpoint
 * 
 * Provides APIs for authentication, attendance, room status auditing, 
 * inventory ledger transactions, checklists, and KPI tracking.
 */

// --- CONFIGURATION ---
// Set your Spreadsheet ID here if running standalone. Leave empty if container-bound.
const SPREADSHEET_ID = ""; 

/**
 * Returns Spreadsheet reference based on standalone ID or active container
 */
function getSpreadsheet() {
  if (typeof SPREADSHEET_ID !== "undefined" && SPREADSHEET_ID !== "") {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      throw new Error("Gagal membuka Spreadsheet ID '" + SPREADSHEET_ID + "': " + e.toString());
    }
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error("Tidak dapat menemukan Spreadsheet aktif. Silakan isi konstanta SPREADSHEET_ID di Kode.gs.");
  }
  return active;
}

// --- MAIN DISPATCHERS ---

/**
 * Handle GET requests (serves pages & handles simple data retrieval)
 */
function doGet(e) {
  try {
    const page = e && e.parameter ? e.parameter.page : null;
    const action = e && e.parameter ? e.parameter.action : null;
    
    if (action === "getAllData") {
      return createJsonResponse(handleGetAllDataAction());
    }
    
    // Serve HTML Pages
    if (page === "manager") {
      return HtmlService.createTemplateFromFile("manager")
        .evaluate()
        .setTitle("CleanSphere Pro - Manager Dashboard")
        .addMetaTag("viewport", "width=device-width, initial-scale=1")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // Default page is Index.html (Login)
    return HtmlService.createTemplateFromFile("Index")
      .evaluate()
      .setTitle("CleanSphere Pro - Login")
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return ContentService.createTextOutput("CleanSphere Pro Web App Error: " + error.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Handle POST requests (main REST API)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10s wait lock
  } catch (error) {
    return createJsonResponse({ success: false, message: "Server sibuk. Silakan coba kembali (Lock Timeout)." }, 429);
  }
  
  try {
    let payload;
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    } else {
      payload = {};
    }
    
    const action = payload.action;
    let result;
    
    switch (action) {
      case "setupDatabase":
        result = setupDatabase();
        break;
      case "login":
        result = handleLoginAction(payload);
        break;
      case "verifySession":
        result = handleVerifySessionAction(payload);
        break;
      case "getAllData":
        result = handleGetAllDataAction();
        break;
      case "clockIn":
        result = handleClockInAction(payload);
        break;
      case "clockOut":
        result = handleClockOutAction(payload);
        break;
      case "submitLeave":
        result = handleSubmitLeaveAction(payload);
        break;
      case "approveLeave":
        result = handleApproveLeaveAction(payload);
        break;
      case "updateRoomStatus":
        result = handleUpdateRoomStatusAction(payload);
        break;
      case "submitRoomChecklist":
        result = handleSubmitRoomChecklistAction(payload);
        break;
      case "submitPublicAreaChecklist":
      case "submitAreaTaskDaily":
        result = handleSubmitAreaTaskDailyAction(payload);
        break;
      case "addInventoryTransaction":
        result = handleAddInventoryTransactionAction(payload);
        break;
      case "submitProject":
        result = handleSubmitProjectAction(payload);
        break;
      case "approveProject":
        result = handleApproveProjectAction(payload);
        break;
      case "submitStaffWorkProject":
        result = handleSubmitStaffWorkProjectAction(payload);
        break;
      case "addUser":
        result = handleCreateRecord({
          sheetName: "tb_users",
          record: {
            user_id: payload.user_id,
            username: payload.username,
            password: payload.password,
            name: payload.name,
            role: payload.role,
            shift_id: payload.shift_id,
            status: payload.status || "active"
          }
        });
        break;
      case "updateUser":
        result = handleUpdateRecord({
          sheetName: "tb_users",
          keyCol: "user_id",
          keyValue: payload.user_id,
          updates: {
            username: payload.username,
            name: payload.name,
            role: payload.role,
            shift_id: payload.shift_id,
            status: payload.status,
            ...(payload.password ? { password: payload.password } : {})
          }
        });
        break;
      case "addShift":
        result = handleCreateRecord({
          sheetName: "tb_shifts",
          record: {
            shift_id: payload.shift_id,
            shift_name: payload.shift_name,
            check_in_time: payload.check_in_time,
            check_out_time: payload.check_out_time,
            pre_check_in_minutes: parseInt(payload.pre_check_in_minutes, 10) || 30,
            pre_check_out_minutes: parseInt(payload.pre_check_out_minutes, 10) || 15,
            is_active: payload.is_active === undefined ? true : payload.is_active
          }
        });
        break;
      case "updateShift":
        result = handleUpdateRecord({
          sheetName: "tb_shifts",
          keyCol: "shift_id",
          keyValue: payload.shift_id,
          updates: {
            shift_name: payload.shift_name,
            check_in_time: payload.check_in_time,
            check_out_time: payload.check_out_time,
            pre_check_in_minutes: parseInt(payload.pre_check_in_minutes, 10),
            pre_check_out_minutes: parseInt(payload.pre_check_out_minutes, 10),
            is_active: payload.is_active
          }
        });
        break;
      case "addRoom":
        result = handleCreateRecord({
          sheetName: "tb_rooms",
          record: {
            room_number: String(payload.room_number),
            room_status: payload.room_status || "VD",
            last_cleaned_at: "",
            last_cleaned_by: "",
            last_updated: new Date().toISOString(),
            checklist_config: payload.checklist_config || "{}",
            remarks: payload.remarks || "",
            ideal_timer_minutes: parseInt(payload.ideal_timer_minutes, 10) || 30,
            room_inventory: payload.room_inventory || "[]"
          }
        });
        break;
      case "deleteRoom":
        result = handleDeleteRecord({
          sheetName: "tb_rooms",
          keyCol: "room_number",
          keyValue: String(payload.roomNumber)
        });
        break;
      case "updateRoom":
        result = handleUpdateRecord({
          sheetName: "tb_rooms",
          keyCol: "room_number",
          keyValue: String(payload.oldRoomNumber),
          userId: payload.userId,
          updates: {
            room_number: String(payload.newRoomNumber),
            room_status: payload.roomStatus,
            checklist_config: payload.checklist_config,
            remarks: payload.remarks || "",
            ideal_timer_minutes: parseInt(payload.ideal_timer_minutes, 10) || 30,
            room_inventory: payload.room_inventory || "[]"
          }
        });
        break;
      case "updateRoomInventory":
        result = handleUpdateRecord({
          sheetName: "tb_rooms",
          keyCol: "room_number",
          keyValue: String(payload.room_number),
          userId: payload.userId,
          updates: {
            room_inventory: payload.room_inventory
          }
        });
        break;
      case "addInventoryItem":
        result = handleCreateRecord({
          sheetName: "tb_inventory",
          record: {
            item_id: payload.item_id,
            item_code: payload.item_code,
            category_id: payload.category_id,
            item_name: payload.item_name,
            stock_initial: parseInt(payload.stock_initial, 10) || 0,
            stock_in: 0,
            stock_out: 0,
            stock_current: parseInt(payload.stock_initial, 10) || 0,
            min_stock: parseInt(payload.min_stock, 10) || 5,
            remarks: payload.remarks || ""
          }
        });
        break;
      case "addChecklistMaster":
        result = handleCreateRecord({
          sheetName: "tb_checklist_master",
          record: {
            task_id: payload.task_id,
            task_name: payload.task_name,
            task_type: payload.task_type,
            description: payload.description || "",
            is_active: payload.is_active === undefined ? true : payload.is_active
          }
        });
        break;
      case "createRecord":
        result = handleCreateRecord(payload);
        break;
      case "updateRecord":
        result = handleUpdateRecord(payload);
        break;
      case "deleteRecord":
        result = handleDeleteRecord(payload);
        break;
      case "updateStaffChecklistAssignments":
        result = handleUpdateStaffChecklistAssignmentsAction(payload);
        break;
      case "monthlyReset":
        result = handleMonthlyResetAction();
        break;
      case "updateSettings":
        result = handleUpdateRecord({
          sheetName: "tb_settings",
          keyCol: "setting_id",
          keyValue: "SET1",
          updates: {
            api_key: payload.api_key,
            folder_url: payload.folder_url
          }
        });
        // If not exist, try to create it
        if (!result.success) {
            result = handleCreateRecord({
              sheetName: "tb_settings",
              record: {
                setting_id: "SET1",
                api_key: payload.api_key,
                folder_url: payload.folder_url
              }
            });
        }
        break;
      case "updateAdminCredentials":
        result = handleUpdateRecord({
          sheetName: "tb_users",
          keyCol: "username", // Wait, user might change username! Let's update by role="manager" maybe? Or assume username is the old username?
          keyValue: payload.username, // No, the payload only has new username, name, passwordHash. Wait, we should update by role manager if there's only 1 manager.
          // Let's use role as keyCol? handleUpdateRecord requires unique match. We can just use role manager.
          keyCol: "role",
          keyValue: "manager",
          updates: {
            username: payload.username,
            name: payload.name,
            ...(payload.passwordHash ? { password: payload.passwordHash } : {})
          }
        });
        break;
      case "generateDailyData":
        result = handleGenerateDailyDataAction(payload);
        break;
      default:
        result = { success: false, message: "Action not recognized: " + action };
    }
    
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, message: "Exception error: " + error.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Creates a CORS-friendly JSON TextOutput
 */
function createJsonResponse(data) {
  const jsonStr = JSON.stringify(data);
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

// --- DATABASE SPREADSHEETS HELPERS ---

/**
 * Initialize all database sheets with columns and default seeds for ALL tables
 */
function setupDatabase() {
  const ss = getSpreadsheet();
  
  const schemas = {
    "tb_users": ["user_id", "username", "password", "name", "role", "shift_id", "status"],
    "tb_sessions": ["session_token", "user_id", "created_at", "expires_at"],
    "tb_shifts": ["shift_id", "shift_name", "check_in_time", "check_out_time", "pre_check_in_minutes", "pre_check_out_minutes", "is_active"],
    "tb_attendance": ["attendance_id", "user_id", "shift_id", "date", "check_in_time", "check_out_time", "status", "late_checkout_minutes"],
    "tb_leave_requests": ["request_id", "user_id", "leave_type", "start_date", "end_date", "reason", "proof_url", "status", "approved_by", "approved_at"],
    "tb_settings": ["setting_id", "api_key", "folder_url"],
    "tb_rooms": ["room_number", "room_status", "last_cleaned_at", "last_cleaned_by", "last_updated", "checklist_config", "remarks", "ideal_timer_minutes", "room_inventory"],
    "tb_room_assignments": ["assignment_id", "date", "room_number", "staff_id", "target_status_from", "target_status_to", "remarks", "status"],
    "tb_room_status_history": ["history_id", "room_number", "old_status", "new_status", "changed_by", "timestamp", "duration_minutes", "ideal_timer_minutes", "kpi_score"],
    "tb_room_statuses": ["status_id", "status_code", "status_name", "color_hex", "description", "is_active"],
    "tb_areas": ["area_id", "area_name", "id_number", "shift_ids"],
    "tb_area_shifts": ["area_shift_id", "shift_name", "start_time", "end_time"],
    "tb_staff_area_tasks": ["task_id", "area_id", "area_shift_id", "staff_id"],
    "tb_area_tasks_daily": ["task_daily_id", "area_id", "area_shift_id", "staff_id", "date", "status", "remarks", "updated_by", "updated_at"],
    "tb_inventory_categories": ["category_id", "category_name", "description", "is_active"],
    "tb_checklist_master": ["task_id", "task_name", "task_type", "description", "is_active"],
    "tb_staff_checklist_assignments": ["assignment_id", "user_id", "task_id", "is_enabled"],
    "tb_room_checklist": ["checklist_id", "room_number", "staff_id", "date", "start_time", "end_time", "duration_minutes", "tasks_completed", "linen_changed", "refills", "status", "kpi_score"],
    "tb_housekeeping_project_master": ["master_id", "title", "description", "period_type", "staff_ids", "start_date", "last_generated_date", "is_active"],
    "tb_housekeeping_projects": ["project_id", "master_id", "title", "description", "type", "staff_ids", "photo_url", "date", "status", "approved_by", "approved_at"],
    "tb_staff_work_projects": ["work_project_id", "title", "description", "period", "staff_id", "photo_url", "date"],
    "tb_inventory": ["item_id", "item_code", "category_id", "item_name", "stock_initial", "stock_in", "stock_out", "stock_current", "min_stock", "remarks"],
    "tb_inventory_transactions": ["transaction_id", "item_id", "user_id", "type", "quantity", "date", "timestamp", "remarks"]
  };
  
  const created = [];
  const updated = [];
  for (let sheetName in schemas) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[sheetName]);
      seedSheetData(sheetName);
      created.push(sheetName);
    } else {
      // Sync headers if the sheet already exists but is missing new columns
      const expectedHeaders = schemas[sheetName];
      const lastCol = sheet.getLastColumn();
      let existingHeaders = [];
      if (lastCol > 0) {
        existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
      }
      
      const missingHeaders = expectedHeaders.filter(h => !existingHeaders.includes(h));
      if (missingHeaders.length > 0) {
        missingHeaders.forEach(header => {
          const nextCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, nextCol).setValue(header);
        });
        updated.push(sheetName);
      }
    }
  }
  
  // Ensure tb_settings has at least one configuration row
  const settingsSheet = ss.getSheetByName("tb_settings");
  if (settingsSheet && settingsSheet.getLastRow() <= 1) {
    seedSheetData("tb_settings");
    if (!updated.includes("tb_settings")) updated.push("tb_settings");
  }
  
  ss.setSpreadsheetTimeZone("Asia/Jakarta");
  
  let msg = "Basis data CleanSphere Pro berhasil dikonfigurasi.";
  if (created.length > 0) msg += " Sheets baru dibuat: " + created.join(", ") + ".";
  if (updated.length > 0) msg += " Struktur kolom diperbarui pada: " + updated.join(", ") + ".";
  if (created.length === 0 && updated.length === 0) msg = "Basis data sudah lengkap, tersinkronisasi, dan siap digunakan.";
  
  return { 
    success: true, 
    message: msg
  };
}

/**
 * Seed initial data for EVERY table in database (Ensures all tables have seeds)
 */
function seedSheetData(name) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) return;
  
  const defaultHash = "b4f41429071c948a6a12288f667f47fdf3c6be365164fc5d0d1ff45874096218"; // SHA-256 for CleanSphere2026!
  
  if (name === "tb_users") {
    sheet.appendRow(["USR001", "admin", defaultHash, "Manager CleanSphere", "manager", "S1", "active"]);
    sheet.appendRow(["USR002", "budi", defaultHash, "Budi Santoso", "staff", "S1", "active"]);
    sheet.appendRow(["USR003", "siti", defaultHash, "Siti Rahma", "staff", "S2", "active"]);
  } 
  else if (name === "tb_sessions") {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    sheet.appendRow(["SES001-DUMMY", "USR001", new Date().toISOString(), expires]);
  }
  else if (name === "tb_shifts") {
    sheet.appendRow(["S1", "Pagi", "07:00", "15:00", 50, 30, true]);
    sheet.appendRow(["S2", "Siang", "15:00", "23:00", 50, 30, true]);
    sheet.appendRow(["S3", "Malam", "23:00", "07:00", 50, 30, true]);
  } 
  else if (name === "tb_attendance") {
    sheet.appendRow(["ATT001", "USR002", "S1", "2026-07-09", "06:45", "15:05", "out", 0]);
  }
  else if (name === "tb_leave_requests") {
    sheet.appendRow(["LVR001", "USR003", "sakit", "2026-07-10", "2026-07-11", "Demam tinggi", "", "pending", "", ""]);
  }
  else if (name === "tb_settings") {
    sheet.appendRow(["SET001", "AIzaSyDummyKeyCleanSpherePro_2026_ExampleKey", "https://drive.google.com/drive/folders/dummyFolderId123"]);
  }
  else if (name === "tb_rooms") {
    const defaultConfig = JSON.stringify({
      "Cleaning": {
        "type": "checklist",
        "items": ["Trash", "Bed Making", "Floor", "Toilet"]
      },
      "Change": {
        "type": "inout",
        "items": ["Bedding", "Towel"]
      },
      "Refill": {
        "type": "in",
        "items": ["Toiletries", "Water Bottle"]
      }
    });
    const defaultInventory = JSON.stringify([
      { name: "Sabun Mandi", qty: 2, min_qty: 1 },
      { name: "Sikat Gigi", qty: 2, min_qty: 1 },
      { name: "Shampoo", qty: 2, min_qty: 1 },
      { name: "Handuk", qty: 2, min_qty: 2 },
      { name: "Tisu Toilet", qty: 1, min_qty: 1 }
    ]);
    sheet.appendRow(["101", "VD", "2026-07-10T08:00:00.000Z", "USR002", "2026-07-10T08:00:00.000Z", defaultConfig, "Kamar Standard Lantai 1", 30, defaultInventory]);
    sheet.appendRow(["102", "VC", "2026-07-10T08:30:00.000Z", "USR002", "2026-07-10T08:30:00.000Z", defaultConfig, "Kamar Standard Lantai 1", 30, defaultInventory]);
    sheet.appendRow(["103", "OC", "2026-07-10T08:45:00.000Z", "USR002", "2026-07-10T08:45:00.000Z", defaultConfig, "Kamar Deluxe Lantai 1", 45, defaultInventory]);
    sheet.appendRow(["104", "OD", "2026-07-10T09:15:00.000Z", "USR003", "2026-07-10T09:15:00.000Z", defaultConfig, "Kamar Deluxe Lantai 1", 45, defaultInventory]);
    sheet.appendRow(["105", "VD", "", "", "2026-07-10T09:30:00.000Z", defaultConfig, "Kamar Standard Lantai 1", 30, defaultInventory]);
    sheet.appendRow(["106", "VC", "", "", "2026-07-10T09:45:00.000Z", defaultConfig, "Kamar Standard Lantai 1", 30, defaultInventory]);
    sheet.appendRow(["107", "DND", "", "", "2026-07-10T10:00:00.000Z", defaultConfig, "Kamar Suite VIP", 60, defaultInventory]);
    sheet.appendRow(["108", "SR", "", "", "2026-07-10T10:15:00.000Z", defaultConfig, "Kamar Suite VIP", 60, defaultInventory]);
    sheet.appendRow(["109", "SO", "", "", "2026-07-10T10:30:00.000Z", defaultConfig, "Kamar Standard Lantai 1", 30, defaultInventory]);
    sheet.appendRow(["110", "NS", "", "", "2026-07-10T10:45:00.000Z", defaultConfig, "Kamar Standard Lantai 1", 30, defaultInventory]);
    sheet.appendRow(["201", "OD", "2026-07-10T09:00:00.000Z", "USR003", "2026-07-10T09:00:00.000Z", defaultConfig, "Kamar Suite Lantai 2", 45, defaultInventory]);
    sheet.appendRow(["202", "OOO", "", "", "2026-07-10T09:00:00.000Z", defaultConfig, "AC Rusak dalam perbaikan", 30, defaultInventory]);
    sheet.appendRow(["203", "VD", "", "", "2026-07-10T09:00:00.000Z", defaultConfig, "Kamar Deluxe Lantai 2", 30, defaultInventory]);
    sheet.appendRow(["204", "VC", "", "", "2026-07-10T09:00:00.000Z", defaultConfig, "Kamar Deluxe Lantai 2", 30, defaultInventory]);
    sheet.appendRow(["205", "OOS", "", "", "2026-07-10T09:00:00.000Z", defaultConfig, "Perbaikan plafon retak", 30, defaultInventory]);
  } 
  else if (name === "tb_room_assignments") {
    sheet.appendRow(["ASGR001", "2026-07-09", "101", "USR002", "VD", "VC", "Pembersihan rutin", "Completed"]);
    sheet.appendRow(["ASGR002", "2026-07-10", "102", "USR003", "OC", "OC", "Ganti linen saja", "Completed"]);
    sheet.appendRow(["ASGR003", "2026-07-10", "104", "USR002", "VD", "VC", "Check in expected", "Pending"]);
    sheet.appendRow(["ASGR004", "2026-07-10", "105", "USR003", "VD", "VC", "Rutin", "Pending"]);
    sheet.appendRow(["ASGR005", "2026-07-11", "106", "USR002", "VD", "VC", "Rutin pagi", "Pending"]);
    sheet.appendRow(["ASGR006", "2026-07-11", "203", "USR003", "VD", "VC", "Rutin sore", "Pending"]);
  }
  else if (name === "tb_room_status_history") {
    sheet.appendRow(["HIS001", "101", "VC", "VD", "USR002", "2026-07-09T08:00:00.000Z", 120, 30, 0]);
    sheet.appendRow(["HIS002", "102", "VD", "VC", "USR003", "2026-07-10T08:30:00.000Z", 20, 30, 100]);
    sheet.appendRow(["HIS003", "103", "OD", "OC", "USR002", "2026-07-10T08:45:00.000Z", 35, 45, 100]);
    sheet.appendRow(["HIS004", "104", "VD", "OD", "USR003", "2026-07-10T09:15:00.000Z", 15, 45, 100]);
  }
  else if (name === "tb_room_statuses") {
    const statuses = [
      ["ST001", "OD", "Occupied Dirty", "#YLO", "Kamar terisi kotor", true],
      ["ST002", "OC", "Occupied Clean", "#GRN", "Kamar terisi bersih", true],
      ["ST003", "VD", "Vacant Dirty", "#RED", "Kamar kosong kotor", true],
      ["ST004", "VC", "Vacant Clean", "#GRN", "Kamar kosong bersih", true],
      ["ST005", "VCI", "Vacant Clean Inspected", "#BLU", "Kamar bersih terperiksa", true],
      ["ST006", "ED", "Expected Departure", "#ORG", "Kamar diharapkan check-out", true],
      ["ST007", "EA", "Expected Arrival", "#GRY", "Kamar diharapkan check-in", true],
      ["ST008", "NS", "No Show", "#WHT", "Tamu tidak datang", true],
      ["ST009", "RS", "Ready to Sell", "#BRN", "Kamar siap dijual", true],
      ["ST010", "DND", "Do Not Disturb", "#MAR", "Jangan diganggu", true],
      ["ST011", "OOO", "Out of Order", "#RED", "Kamar rusak total", true],
      ["ST012", "OOS", "Out of Service", "#PNK", "Kamar diluar layanan sementara", true],
      ["ST013", "SO", "Sleep Out", "#WHT", "Tamu tidur diluar", true],
      ["ST014", "DL", "Double Lock", "#MAR", "Pintu terkunci ganda", true],
      ["ST015", "NL", "No Luggage", "#WHT", "Tamu tanpa bagasi", true],
      ["ST016", "CO", "Check Out", "#RED", "Tamu telah pergi", true],
      ["ST017", "DO", "Due Out", "#ORG", "Kamar harus kosong hari ini", true],
      ["ST018", "MUR", "Make Up Room", "#YLO", "Minta dibersihkan", true],
      ["ST019", "VIP", "Very Important Person", "#PRP", "Tamu VIP", true],
      ["ST020", "COMP", "Complimentary", "#CRM", "Kamar cuma-cuma", true]
    ];
    statuses.forEach(row => sheet.appendRow(row));
  } 
  else if (name === "tb_areas") {
    sheet.appendRow(["AR001", "Lobby Utama", "A1", "SH_M,SH_E"]);
    sheet.appendRow(["AR002", "Toilet Lobby", "A2", "SH_M,SH_E,SH_N"]);
  }
  else if (name === "tb_area_shifts") {
    sheet.appendRow(["SH_M", "Morning", "08:00", "16:00"]);
    sheet.appendRow(["SH_E", "Evening", "16:00", "00:00"]);
    sheet.appendRow(["SH_N", "Night", "00:00", "08:00"]);
  }
  else if (name === "tb_staff_area_tasks") {
    sheet.appendRow(["SAT001", "AR001", "SH_M", "USR002"]);
    sheet.appendRow(["SAT002", "AR002", "SH_E", "USR003"]);
  }
  else if (name === "tb_area_tasks_daily") {
    sheet.appendRow(["ATD001", "AR001", "SH_M", "USR002", "2026-07-10", "Centang", "Sapu bersih", "USR002", "2026-07-10T09:00:00.000Z"]);
  }
  else if (name === "tb_inventory_categories") {
    sheet.appendRow(["CAT001", "Linen", "Perlengkapan linen ranjang & mandi", true]);
    sheet.appendRow(["CAT002", "Chemical", "Bahan kimia disinfektan & pembersih", true]);
    sheet.appendRow(["CAT003", "Equipment", "Peralatan manual housekeeping", true]);
    sheet.appendRow(["CAT004", "Refills", "Sabun cair, hand sanitizer, tisu gulung", true]);
  } 
  else if (name === "tb_checklist_master") {
    sheet.appendRow(["TSK001", "Dusting Furnitur", "Room - Cleaning", "Mengelap debu furnitur kamar", true]);
    sheet.appendRow(["TSK002", "Sweeping & Mopping", "Room - Cleaning", "Menyapu & mengepel lantai kamar", true]);
    sheet.appendRow(["TSK003", "Ganti Linen Kasur", "Room - Linen", "Mengganti sprei dan sarung bantal", true]);
    sheet.appendRow(["TSK004", "Refill Sabun Cair", "Room - Refill", "Mengisi ulang sabun mandi cair", true]);
    sheet.appendRow(["TSK005", "Refill Tisu Toilet", "Room - Refill", "Mengisi tisu toilet roll", true]);
    sheet.appendRow(["TSK006", "Sapu & Pel Lobby", "Public Area", "Pembersihan menyeluruh lobby utama", true]);
  } 
  else if (name === "tb_staff_checklist_assignments") {
    sheet.appendRow(["ASG001", "USR002", "TSK001", true]);
    sheet.appendRow(["ASG002", "USR002", "TSK002", true]);
    sheet.appendRow(["ASG003", "USR002", "TSK003", true]);
    sheet.appendRow(["ASG004", "USR002", "TSK004", true]);
    sheet.appendRow(["ASG005", "USR002", "TSK005", true]);
  } 
  else if (name === "tb_room_checklist") {
    const tasksSeed = JSON.stringify({
      "Cleaning": { "Trash": true, "Bed Making": true, "Floor": true, "Toilet": true }
    });
    const changeSeed = JSON.stringify({
      "Change": { "Bedding": { "in": 2, "out": 2 }, "Towel": { "in": 1, "out": 1 } }
    });
    const refillSeed = JSON.stringify({
      "Refill": { "Toiletries": { "in": 3 }, "Water Bottle": { "in": 2 } }
    });
    sheet.appendRow(["CKR001", "102", "USR002", "2026-07-09", "2026-07-09T08:15:00.000Z", "2026-07-09T08:30:00.000Z", 15, tasksSeed, changeSeed, refillSeed, "Completed", 95.0]);
    sheet.appendRow(["CKR002", "103", "USR002", "2026-07-10", "2026-07-10T08:10:00.000Z", "2026-07-10T08:45:00.000Z", 35, tasksSeed, changeSeed, refillSeed, "Completed", 95.0]);
    sheet.appendRow(["CKR003", "102", "USR003", "2026-07-10", "2026-07-10T08:10:00.000Z", "2026-07-10T08:30:00.000Z", 20, tasksSeed, changeSeed, refillSeed, "Completed", 92.5]);
    sheet.appendRow(["CKR004", "101", "USR002", "2026-07-09", "2026-07-09T07:45:00.000Z", "2026-07-09T08:00:00.000Z", 15, tasksSeed, changeSeed, refillSeed, "Completed", 85.0]);
  }
  else if (name === "tb_housekeeping_projects") {
    sheet.appendRow(["PRJ001", "Pembersihan Kaca Fasad Luar", "Pembersihan kaca depan lobby luar", "Mingguan", "USR002", "", "2026-07-09", "Pending", "", ""]);
  }
  else if (name === "tb_staff_work_projects") {
    sheet.appendRow(["WPRJ001", "Pembersihan Taman Samping", "Pembersihan rumput liar dan daun kering", "Mingguan", "USR002", "", "2026-07-10"]);
  }
  else if (name === "tb_inventory") {
    sheet.appendRow(["INV001", "BRG001", "CAT001", "Sprei Single Bed", 100, 10, 5, 105, 20, "Sprei katun putih single"]);
    sheet.appendRow(["INV002", "BRG002", "CAT002", "Multi Purpose Cleaner", 50, 5, 2, 53, 10, "Pembersih serbaguna 1L"]);
    sheet.appendRow(["INV003", "BRG003", "CAT004", "Tisu Toilet Roll", 200, 50, 15, 235, 50, "Tisu toilet gulung standard"]);
    sheet.appendRow(["INV004", "BRG004", "CAT004", "Sabun Cair Handwash", 80, 20, 8, 92, 15, "Sabun cuci tangan botol"]);
  }
  else if (name === "tb_inventory_transactions") {
    sheet.appendRow(["TX001", "INV001", "USR001", "in", 10, "2026-07-09", "2026-07-09T07:30:00.000Z", "Restock vendor"]);
    sheet.appendRow(["TX002", "INV001", "USR002", "out", 5, "2026-07-09", "2026-07-09T08:00:00.000Z", "Dipakai di kamar"]);
  }
}

/**
 * Gets sheet reference
 */
function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error("Sheet '" + name + "' tidak ditemukan. Jalankan setupDatabase() terlebih dahulu.");
  }
  return sheet;
}

/**
 * Gets a formatted cell value based on expected type (prevents regional format errors)
 */
function getFormattedCellValue(val, type) {
  if (val === "" || val === undefined || val === null) return "";
  
  const tz = getSpreadsheet().getSpreadsheetTimeZone();
  
  if (type === "date") {
    if (val instanceof Date) {
      return Utilities.formatDate(val, tz, "yyyy-MM-dd");
    }
    return String(val).trim();
  }
  
  if (type === "time") {
    if (val instanceof Date) {
      return Utilities.formatDate(val, tz, "HH:mm");
    }
    return String(val).match(/^\d{2}:\d{2}/) ? String(val).substring(0, 5) : String(val).trim();
  }
  
  if (type === "timestamp") {
    if (val instanceof Date) {
      return Utilities.formatDate(val, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    }
    return String(val).trim();
  }
  
  return val;
}

/**
 * Converts spreadsheet rows to an array of objects
 */
function getSheetData(name) {
  const sheet = getSheet(name);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return [];
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  return values.map((row, rowIndex) => {
    const obj = { _rowNum: rowIndex + 2 };
    headers.forEach((header, colIndex) => {
      let val = row[colIndex];
      const lower = header.toLowerCase();
      
      if (val instanceof Date) {
        if (lower.includes("date") && !lower.includes("time") && !lower.includes("_at")) {
          obj[header] = getFormattedCellValue(val, "date");
        } else if (lower.includes("time") && !lower.includes("_at") && !lower.includes("date") && val.getFullYear() === 1899) {
          obj[header] = getFormattedCellValue(val, "time");
        } else {
          obj[header] = getFormattedCellValue(val, "timestamp");
        }
      } else {
        if (val === true || val === "true" || val === "TRUE") {
          obj[header] = true;
        } else if (val === false || val === "false" || val === "FALSE") {
          obj[header] = false;
        } else if (lower.includes("minutes") || lower.includes("stock") || lower.includes("quantity") || lower.includes("score")) {
          obj[header] = val === "" ? 0 : Number(val);
        } else {
          obj[header] = val;
        }
      }
    });
    return obj;
  });
}

/**
 * Appends a structured object matching headers to the sheet
 */
function appendRowToSheet(name, dataObj) {
  const sheet = getSheet(name);
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  const newRow = headers.map(header => {
    let val = dataObj[header];
    if (val === undefined || val === null) return "";
    return val;
  });
  
  sheet.appendRow(newRow);
  return true;
}

/**
 * Finds a row by matching a key-value column and returns its data & 1-indexed row number
 */
function findRowInSheet(name, keyCol, val) {
  const sheet = getSheet(name);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return null;
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const colIndex = headers.indexOf(keyCol);
  if (colIndex === -1) return null;
  
  const values = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(val).trim()) {
      const rowNum = i + 2;
      const fullRow = sheet.getRange(rowNum, 1, 1, lastCol).getValues()[0];
      const obj = { _rowNum: rowNum };
      
      headers.forEach((h, idx) => {
        let v = fullRow[idx];
        const lower = h.toLowerCase();
        
        if (v instanceof Date) {
          if (lower.includes("date") && !lower.includes("time") && !lower.includes("_at")) {
            obj[h] = getFormattedCellValue(v, "date");
          } else if (lower.includes("time") && !lower.includes("_at") && !lower.includes("date") && v.getFullYear() === 1899) {
            obj[h] = getFormattedCellValue(v, "time");
          } else {
            obj[h] = getFormattedCellValue(v, "timestamp");
          }
        } else {
          if (v === true || v === "true" || v === "TRUE") {
            obj[h] = true;
          } else if (v === false || v === "false" || v === "FALSE") {
            obj[h] = false;
          } else {
            obj[h] = v;
          }
        }
      });
      return obj;
    }
  }
  return null;
}

/**
 * Updates columns on an existing row matching the key-value
 */
function updateRowInSheet(name, keyCol, val, updateObj) {
  const rowInfo = findRowInSheet(name, keyCol, val);
  if (!rowInfo) return false;
  
  const sheet = getSheet(name);
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  for (let key in updateObj) {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      sheet.getRange(rowInfo._rowNum, colIndex + 1).setValue(updateObj[key]);
    }
  }
  return true;
}

// --- CORE ACTION HANDLERS ---

/**
 * Authenticates user and returns session token
 */
function handleLoginAction(payload) {
  const username = String(payload.username || "").trim();
  const passwordHash = String(payload.passwordHash || "").trim();
  
  if (!username || !passwordHash) {
    return { success: false, message: "Username dan Password wajib diisi." };
  }
  
  const user = findRowInSheet("tb_users", "username", username);
  if (!user) {
    return { success: false, message: "Username tidak terdaftar." };
  }
  
  if (user.status !== "active") {
    return { success: false, message: "Akun Anda dinonaktifkan." };
  }
  
  if (user.password !== passwordHash) {
    return { success: false, message: "Password yang Anda masukkan salah." };
  }
  
  const token = createSession(user.user_id);
  
  // Exclude password from response
  delete user.password;
  delete user._rowNum;
  
  return { 
    success: true, 
    message: "Login berhasil.", 
    user: user, 
    sessionToken: token 
  };
}

/**
 * Creates UUID session token and logs to tb_sessions
 */
function createSession(userId) {
  const token = Utilities.getUuid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration
  
  const tz = getSpreadsheet().getSpreadsheetTimeZone();
  const createdStr = Utilities.formatDate(now, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  const expiresStr = Utilities.formatDate(expiresAt, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  
  appendRowToSheet("tb_sessions", {
    session_token: token,
    user_id: userId,
    created_at: createdStr,
    expires_at: expiresStr
  });
  
  return token;
}

/**
 * Verifies if sessionToken is valid and matches an active user
 */
function handleVerifySessionAction(payload) {
  const token = String(payload.sessionToken || "").trim();
  if (!token) return { success: false, message: "Token sesi kosong." };
  
  const session = findRowInSheet("tb_sessions", "session_token", token);
  if (!session) {
    return { success: false, message: "Sesi tidak ditemukan." };
  }
  
  const now = new Date();
  const expires = new Date(session.expires_at);
  if (now > expires) {
    return { success: false, message: "Sesi telah kedaluwarsa." };
  }
  
  const user = findRowInSheet("tb_users", "user_id", session.user_id);
  if (!user || user.status !== "active") {
    return { success: false, message: "Karyawan terkait tidak aktif atau tidak ditemukan." };
  }
  
  delete user.password;
  delete user._rowNum;
  
  return { 
    success: true, 
    message: "Sesi valid.", 
    user: user 
  };
}

/**
 * Retrieves all tables data for populating client data.js
 */
function handleGetAllDataAction() {
  return {
    success: true,
    users: getSheetData("tb_users"),
    shifts: getSheetData("tb_shifts"),
    attendance: getSheetData("tb_attendance"),
    leave_requests: getSheetData("tb_leave_requests"),
    settings: getSheetData("tb_settings"),
    rooms: getSheetData("tb_rooms"),
    room_assignments: getSheetData("tb_room_assignments"),
    room_status_history: getSheetData("tb_room_status_history"),
    room_statuses: getSheetData("tb_room_statuses"),
    areas: getSheetData("tb_areas"),
    area_shifts: getSheetData("tb_area_shifts"),
    staff_area_tasks: getSheetData("tb_staff_area_tasks"),
    area_tasks_daily: getSheetData("tb_area_tasks_daily"),
    inventory_categories: getSheetData("tb_inventory_categories"),
    checklist_master: getSheetData("tb_checklist_master"),
    staff_checklist_assignments: getSheetData("tb_staff_checklist_assignments"),
    room_checklist: getSheetData("tb_room_checklist"),
    housekeeping_project_master: getSheetData("tb_housekeeping_project_master"),
    housekeeping_projects: getSheetData("tb_housekeeping_projects"),
    staff_work_projects: getSheetData("tb_staff_work_projects"),
    inventory: getSheetData("tb_inventory"),
    inventory_transactions: getSheetData("tb_inventory_transactions")
  };
}

/**
 * Utility helper to convert time string HH:mm to minutes from midnight
 */
function timeToMinutes(timeStr) {
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Validates check-in window based on target shift rules
 */
function isCheckInAllowed(shift, checkTimeStr) {
  const checkMins = timeToMinutes(checkTimeStr);
  const targetMins = timeToMinutes(shift.check_in_time);
  const preMins = parseInt(shift.pre_check_in_minutes, 10) || 0;
  
  let startMins = targetMins - preMins;
  if (startMins < 0) {
    startMins += 1440; // Wrap-around
  }
  
  if (startMins <= targetMins) {
    return (checkMins >= startMins);
  } else {
    return (checkMins >= startMins || checkMins <= targetMins);
  }
}

/**
 * Records user clock-in attendance
 */
function handleClockInAction(payload) {
  const userId = payload.userId;
  const shiftId = payload.shiftId;
  const date = payload.date; // YYYY-MM-DD
  const time = payload.time; // HH:mm
  
  if (!userId || !shiftId || !date || !time) {
    return { success: false, message: "Parameter absensi masuk tidak lengkap." };
  }
  
  const shift = findRowInSheet("tb_shifts", "shift_id", shiftId);
  if (!shift || !shift.is_active) {
    return { success: false, message: "Shift tidak aktif atau tidak ditemukan." };
  }
  
  const leaves = getSheetData("tb_leave_requests");
  const hasLeave = leaves.some(row => 
    row.user_id === userId && 
    (row.status === "approved" || row.status === "pending") &&
    date >= String(row.start_date).substring(0, 10) && 
    date <= String(row.end_date).substring(0, 10)
  );
  if (hasLeave) {
    return { success: false, message: "Clock-In diblokir. Anda memiliki izin/cuti aktif untuk tanggal hari ini." };
  }
  
  const attendance = getSheetData("tb_attendance");
  const alreadyIn = attendance.find(row => row.user_id === userId && row.date === date);
  if (alreadyIn) {
    return { success: false, message: "Anda sudah melakukan Clock-In untuk hari ini." };
  }
  
  if (!isCheckInAllowed(shift, time)) {
    return { 
      success: false, 
      message: "Clock-In belum dibuka. Shift " + shift.shift_name + " (" + shift.check_in_time + ") baru dapat diakses sejak " + 
               getFormattedWindowTime(shift.check_in_time, -shift.pre_check_in_minutes) + "."
    };
  }
  
  const attId = "ATT" + Utilities.getUuid().substring(0, 8).toUpperCase();
  
  appendRowToSheet("tb_attendance", {
    attendance_id: attId,
    user_id: userId,
    shift_id: shiftId,
    date: date,
    check_in_time: time,
    check_out_time: "",
    status: "pending",
    late_checkout_minutes: 0
  });
  
  return { success: true, message: "Clock-In berhasil dicatat pada pukul " + time + ".", attendance_id: attId };
}

/**
 * Format window starting time correctly helper
 */
function getFormattedWindowTime(timeStr, offsetMins) {
  let mins = timeToMinutes(timeStr) + offsetMins;
  if (mins < 0) mins += 1440;
  if (mins >= 1440) mins -= 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return String(h).padStart(2, '0') + ":" + String(m).padStart(2, '0');
}

/**
 * Records user clock-out attendance and calculates late clock-out
 */
function handleClockOutAction(payload) {
  const userId = payload.userId;
  const date = payload.date; // YYYY-MM-DD
  const time = payload.time; // HH:mm
  
  if (!userId || !date || !time) {
    return { success: false, message: "Parameter absensi pulang tidak lengkap." };
  }
  
  const attData = getSheetData("tb_attendance");
  const attRecord = attData.find(row => row.user_id === userId && row.date === date && row.status === "pending");
  if (!attRecord) {
    return { success: false, message: "Data Clock-In aktif (pending) hari ini tidak ditemukan." };
  }
  
  const shift = findRowInSheet("tb_shifts", "shift_id", attRecord.shift_id);
  if (!shift) {
    return { success: false, message: "Shift absensi tidak valid." };
  }
  
  const checkMins = timeToMinutes(time);
  const targetMins = timeToMinutes(shift.check_out_time);
  const preMins = parseInt(shift.pre_check_out_minutes, 10) || 0;
  
  let startMins = targetMins - preMins;
  if (startMins < 0) startMins += 1440;
  
  let allowed = false;
  if (startMins <= targetMins) {
    allowed = (checkMins >= startMins);
  } else {
    allowed = (checkMins >= startMins || checkMins <= targetMins);
  }
  
  if (!allowed) {
    return { 
      success: false, 
      message: "Clock-Out belum dibuka. Jam pulang: " + shift.check_out_time + 
               " (Bisa diakses mulai " + getFormattedWindowTime(shift.check_out_time, -shift.pre_check_out_minutes) + ")." 
    };
  }
  
  // Calculate late clock-out minutes if check-out exceeds target check-out time
  let lateMinutes = 0;
  if (checkMins > targetMins) {
    lateMinutes = checkMins - targetMins;
  }
  
  const checkInMins = timeToMinutes(attRecord.check_in_time);
  const shiftInMins = timeToMinutes(shift.check_in_time);
  let finalStatus = "hadir";
  if (checkInMins > shiftInMins) {
    finalStatus = "terlambat";
  }
  
  updateRowInSheet("tb_attendance", "attendance_id", attRecord.attendance_id, {
    check_out_time: time,
    status: finalStatus,
    late_checkout_minutes: lateMinutes
  });
  
  let successMsg = "Clock-Out berhasil dicatat pada pukul " + time + ". Status kehadiran: " + finalStatus + ".";
  if (lateMinutes > 0) {
    successMsg += " Keterlambatan absen pulang: " + lateMinutes + " menit.";
  }
  
  return { success: true, message: successMsg };
}

/**
 * Saves base64 encoded document to Google Drive and returns direct link URL
 */
function saveFileToDrive(base64Data, filename) {
  try {
    const parts = base64Data.split(",");
    const meta = parts[0];
    const rawData = parts[1] || parts[0];
    
    let mime = "image/jpeg";
    const mimeMatch = meta.match(/:(.*?);/);
    if (mimeMatch) {
      mime = mimeMatch[1];
    }
    
    const decoded = Utilities.base64Decode(rawData);
    const blob = Utilities.newBlob(decoded, mime, filename);
    
    let folder;
    let folderId = "";
    
    // Look up tb_settings for folder_url or folder ID
    try {
      const settingsList = getSheetData("tb_settings");
      if (settingsList && settingsList.length > 0) {
        const urlOrId = settingsList[0].folder_url || "";
        if (urlOrId) {
          const match = urlOrId.match(/folders\/([a-zA-Z0-9-_]+)/) || urlOrId.match(/id=([a-zA-Z0-9-_]+)/);
          folderId = match ? match[1] : urlOrId.trim();
        }
      }
    } catch (e) {
      console.warn("Gagal mengambil folder_url dari tb_settings: " + e.toString());
    }
    
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (err) {
        console.warn("Folder ID dari tb_settings tidak valid, fallback ke default. Error: " + err.toString());
      }
    }
    
    if (!folder) {
      const folders = DriveApp.getFoldersByName("CleanSphere_Proof_Files");
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("CleanSphere_Proof_Files");
      }
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    // Return Direct Link URL format as requested by the user
    return "https://drive.google.com/uc?export=view&id=" + fileId;
  } catch (e) {
    throw new Error("Gagal mengunggah file ke Drive: " + e.toString());
  }
}

/**
 * Submits leave, permission, or sick request
 */
function handleSubmitLeaveAction(payload) {
  const userId = payload.userId;
  const leaveType = payload.leaveType;
  const startDate = payload.startDate;
  const endDate = payload.endDate;
  const reason = payload.reason;
  
  if (!userId || !leaveType || !startDate || !endDate) {
    return { success: false, message: "Mohon isi parameter cuti secara lengkap." };
  }
  
  let proofUrl = "";
  if (payload.fileBase64 && payload.fileName) {
    try {
      proofUrl = saveFileToDrive(payload.fileBase64, payload.fileName);
    } catch (e) {
      return { success: false, message: e.toString() };
    }
  }
  
  const reqId = "LV" + Utilities.getUuid().substring(0, 8).toUpperCase();
  
  appendRowToSheet("tb_leave_requests", {
    request_id: reqId,
    user_id: userId,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    reason: reason || "",
    proof_url: proofUrl,
    status: "pending",
    approved_by: "",
    approved_at: ""
  });
  
  return { success: true, message: "Pengajuan izin berhasil direkam dengan ID: " + reqId };
}

/**
 * Approves or rejects a leave request
 */
function handleApproveLeaveAction(payload) {
  const requestId = payload.requestId;
  const managerId = payload.managerId;
  const status = payload.status;
  
  if (!requestId || !managerId || !status) {
    return { success: false, message: "Parameter persetujuan tidak lengkap." };
  }
  
  const tz = getSpreadsheet().getSpreadsheetTimeZone();
  const timeStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  
  const success = updateRowInSheet("tb_leave_requests", "request_id", requestId, {
    status: status,
    approved_by: managerId,
    approved_at: timeStr
  });
  
  if (!success) {
    return { success: false, message: "Pengajuan izin tidak ditemukan." };
  }
  
  return { success: true, message: "Pengajuan izin " + (status === "approved" ? "disetujui." : "ditolak.") };
}

/**
 * Calculates duration in minutes
 */
function calculateMinutesBetween(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end - start;
  return isNaN(diffMs) ? 0 : Math.round(diffMs / 60000);
}

/**
 * Calculates last status change duration
 */
function calculateLastStatusDuration(roomNumber, nowISO) {
  const history = getSheetData("tb_room_status_history");
  const roomHistory = history.filter(row => String(row.room_number) === String(roomNumber));
  if (roomHistory.length === 0) return 0;
  
  roomHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return calculateMinutesBetween(roomHistory[0].timestamp, nowISO);
}

/**
 * Updates room status using row versioning to prevent collision
 */
function handleUpdateRoomStatusAction(payload) {
  const roomNumber = String(payload.roomNumber);
  const newStatus = payload.newStatus;
  const lastUpdatedLocal = payload.lastUpdatedLocal;
  const userId = payload.userId;
  const remarks = payload.remarks || "";
  
  if (!roomNumber || !newStatus || !lastUpdatedLocal || !userId) {
    return { success: false, message: "Parameter pembaruan status kamar tidak lengkap." };
  }
  
  const room = findRowInSheet("tb_rooms", "room_number", roomNumber);
  if (!room) {
    return { success: false, message: "Kamar tidak ditemukan." };
  }
  
  // Row Versioning validation
  if (String(room.last_updated).trim() !== String(lastUpdatedLocal).trim()) {
    return { 
      success: false, 
      conflict: true, 
      message: "Tabrakan Data! Status kamar telah diperbarui oleh staf lain. Sistem memicu Sinkronisasi UI otomatis."
    };
  }
  
  const tz = getSpreadsheet().getSpreadsheetTimeZone();
  const nowISO = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  
  const oldStatus = room.room_status;
  
  const updateObj = {
    room_status: newStatus,
    last_updated: nowISO,
    remarks: remarks
  };
  
  if (newStatus === "VC" || newStatus === "OC") {
    updateObj.last_cleaned_at = nowISO;
    updateObj.last_cleaned_by = userId;
  }
  
  updateRowInSheet("tb_rooms", "room_number", roomNumber, updateObj);
  
  const historyId = "HIS" + Utilities.getUuid().substring(0, 8).toUpperCase();
  const duration = calculateLastStatusDuration(roomNumber, nowISO);
  const ideal_timer = room.ideal_timer_minutes || 30;
  let historyKpi = 100;
  if (duration > ideal_timer) {
    historyKpi = Math.max(0, 100 - ((duration - ideal_timer) / ideal_timer) * 100);
  }
  historyKpi = Number(historyKpi.toFixed(2));
  
  appendRowToSheet("tb_room_status_history", {
    history_id: historyId,
    room_number: roomNumber,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: userId,
    timestamp: nowISO,
    duration_minutes: duration,
    ideal_timer_minutes: ideal_timer,
    kpi_score: historyKpi
  });
  
  return { 
    success: true, 
    message: "Status kamar " + roomNumber + " berhasil diperbarui menjadi " + newStatus + ".",
    last_updated: nowISO 
  };
}

/**
 * Submits room checklist and updates KPI score
 */
function handleSubmitRoomChecklistAction(payload) {
  const roomNumber = String(payload.roomNumber);
  const staffId = payload.staffId;
  const date = payload.date;
  const startTime = payload.startTime;
  const endTime = payload.endTime;
  const tasksCompleted = payload.tasksCompleted || "[]";
  const linenChanged = payload.linenChanged || "[]";
  const refills = payload.refills || "[]";
  const status = payload.status || "Completed";
  
  if (!roomNumber || !staffId || !date || !startTime || !endTime) {
    return { success: false, message: "Parameter checklist kamar tidak lengkap." };
  }
  
  const duration = calculateMinutesBetween(startTime, endTime);
  
  let totalTasks = 0;
  let completedCount = 0;
  
  const room = findRowInSheet("tb_rooms", "room_number", roomNumber);
  if (room && room.checklist_config) {
    try {
      const config = JSON.parse(room.checklist_config);
      let submission = {};
      try {
        submission = JSON.parse(tasksCompleted);
      } catch (err) {
        submission = {};
      }
      
      for (let category in config) {
        const catConfig = config[category];
        const catSubmission = submission[category] || {};
        
        if (Array.isArray(catConfig)) {
          catConfig.forEach(item => {
            totalTasks++;
            if (catSubmission[item] === true || catSubmission[item] === "true") {
              completedCount++;
            }
          });
        } else if (catConfig && Array.isArray(catConfig.items)) {
          catConfig.items.forEach(item => {
            totalTasks++;
            const itemVal = catSubmission[item];
            if (catConfig.type === "checklist") {
              if (itemVal === true || itemVal === "true") {
                completedCount++;
              }
            } else if (catConfig.type === "in") {
              if (itemVal && (parseInt(itemVal.in, 10) > 0 || parseInt(itemVal, 10) > 0)) {
                completedCount++;
              }
            } else if (catConfig.type === "inout") {
              if (itemVal && (parseInt(itemVal.in, 10) > 0 || parseInt(itemVal.out, 10) > 0)) {
                completedCount++;
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn("Gagal menghitung KPI: " + e.toString());
    }
  }
  
  if (totalTasks === 0) totalTasks = 1;
  const completionScore = (completedCount / totalTasks) * 70;
  
  let efficiencyScore = 30;
  const targetMins = 15;
  if (duration > targetMins) {
    efficiencyScore = Math.max(0, 30 - (duration - targetMins) * 2);
  }
  const kpiScore = Number((completionScore + efficiencyScore).toFixed(2));
  
  const checklistId = "CKR" + Utilities.getUuid().substring(0, 8).toUpperCase();
  
  appendRowToSheet("tb_room_checklist", {
    checklist_id: checklistId,
    room_number: roomNumber,
    staff_id: staffId,
    date: date,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: duration,
    tasks_completed: tasksCompleted,
    linen_changed: linenChanged,
    refills: refills,
    status: status,
    kpi_score: kpiScore
  });
  
  // Update assignment status to Completed if exists for this date, room and staff
  try {
    const assData = getSheetData("tb_room_assignments");
    const assignment = assData.find(row => String(row.room_number) === String(roomNumber) && row.date === date && row.staff_id === staffId);
    if (assignment) {
      updateRowInSheet("tb_room_assignments", "assignment_id", assignment.assignment_id, {
        status: "Completed"
      });
    }
  } catch (err) {
    console.warn("Gagal memperbarui status penugasan: " + err.toString());
  }
  
  const oldStatus = room ? room.room_status : "VD";
  
  const tz = getSpreadsheet().getSpreadsheetTimeZone();
  const nowISO = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  
  updateRowInSheet("tb_rooms", "room_number", roomNumber, {
    room_status: "VC",
    last_cleaned_at: endTime,
    last_cleaned_by: staffId,
    last_updated: nowISO,
    remarks: "Dibersihkan otomatis via checklist."
  });
  
  const historyId = "HIS" + Utilities.getUuid().substring(0, 8).toUpperCase();
  const statusDuration = calculateLastStatusDuration(roomNumber, nowISO);
  const ideal_timer = room ? (room.ideal_timer_minutes || 30) : 30;
  let historyKpi = 100;
  if (statusDuration > ideal_timer) {
    historyKpi = Math.max(0, 100 - ((statusDuration - ideal_timer) / ideal_timer) * 100);
  }
  historyKpi = Number(historyKpi.toFixed(2));

  appendRowToSheet("tb_room_status_history", {
    history_id: historyId,
    room_number: roomNumber,
    old_status: oldStatus,
    new_status: "VC",
    changed_by: staffId,
    timestamp: nowISO,
    duration_minutes: statusDuration,
    ideal_timer_minutes: ideal_timer,
    kpi_score: historyKpi
  });
  
  return { 
    success: true, 
    message: "Laporan pembersihan kamar " + roomNumber + " terkirim. Skor KPI: " + kpiScore + ".",
    kpi_score: kpiScore
  };
}

/**
 * Submits public area task daily checklist updates
 */
function handleSubmitAreaTaskDailyAction(payload) {
  const areaId = payload.areaId || "";
  const areaName = payload.areaName || "";
  const areaShiftId = payload.areaShiftId || "";
  const staffId = payload.staffId;
  const date = payload.date;
  const status = payload.status;
  const remarks = payload.remarks || payload.notes || "";
  
  if (!staffId || !date || !status) {
    return { success: false, message: "Parameter checklist area publik tidak lengkap." };
  }
  
  const tz = getSpreadsheet().getSpreadsheetTimeZone();
  const nowISO = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  
  const dailyTasks = getSheetData("tb_area_tasks_daily");
  let existing = null;
  if (areaId && areaShiftId) {
    existing = dailyTasks.find(row => row.area_id === areaId && row.area_shift_id === areaShiftId && row.date === date);
  } else {
    // Fallback search by areaName
    existing = dailyTasks.find(row => row.area_name === areaName && row.date === date);
  }
  
  if (existing) {
    updateRowInSheet("tb_area_tasks_daily", "task_daily_id", existing.task_daily_id, {
      staff_id: staffId,
      status: status,
      remarks: remarks,
      updated_by: staffId,
      updated_at: nowISO
    });
    return { success: true, message: "Checklist area publik diperbarui." };
  } else {
    const taskDailyId = "ATD" + Utilities.getUuid().substring(0, 8).toUpperCase();
    
    // Resolve areaId and areaShiftId if only names were passed
    let resolvedAreaId = areaId;
    if (!resolvedAreaId && areaName) {
      const area = findRowInSheet("tb_areas", "area_name", areaName);
      if (area) resolvedAreaId = area.area_id;
    }
    
    appendRowToSheet("tb_area_tasks_daily", {
      task_daily_id: taskDailyId,
      area_id: resolvedAreaId || "AR_UNKNOWN",
      area_shift_id: areaShiftId || "SH_UNKNOWN",
      staff_id: staffId,
      date: date,
      status: status,
      remarks: remarks,
      updated_by: staffId,
      updated_at: nowISO
    });
    return { success: true, message: "Checklist area publik berhasil direkam." };
  }
}

/**
 * Handles secure ledger writing with LockService
 */
function handleAddInventoryTransactionAction(payload) {
  const itemId = payload.itemId;
  const userId = payload.userId;
  const type = payload.type;
  const quantity = parseInt(payload.quantity, 10);
  const date = payload.date;
  const remarks = payload.remarks || "";
  
  if (!itemId || !userId || !type || isNaN(quantity) || !date) {
    return { success: false, message: "Parameter transaksi inventaris tidak lengkap." };
  }
  
  const item = findRowInSheet("tb_inventory", "item_id", itemId);
  if (!item) {
    return { success: false, message: "Barang tidak ditemukan di master inventaris." };
  }
  
  if (type === "out" && (parseInt(item.stock_current, 10) || 0) < quantity) {
    return { success: false, message: "Stok kurang! Stok saat ini: " + item.stock_current + ", Pemakaian: " + quantity };
  }
  
  const txId = "TX" + Utilities.getUuid().substring(0, 8).toUpperCase();
  const tz = getSpreadsheet().getSpreadsheetTimeZone();
  const timestampISO = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  
  appendRowToSheet("tb_inventory_transactions", {
    transaction_id: txId,
    item_id: itemId,
    user_id: userId,
    type: type,
    quantity: quantity,
    date: date,
    timestamp: timestampISO,
    remarks: remarks
  });
  
  const allTransactions = getSheetData("tb_inventory_transactions")
    .filter(row => row.item_id === itemId);
    
  let totalIn = 0;
  let totalOut = 0;
  
  allTransactions.forEach(tx => {
    const qty = parseInt(tx.quantity, 10) || 0;
    if (tx.type === "in") {
      totalIn += qty;
    } else if (tx.type === "out") {
      totalOut += qty;
    } else if (tx.type === "correction") {
      if (qty > 0) {
        totalIn += qty;
      } else {
        totalOut += Math.abs(qty);
      }
    }
  });
  
  const initial = parseInt(item.stock_initial, 10) || 0;
  const current = initial + totalIn - totalOut;
  
  updateRowInSheet("tb_inventory", "item_id", itemId, {
    stock_in: totalIn,
    stock_out: totalOut,
    stock_current: current
  });
  
  return { 
    success: true, 
    message: "Transaksi tercatat. Stok saat ini: " + current + ".", 
    stock_current: current 
  };
}

/**
 * Submits periodic housekeeping project report
 */
function handleSubmitProjectAction(payload) {
  const title = payload.title;
  const description = payload.description || "";
  const type = payload.type;
  const staffId = payload.staffId;
  const date = payload.date;
  
  if (!title || !type || !staffId || !date) {
    return { success: false, message: "Parameter pengajuan projek tidak lengkap." };
  }
  
  let photoUrl = "";
  if (payload.photoBase64 && payload.photoName) {
    try {
      photoUrl = saveFileToDrive(payload.photoBase64, payload.photoName);
    } catch (e) {
      return { success: false, message: "Gagal menyimpan foto proyek: " + e.toString() };
    }
  }
  
  const projectId = "PRJ" + Utilities.getUuid().substring(0, 8).toUpperCase();
  
  appendRowToSheet("tb_housekeeping_projects", {
    project_id: projectId,
    title: title,
    description: description,
    type: type,
    staff_id: staffId,
    photo_url: photoUrl,
    date: date,
    status: "Pending",
    approved_by: "",
    approved_at: ""
  });
  
  return { success: true, message: "Projek berhasil diajukan dengan ID: " + projectId, photo_url: photoUrl };
}

/**
 * Manager approves/rejects housekeeping project
 */
function handleApproveProjectAction(payload) {
  const projectId = payload.projectId;
  const managerId = payload.managerId;
  const status = payload.status;
  
  if (!projectId || !managerId || !status) {
    return { success: false, message: "Parameter persetujuan projek tidak lengkap." };
  }
  
  const tz = getSpreadsheet().getSpreadsheetTimeZone();
  const timeStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  
  const success = updateRowInSheet("tb_housekeeping_projects", "project_id", projectId, {
    status: status,
    approved_by: managerId,
    approved_at: timeStr
  });
  
  if (!success) {
    return { success: false, message: "Laporan proyek tidak ditemukan." };
  }
  
  return { success: true, message: "Laporan projek telah " + (status === "Approved" ? "disetujui." : "ditolak.") };
}

/**
 * Submits staff work project report
 */
function handleSubmitStaffWorkProjectAction(payload) {
  const title = payload.title;
  const description = payload.description || "";
  const period = payload.period;
  const staffId = payload.staffId;
  const date = payload.date;
  
  if (!title || !period || !staffId || !date) {
    return { success: false, message: "Parameter pengajuan projek pekerjaan staf tidak lengkap." };
  }
  
  let photoUrl = "";
  if (payload.photoBase64 && payload.photoName) {
    try {
      photoUrl = saveFileToDrive(payload.photoBase64, payload.photoName);
    } catch (e) {
      return { success: false, message: "Gagal menyimpan foto projek pekerjaan staf: " + e.toString() };
    }
  }
  
  const workProjectId = "WPRJ" + Utilities.getUuid().substring(0, 8).toUpperCase();
  
  appendRowToSheet("tb_staff_work_projects", {
    work_project_id: workProjectId,
    title: title,
    description: description,
    period: period,
    staff_id: staffId,
    photo_url: photoUrl,
    date: date
  });
  
  return { success: true, message: "Projek pekerjaan staf berhasil diajukan dengan ID: " + workProjectId, photo_url: photoUrl };
}

// --- CRUD & SYSTEM MANAGEMENT ACTION HANDLERS ---

// --- GENERIC CRUD HANDLERS ---

function handleCreateRecord(payload) {
  const sheetName = payload.sheetName;
  const record = payload.record;
  if (!sheetName || !record) return { success: false, message: "Parameter tidak lengkap." };
  
  // Unique constraints checking
  if (sheetName === "tb_rooms" && findRowInSheet("tb_rooms", "room_number", record.room_number)) {
    return { success: false, message: "Nomor kamar sudah terdaftar." };
  }
  if (sheetName === "tb_users" && (findRowInSheet("tb_users", "user_id", record.user_id) || findRowInSheet("tb_users", "username", record.username))) {
    return { success: false, message: "Karyawan atau username sudah terdaftar." };
  }
  if (sheetName === "tb_shifts" && findRowInSheet("tb_shifts", "shift_id", record.shift_id)) {
    return { success: false, message: "ID Shift sudah digunakan." };
  }
  if (sheetName === "tb_inventory" && findRowInSheet("tb_inventory", "item_id", record.item_id)) {
    return { success: false, message: "ID barang sudah terdaftar." };
  }
  if (sheetName === "tb_checklist_master" && findRowInSheet("tb_checklist_master", "task_id", record.task_id)) {
    return { success: false, message: "ID checklist tugas sudah terdaftar." };
  }
  if (sheetName === "tb_settings" && findRowInSheet("tb_settings", "setting_id", record.setting_id)) {
    return { success: false, message: "ID pengaturan sudah terdaftar." };
  }
  if (sheetName === "tb_room_assignments" && findRowInSheet("tb_room_assignments", "assignment_id", record.assignment_id)) {
    return { success: false, message: "ID penugasan kamar sudah terdaftar." };
  }
  if (sheetName === "tb_areas" && findRowInSheet("tb_areas", "area_id", record.area_id)) {
    return { success: false, message: "ID area sudah terdaftar." };
  }
  if (sheetName === "tb_area_shifts" && findRowInSheet("tb_area_shifts", "area_shift_id", record.area_shift_id)) {
    return { success: false, message: "ID shift area sudah terdaftar." };
  }
  if (sheetName === "tb_staff_area_tasks" && findRowInSheet("tb_staff_area_tasks", "task_id", record.task_id)) {
    return { success: false, message: "ID tugas staf area sudah terdaftar." };
  }
  if (sheetName === "tb_area_tasks_daily" && findRowInSheet("tb_area_tasks_daily", "task_daily_id", record.task_daily_id)) {
    return { success: false, message: "ID tugas harian area sudah terdaftar." };
  }
  if (sheetName === "tb_housekeeping_projects" && findRowInSheet("tb_housekeeping_projects", "project_id", record.project_id)) {
    return { success: false, message: "ID projek housekeeping sudah terdaftar." };
  }
  if (sheetName === "tb_staff_work_projects" && findRowInSheet("tb_staff_work_projects", "work_project_id", record.work_project_id)) {
    return { success: false, message: "ID projek pekerjaan staf sudah terdaftar." };
  }

  appendRowToSheet(sheetName, record);
  return { success: true, message: "Data baru berhasil ditambahkan." };
}

function handleUpdateRecord(payload) {
  const sheetName = payload.sheetName;
  const keyCol = payload.keyCol;
  const keyValue = payload.keyValue;
  const updates = payload.updates;
  
  if (!sheetName || !keyCol || !keyValue || !updates) {
    return { success: false, message: "Parameter pembaruan tidak lengkap." };
  }
  
  // Special business logic trigger (e.g. room audit history logs)
  if (sheetName === "tb_rooms") {
    const room = findRowInSheet("tb_rooms", "room_number", keyValue);
    if (room && updates.room_status && room.room_status !== updates.room_status) {
      const tz = getSpreadsheet().getSpreadsheetTimeZone();
      const nowISO = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
      
      const historyId = "HIS" + Utilities.getUuid().substring(0, 8).toUpperCase();
      const duration = calculateLastStatusDuration(keyValue, nowISO);
      const ideal_timer = room.ideal_timer_minutes || 30;
      let kpi_score = 100;
      if (duration > ideal_timer) {
        kpi_score = Math.max(0, 100 - ((duration - ideal_timer) / ideal_timer) * 100);
      }
      kpi_score = Number(kpi_score.toFixed(2));
      
      // Update last_cleaned_at/by if clean
      if (updates.room_status === "VC" || updates.room_status === "OC") {
        updates.last_cleaned_at = nowISO;
        updates.last_cleaned_by = payload.userId || "system";
      }
      updates.last_updated = nowISO;
      
      appendRowToSheet("tb_room_status_history", {
        history_id: historyId,
        room_number: updates.room_number || keyValue,
        old_status: room.room_status,
        new_status: updates.room_status,
        changed_by: payload.userId || "system",
        timestamp: nowISO,
        duration_minutes: duration,
        ideal_timer_minutes: ideal_timer,
        kpi_score: kpi_score
      });
    }
  }
  
  const success = updateRowInSheet(sheetName, keyCol, keyValue, updates);
  if (!success) return { success: false, message: "Data tidak ditemukan." };
  return { success: true, message: "Data berhasil diperbarui." };
}

function handleDeleteRecord(payload) {
  const sheetName = payload.sheetName;
  const keyCol = payload.keyCol;
  const keyValue = payload.keyValue;
  
  if (!sheetName || !keyCol || !keyValue) {
    return { success: false, message: "Parameter penghapusan tidak lengkap." };
  }
  
  const rowInfo = findRowInSheet(sheetName, keyCol, keyValue);
  if (!rowInfo) return { success: false, message: "Data tidak ditemukan." };
  
  const sheet = getSheet(sheetName);
  sheet.deleteRow(rowInfo._rowNum);
  return { success: true, message: "Data berhasil dihapus." };
}

function handleUpdateStaffChecklistAssignmentsAction(payload) {
  const userId = payload.userId;
  const taskIds = payload.taskIds || [];
  
  if (!userId) return { success: false, message: "Staf ID wajib disertakan." };
  
  const sheet = getSheet("tb_staff_checklist_assignments");
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow > 1) {
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const userColIdx = headers.indexOf("user_id");
    const taskColIdx = headers.indexOf("task_id");
    const enabledColIdx = headers.indexOf("is_enabled");
    
    const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const taskRowMap = {};
    
    rows.forEach((row, i) => {
      if (row[userColIdx] === userId) {
        taskRowMap[row[taskColIdx]] = i + 2;
        sheet.getRange(i + 2, enabledColIdx + 1).setValue(false);
      }
    });
    
    taskIds.forEach(taskId => {
      if (taskRowMap[taskId]) {
        sheet.getRange(taskRowMap[taskId], enabledColIdx + 1).setValue(true);
      } else {
        const asgId = "ASG" + Utilities.getUuid().substring(0, 8).toUpperCase();
        appendRowToSheet("tb_staff_checklist_assignments", {
          assignment_id: asgId,
          user_id: userId,
          task_id: taskId,
          is_enabled: true
        });
      }
    });
  } else {
    taskIds.forEach(taskId => {
      const asgId = "ASG" + Utilities.getUuid().substring(0, 8).toUpperCase();
      appendRowToSheet("tb_staff_checklist_assignments", {
        assignment_id: asgId,
        user_id: userId,
        task_id: taskId,
        is_enabled: true
      });
    });
  }
  
  return { success: true, message: "Penugasan checklist staf berhasil diperbarui." };
}

/**
 * Performs Monthly Reset with data archiving
 */
function handleMonthlyResetAction() {
  const ss = getSpreadsheet();
  const now = new Date();
  const tz = ss.getSpreadsheetTimeZone();
  const monthStr = Utilities.formatDate(now, tz, "yyyy_MM");
  
  const tablesToArchive = ["tb_room_checklist", "tb_area_tasks_daily", "tb_inventory_transactions"];
  const archived = [];
  
  tablesToArchive.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) {
      const archiveName = "archive_" + name.substring(3) + "_" + monthStr;
      
      const oldArch = ss.getSheetByName(archiveName);
      if (oldArch) ss.deleteSheet(oldArch);
      
      const newSheet = sheet.copyTo(ss);
      newSheet.setName(archiveName);
      
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      archived.push(archiveName);
    }
  });
  
  const invSheet = getSheet("tb_inventory");
  const invData = getSheetData("tb_inventory");
  
  invData.forEach(item => {
    updateRowInSheet("tb_inventory", "item_id", item.item_id, {
      stock_initial: item.stock_current,
      stock_in: 0,
      stock_out: 0,
      stock_current: item.stock_current
    });
  });
  
  return { 
    success: true, 
    message: "Reset bulanan selesai. Membuat arsip: " + (archived.join(", ") || "tidak ada data") + 
             ". Kolom Stok Awal inventaris disinkronkan ke Stok Akhir saat ini." 
  };
}

// --- SELF INTEGRATED UNIT TESTS ---

/**
 * Runs internal unit tests to verify logic correctness
 */
function runUnitTests() {
  const results = [];
  
  const t1 = timeToMinutes("07:30");
  results.push({ name: "timeToMinutes Normal", pass: t1 === 450, expected: 450, actual: t1 });
  
  const dummyShift = { check_in_time: "07:00", pre_check_in_minutes: 50 };
  const w1 = isCheckInAllowed(dummyShift, "06:15");
  const w2 = isCheckInAllowed(dummyShift, "05:59");
  results.push({ name: "isCheckInAllowed (In Window)", pass: w1 === true, expected: true, actual: w1 });
  results.push({ name: "isCheckInAllowed (Out Window)", pass: w2 === false, expected: false, actual: w2 });
  
  const overnightShift = { check_in_time: "23:00", pre_check_in_minutes: 50 };
  const w3 = isCheckInAllowed(overnightShift, "22:15");
  const w4 = isCheckInAllowed(overnightShift, "21:59");
  results.push({ name: "isCheckInAllowed Overnight (In Window)", pass: w3 === true, expected: true, actual: w3 });
  results.push({ name: "isCheckInAllowed Overnight (Out Window)", pass: w4 === false, expected: false, actual: w4 });
  
  const allPass = results.every(r => r.pass);
  return {
    success: allPass,
    message: allPass ? "Semua unit test internal berhasil!" : "Beberapa unit test gagal.",
    details: results
  };
}

/**
 * Reseeds testing data by clearing table content and running seeds again.
 * Run this function from the Apps Script Editor to reload the database.
 */
function reseedDatabase() {
  const ss = getSpreadsheet();
  const tables = [
    "tb_rooms",
    "tb_room_assignments",
    "tb_room_status_history",
    "tb_room_checklist"
  ];
  tables.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      seedSheetData(name);
    }
  });
  return {
    success: true,
    message: "Reseed data testing untuk tb_rooms, tb_room_assignments, tb_room_status_history, dan tb_room_checklist selesai!"
  };
}

/**
 * Handle Generation of Daily Data
 */
function handleGenerateDailyDataAction(payload) {
  const managerId = payload.userId;
  const tz = getSpreadsheet().getSpreadsheetTimeZone();
  const now = new Date();
  const todayStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");
  let stats = { attendance: 0, room_checklists: 0, area_tasks: 0, housekeeping_projects: 0 };

  try {
    // 1. Generate Attendance
    const users = getSheetData("tb_users");
    const activeStaff = users.filter(u => u.status === "active" && u.role === "staff");
    const attendance = getSheetData("tb_attendance");
    
    // 1. Process previous days' pending attendances to "alpha"
    attendance.forEach(a => {
      if (a.status === "pending" && a.date !== todayStr) {
        updateRowInSheet("tb_attendance", "attendance_id", a.attendance_id, {
          status: "alpha"
        });
      }
    });

    activeStaff.forEach(staff => {
      const existing = attendance.find(a => a.user_id === staff.user_id && a.date === todayStr);
      if (!existing) {
        appendRowToSheet("tb_attendance", {
          attendance_id: "ATT" + Utilities.getUuid().substring(0, 8).toUpperCase(),
          user_id: staff.user_id,
          shift_id: staff.shift_id,
          date: todayStr,
          check_in_time: "",
          check_out_time: "",
          status: "pending",
          late_checkout_minutes: 0
        });
        stats.attendance++;
      }
    });

    // 2. Generate Room Checklists based on Room Assignments
    const roomAsgs = getSheetData("tb_room_assignments");
    const todayAsgs = roomAsgs.filter(a => a.date === todayStr);
    const existingChecklists = getSheetData("tb_room_checklist").filter(c => c.date === todayStr);
    
    todayAsgs.forEach(asg => {
      const existing = existingChecklists.find(c => String(c.room_number) === String(asg.room_number) && c.staff_id === asg.staff_id);
      if (!existing) {
        appendRowToSheet("tb_room_checklist", {
          checklist_id: "CHK" + Utilities.getUuid().substring(0, 8).toUpperCase(),
          room_number: asg.room_number,
          staff_id: asg.staff_id,
          date: todayStr,
          start_time: "",
          end_time: "",
          duration_minutes: 0,
          tasks_completed: "{}",
          linen_changed: "[]",
          refills: "[]",
          status: "Pending",
          kpi_score: 0
        });
        stats.room_checklists++;
      }
    });

    // 3. Generate Area Tasks Daily
    const staffAreaTasks = getSheetData("tb_staff_area_tasks");
    const existingAreaTasks = getSheetData("tb_area_tasks_daily").filter(t => t.date === todayStr);
    
    staffAreaTasks.forEach(sat => {
      const existing = existingAreaTasks.find(t => t.area_id === sat.area_id && t.area_shift_id === sat.area_shift_id && t.staff_id === sat.staff_id);
      if (!existing) {
        appendRowToSheet("tb_area_tasks_daily", {
          task_daily_id: "ATD" + Utilities.getUuid().substring(0, 8).toUpperCase(),
          area_id: sat.area_id,
          area_shift_id: sat.area_shift_id,
          staff_id: sat.staff_id,
          date: todayStr,
          status: "Pending",
          remarks: "",
          updated_by: "",
          updated_at: ""
        });
        stats.area_tasks++;
      }
    });

    // 4. Generate Housekeeping Projects
    const masterProjects = getSheetData("tb_housekeeping_project_master");
    const activeMasters = masterProjects.filter(p => String(p.is_active) !== "false");
    const existingProjects = getSheetData("tb_housekeeping_projects");
    
    activeMasters.forEach(master => {
      let shouldGenerate = false;
      const startDate = new Date(master.start_date);
      // Ensure the start date has passed
      if (now < new Date(startDate.getTime() - 86400000)) return; 
      
      const lastGenDateStr = master.last_generated_date;
      
      if (!lastGenDateStr) {
        shouldGenerate = true;
      } else {
        const lastGen = new Date(lastGenDateStr);
        const daysDiff = Math.floor((now - lastGen) / (1000 * 60 * 60 * 24));
        
        if (master.period_type === "Daily" && daysDiff >= 1) {
          shouldGenerate = true;
        } else if (master.period_type === "Weekly" && daysDiff >= 7) {
          shouldGenerate = true;
        } else if (master.period_type === "Monthly") {
          const nextMonth = new Date(lastGen);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          if (now >= nextMonth) {
            shouldGenerate = true;
          }
        }
      }
      
      if (shouldGenerate) {
        // Prevent duplicate for today
        const isDuplicate = existingProjects.some(p => p.master_id === master.master_id && p.date === todayStr);
        if (!isDuplicate) {
          appendRowToSheet("tb_housekeeping_projects", {
            project_id: "PRJ" + Utilities.getUuid().substring(0, 8).toUpperCase(),
            master_id: master.master_id,
            title: master.title,
            description: master.description,
            type: master.period_type,
            staff_ids: master.staff_ids, // Multi-staff assignment
            photo_url: "",
            date: todayStr,
            status: "Pending",
            approved_by: "",
            approved_at: ""
          });
          
          updateRowInSheet("tb_housekeeping_project_master", "master_id", master.master_id, {
            last_generated_date: todayStr
          });
          stats.housekeeping_projects++;
        }
      }
    });

    return { 
      success: true, 
      message: "Data harian berhasil di-generate. (Absensi: " + stats.attendance + ", Ceklis: " + stats.room_checklists + ", Area: " + stats.area_tasks + ", Proyek: " + stats.housekeeping_projects + ")" 
    };

  } catch (err) {
    return { success: false, message: "Gagal generate data harian: " + err.toString() };
  }
}
