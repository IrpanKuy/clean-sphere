/**
 * CleanSphere Pro: Housekeeping Management System Frontend
 * State Management & Client API Wrapper
 * 
 * Stores local variables synced from Google Sheets and provides 
 * functions to communicate with the Apps Script API endpoint.
 */

// --- CONFIGURATION ---
// REPLACE THIS URL with your deployed Google Apps Script Web App URL
var GAS_URL = "https://script.google.com/macros/s/AKfycbxANyxlx-1yN9PebT_U6KGffzbbQJN-oI90jWoueOm9Y8UTBAe16gUaVDPLZA_QNsnR5g/exec";

// --- GLOBAL VARIABLES (STATE CONTAINER) ---
var appState = Vue.reactive({
    users: [],
    shifts: [],
    attendance: [],
    leave_requests: [],
    settings: [],
    rooms: [],
    room_assignments: [],
    room_status_history: [],
    room_statuses: [],
    areas: [],
    area_shifts: [],
    staff_area_tasks: [],
    area_tasks_daily: [],
    inventory_categories: [],
    checklist_master: [],
    staff_checklist_assignments: [],
    room_checklist: [],
    public_area_checklist: [], // Backwards compatibility
    projects: [], // Backwards compatibility
    housekeeping_project_master: [],
    housekeeping_projects: [],
    housekeeping_submissions: [],
    staff_work_projects: [],
    inventory: [],
    inventory_transactions: [],

    // Auth state
    currentUser: null,
    sessionToken: null,

    // UI States
    toast: { show: false, message: "", type: "" },
    syncing: false
});

// --- CORE UTILITY FUNCTIONS ---

function calculateMinutesBetween(startStr, endStr) {
    const timeToMins = (str) => {
        const clean = String(str).replace('.', ':');
        const parts = clean.split(':');
        return parseInt(parts[0], 10) * 60 + (parseInt(parts[1], 10) || 0);
    };
    let s = timeToMins(startStr);
    let e = timeToMins(endStr);
    if (e < s) e += 1440; // overnight
    return e - s;
}

/**
 * Encrypts password using native Web Crypto API SHA-256
 */
async function hashPasswordSHA256(plainPassword) {
    if (!plainPassword) return "";
    const msgBuffer = new TextEncoder().encode(plainPassword);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Client-Side Jittered Exponential Backoff Retry Wrapper for API calls
 */
async function runWithRetry(payload, maxRetries = 3) {
    if (GAS_URL.includes("YOUR_DEPLOYED_ID_HERE")) {
        throw new Error("GAS_URL belum dikonfigurasi di data.js. Silakan ganti dengan URL Web App Apps Script Anda.");
    }

    let delay = 1000; // Start with 1 second delay
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(GAS_URL, {
                method: "POST",
                body: JSON.stringify(payload)
                // Removed Content-Type: application/json header to prevent CORS OPTIONS preflight block
            });

            if (response.status === 429 || response.status === 503) {
                throw new Error(`Server busy (HTTP ${response.status})`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (attempt === maxRetries) {
                throw new Error("Koneksi gagal setelah beberapa percobaan: " + error.message);
            }
            const jitter = Math.random() * 500; // random 0-500ms
            const backoffDelay = delay * Math.pow(2, attempt - 1) + jitter;
            console.warn(`Attempt ${attempt} failed. Retrying in ${Math.round(backoffDelay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
    }
}

/**
 * Compresses an image file using HTML5 Canvas to under 1MB
 */
function compressImage(file, maxWidth = 1280, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to quality-reduced JPEG base64 string
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve({
                    base64: dataUrl,
                    name: file.name
                });
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

/**
 * Triggers a Toast Notification (Navy Soft background by default)
 */
function showToast(message, type = "success") {
    console.log(`[Toast ${type}] ${message}`);

    if (typeof Swal !== 'undefined') {
        if (type === "pending") {
            Swal.fire({
                title: message,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
        } else if (type === "error") {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: message,
                confirmButtonColor: '#EF4444'
            });
        } else {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            Toast.fire({
                icon: type === 'success' ? 'success' : 'info',
                title: message
            });
        }
    } else {
        console.warn("SweetAlert2 is not defined.");
    }
}

/**
 * Shows SweetAlert2 loading spinner
 */
function showLoading(message = "Memproses...") {
    showToast(message, "pending");
}

/**
 * Hides SweetAlert2 loading spinner or any open dialog
 */
function hideLoading() {
    if (typeof Swal !== 'undefined') {
        Swal.close();
    }
}

// --- API ACTIONS ---

/**
 * Fetches all spreadsheet tables and populates appState
 */
async function fetchDataFromServer(skipSwal = false) {
    appState.syncing = true;
    if (!skipSwal) {
        showToast("⏳ Sinkronisasi data basis data...", "pending");
    }
    try {
        const weeks = localStorage.getItem("cs_sync_weeks") || "all";
        const res = await runWithRetry({ action: "getAllData", weeks: weeks });
        if (res.success) {
            // Populate state tables
            Object.keys(res).forEach(key => {
                if (Array.isArray(res[key])) {
                    appState[key] = res[key];
                }
            });
            if (!skipSwal) {
                showToast("✅ Sinkronisasi Berhasil", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal memuat data");
        }
    } catch (error) {
        if (!skipSwal) {
            showToast(`⚠️ Sinkronisasi Gagal! ${error.message}`, "error");
        }
        return false;
    } finally {
        appState.syncing = false;
    }
}

/**
 * Authenticates user, saves session token locally and fetches DB data
 */
async function loginUser(username, password) {
    try {
        showToast("⏳ Menghubungkan ke server...", "pending");
        const hashedPassword = await hashPasswordSHA256(password);

        const res = await runWithRetry({
            action: "login",
            username: username,
            passwordHash: hashedPassword
        });

        if (res.success) {
            appState.currentUser = res.user;
            appState.sessionToken = res.sessionToken;
            localStorage.setItem("cs_session_token", res.sessionToken);

            // Load all database contents immediately after login without showing second loader
            await fetchDataFromServer(true);
            showToast("✅ Login Berhasil!", "success");
            return { success: true, user: res.user };
        } else {
            showToast(`⚠️ Gagal Masuk: ${res.message}`, "error");
            return { success: false, message: res.message };
        }
    } catch (error) {
        showToast(`⚠️ Koneksi Error: ${error.message}`, "error");
        return { success: false, message: error.message };
    }
}

async function checkAutoLogin() {
    const token = localStorage.getItem("cs_session_token");
    if (!token) return false;

    try {
        const res = await runWithRetry({
            action: "verifySession",
            sessionToken: token
        });

        if (res.success) {
            appState.currentUser = res.user;
            appState.sessionToken = token;

            // Load database contents silently
            await fetchDataFromServer(true);
            return true;
        } else {
            // Invalid session token, clean storage
            localStorage.removeItem("cs_session_token");
            showToast("Sesi kedaluwarsa. Silakan login kembali.", "info");
            return false;
        }
    } catch (error) {
        localStorage.removeItem("cs_session_token");
        showToast(`⚠️ Gagal menghubungkan sesi: ${error.message}`, "error");
        return false;
    }
}


/**
 * Logs out user and clears sessions
 */
function logoutUser() {
    localStorage.removeItem("cs_session_token");
    appState.currentUser = null;
    appState.sessionToken = null;
    showToast("Anda telah keluar dari aplikasi.", "info");
}

/**
 * Staff Clock-In action
 */
async function clockInUser(shiftId, timeStr, dateStr) {
    try {
        showToast("⏳ Merekam absensi masuk...", "pending");
        const res = await runWithRetry({
            action: "clockIn",
            userId: appState.currentUser.user_id,
            shiftId: shiftId,
            date: dateStr,
            time: timeStr
        });

        if (res.success) {
            showToast("✅ " + res.message, "success");
            const idx = appState.attendance.findIndex(a => a.user_id === appState.currentUser.user_id && a.date === dateStr);
            if (idx !== -1) {
                appState.attendance[idx].check_in_time = timeStr;
                appState.attendance[idx].status = "pending";
            } else {
                appState.attendance.push({
                    attendance_id: res.attendance_id || ("ATT" + Math.random().toString(36).substring(2, 10).toUpperCase()),
                    user_id: appState.currentUser.user_id,
                    shift_id: shiftId,
                    date: dateStr,
                    check_in_time: timeStr,
                    check_out_time: "",
                    status: "pending",
                    late_checkout_minutes: 0
                });
            }
            return true;
        } else {
            showToast(`⚠️ Gagal: ${res.message}`, "error");
            return false;
        }
    } catch (error) {
        showToast(`⚠️ Masalah Koneksi: ${error.message}`, "error");
        return false;
    }
}

/**
 * Staff Clock-Out action
 */
async function clockOutUser(timeStr, dateStr) {
    try {
        showToast("⏳ Merekam absensi pulang...", "pending");
        const res = await runWithRetry({
            action: "clockOut",
            userId: appState.currentUser.user_id,
            date: dateStr,
            time: timeStr
        });

        if (res.success) {
            showToast("✅ " + res.message, "success");
            const idx = appState.attendance.findIndex(a => a.user_id === appState.currentUser.user_id && a.date === dateStr && a.status === "pending");
            if (idx !== -1) {
                appState.attendance[idx].check_out_time = timeStr;
                const sh = appState.shifts.find(s => s.shift_id === appState.currentUser.shift_id);
                if (sh) {
                    const cleanIn = String(appState.attendance[idx].check_in_time).replace('.', ':');
                    const partsIn = cleanIn.split(':');
                    const checkInMins = parseInt(partsIn[0], 10) * 60 + (parseInt(partsIn[1], 10) || 0);

                    const cleanShiftIn = String(sh.check_in_time).replace('.', ':');
                    const partsShiftIn = cleanShiftIn.split(':');
                    const shiftInMins = parseInt(partsShiftIn[0], 10) * 60 + (parseInt(partsShiftIn[1], 10) || 0);

                    appState.attendance[idx].status = (checkInMins > shiftInMins) ? "terlambat" : "hadir";
                } else {
                    appState.attendance[idx].status = "hadir";
                }
            }
            return true;
        } else {
            showToast(`⚠️ Gagal: ${res.message}`, "error");
            return false;
        }
    } catch (error) {
        showToast(`⚠️ Masalah Koneksi: ${error.message}`, "error");
        return false;
    }
}

/**
 * Updates room status with Optimistic UI rendering & Collision Rollback
 */
async function updateRoomStatusLocal(roomNumber, newStatus, remarks = "") {
    const roomIndex = appState.rooms.findIndex(r => String(r.room_number) === String(roomNumber));
    if (roomIndex === -1) {
        showToast("Kamar tidak ditemukan secara lokal.", "error");
        return false;
    }

    showLoading("Menyinkronkan status kamar...");

    try {
        const res = await runWithRetry({
            action: "updateRoomStatus",
            roomNumber: roomNumber,
            newStatus: newStatus,
            lastUpdatedLocal: appState.rooms[roomIndex].last_updated,
            userId: appState.currentUser.user_id,
            remarks: remarks
        });

        if (res.success) {
            const oldStatus = appState.rooms[roomIndex].room_status;
            appState.rooms[roomIndex].room_status = newStatus;
            appState.rooms[roomIndex].remarks = remarks;
            appState.rooms[roomIndex].last_updated = res.last_updated;

            // Add a new entry to the room status history list locally to match
            appState.room_status_history.push({
                history_id: "HIS" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                room_number: String(roomNumber),
                old_status: oldStatus,
                new_status: newStatus,
                changed_by: appState.currentUser.user_id,
                timestamp: new Date().toISOString(),
                duration_minutes: 0
            });

            hideLoading();

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: `Kamar ${roomNumber} berhasil disinkronkan ke status ${newStatus}.`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast(`✅ Kamar ${roomNumber} berhasil disinkronkan.`, "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Kesalahan tidak dikenal.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Adds a new room to database
 */
async function addRoomLocal(roomNumber, roomStatus, checklistConfig = "{}", remarks = "", idealTimer = 30) {
    showLoading("Menambahkan kamar baru...");
    try {
        const defaultInventory = JSON.stringify([
            { name: "Sabun Mandi", qty: 2, min_qty: 1 },
            { name: "Sikat Gigi", qty: 2, min_qty: 1 },
            { name: "Shampoo", qty: 2, min_qty: 1 },
            { name: "Handuk", qty: 2, min_qty: 2 },
            { name: "Tisu Toilet", qty: 1, min_qty: 1 }
        ]);
        const res = await runWithRetry({
            action: "addRoom",
            room_number: roomNumber,
            room_status: roomStatus,
            checklist_config: typeof checklistConfig === "string" ? checklistConfig : JSON.stringify(checklistConfig),
            remarks: remarks,
            ideal_timer_minutes: idealTimer,
            room_inventory: defaultInventory
        });
        if (res.success) {
            // Local state mutation
            appState.rooms.push({
                room_number: String(roomNumber),
                room_status: roomStatus,
                checklist_config: typeof checklistConfig === "string" ? checklistConfig : JSON.stringify(checklistConfig),
                remarks: remarks,
                ideal_timer_minutes: idealTimer,
                room_inventory: defaultInventory,
                last_cleaned_at: "",
                last_cleaned_by: "",
                last_updated: new Date().toISOString()
            });

            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: `Kamar ${roomNumber} berhasil ditambahkan.`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast(`✅ Kamar ${roomNumber} berhasil ditambahkan.`, "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menambahkan kamar.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Updates room number, status, checklist configuration, and remarks
 */
async function updateRoomLocal(oldRoomNumber, newRoomNumber, roomStatus, checklistConfig = "{}", remarks = "", idealTimer = 30) {
    showLoading("Menyimpan pembaruan kamar...");
    try {
        const room = appState.rooms.find(r => String(r.room_number) === String(oldRoomNumber));
        const currentInventory = room ? (room.room_inventory || "[]") : "[]";
        const res = await runWithRetry({
            action: "updateRoom",
            oldRoomNumber: oldRoomNumber,
            newRoomNumber: newRoomNumber,
            roomStatus: roomStatus,
            checklist_config: typeof checklistConfig === "string" ? checklistConfig : JSON.stringify(checklistConfig),
            remarks: remarks,
            ideal_timer_minutes: idealTimer,
            room_inventory: currentInventory,
            userId: appState.currentUser.user_id
        });
        if (res.success) {
            // Local state mutation
            const idx = appState.rooms.findIndex(r => String(r.room_number) === String(oldRoomNumber));
            if (idx !== -1) {
                appState.rooms[idx].room_number = String(newRoomNumber);
                appState.rooms[idx].room_status = roomStatus;
                appState.rooms[idx].checklist_config = typeof checklistConfig === "string" ? checklistConfig : JSON.stringify(checklistConfig);
                appState.rooms[idx].remarks = remarks;
                appState.rooms[idx].ideal_timer_minutes = idealTimer;
                appState.rooms[idx].last_updated = new Date().toISOString();
            }

            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: `Kamar ${newRoomNumber} berhasil diperbarui.`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast(`✅ Kamar ${newRoomNumber} berhasil diperbarui.`, "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal memperbarui kamar.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Deletes a room from database
 */
async function deleteRoomLocal(roomNumber) {
    showLoading("Menghapus kamar...");
    try {
        const res = await runWithRetry({
            action: "deleteRoom",
            roomNumber: roomNumber
        });
        if (res.success) {
            // Local state mutation
            appState.rooms = appState.rooms.filter(r => String(r.room_number) !== String(roomNumber));

            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: `Kamar ${roomNumber} berhasil dihapus.`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast(`✅ Kamar ${roomNumber} berhasil dihapus.`, "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menghapus kamar.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Submits room checklist
 */
async function submitRoomChecklistLocal(roomNumber, dateStr, startTime, endTime, tasksCompleted, linenChanged = [], refills = [], targetRoomStatus = "VC", remarks = "") {
    showLoading("Mengirim laporan pembersihan...");
    try {
        const res = await runWithRetry({
            action: "submitRoomChecklist",
            roomNumber: roomNumber,
            staffId: appState.currentUser.user_id,
            date: dateStr,
            startTime: startTime,
            endTime: endTime,
            tasksCompleted: JSON.stringify(tasksCompleted),
            linenChanged: JSON.stringify(linenChanged),
            refills: JSON.stringify(refills),
            targetRoomStatus: targetRoomStatus,
            remarks: remarks
        });

        if (res.success) {
            // Local state mutations
            appState.room_checklist.push({
                checklist_id: res.checklist_id || ("CKR" + Math.random().toString(36).substring(2, 10).toUpperCase()),
                room_number: String(roomNumber),
                staff_id: appState.currentUser.user_id,
                date: dateStr,
                start_time: startTime,
                end_time: endTime,
                duration_minutes: calculateMinutesBetween(startTime, endTime),
                tasks_completed: typeof tasksCompleted === "string" ? tasksCompleted : JSON.stringify(tasksCompleted),
                linen_changed: typeof linenChanged === "string" ? linenChanged : JSON.stringify(linenChanged),
                refills: typeof refills === "string" ? refills : JSON.stringify(refills),
                status: "Completed",
                kpi_score: res.kpi_score || 100
            });

            // Update room status to targetRoomStatus locally
            const rIdx = appState.rooms.findIndex(r => String(r.room_number) === String(roomNumber));
            if (rIdx !== -1) {
                appState.rooms[rIdx].room_status = targetRoomStatus;
                appState.rooms[rIdx].remarks = remarks;
                appState.rooms[rIdx].last_cleaned_at = endTime;
                appState.rooms[rIdx].last_cleaned_by = appState.currentUser.user_id;
            }

            // Update assignment status to Completed locally
            const asgIdx = appState.room_assignments.findIndex(a => String(a.room_number) === String(roomNumber) && a.date === dateStr && a.staff_id === appState.currentUser.user_id);
            if (asgIdx !== -1) {
                appState.room_assignments[asgIdx].status = "Completed";
            }

            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Laporan Terkirim!",
                    text: `KPI Kamar: ${res.kpi_score}`,
                    icon: "success",
                    timer: 3000,
                    showConfirmButton: true
                });
            } else {
                showToast(`✅ Laporan terkirim. KPI Kamar: ${res.kpi_score}`, "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal mengirim checklist");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Submits public area checklist
 */
async function submitPublicAreaChecklistLocal(areaName, dateStr, status, notes = "") {
    try {
        showToast("⏳ Menyinkronkan laporan area...", "pending");
        const res = await runWithRetry({
            action: "submitPublicAreaChecklist",
            areaName: areaName,
            staffId: appState.currentUser.user_id,
            date: dateStr,
            status: status,
            notes: notes
        });

        if (res.success) {
            showToast("✅ Checklist area disimpan.", "success");
            appState.public_area_checklist.push({
                area_name: areaName,
                staff_id: appState.currentUser.user_id,
                date: dateStr,
                status: status,
                notes: notes,
                timestamp: new Date().toISOString()
            });
            return true;
        } else {
            showToast(`⚠️ Gagal: ${res.message}`, "error");
            return false;
        }
    } catch (error) {
        showToast(`⚠️ Gagal mengirim: ${error.message}`, "error");
        return false;
    }
}

/**
 * Securely writes inventory transactions to backend ledger
 */
async function recordInventoryTxLocal(itemId, type, qty, dateStr, remarks = "", detailSpesifik = null, locationRoom = "Global") {
    showToast("⏳ Mengirim transaksi barang...", "pending");
    try {
        const payload = {
            action: "addInventoryTransaction",
            itemId: itemId,
            userId: appState.currentUser.user_id,
            type: type,
            quantity: qty,
            locationRoom: locationRoom,
            date: dateStr,
            remarks: remarks
        };

        if (detailSpesifik) {
            payload.detail_spesifik = typeof detailSpesifik === 'string'
                ? detailSpesifik
                : JSON.stringify(detailSpesifik);
        }

        const res = await runWithRetry(payload);

        if (res.success) {
            const idx = appState.inventory.findIndex(i => i.item_id === itemId);
            if (idx !== -1 && res.stock_current !== undefined) {
                appState.inventory[idx].stock_current = res.stock_current;
                if (type === 'in') {
                    appState.inventory[idx].stock_in = (parseInt(appState.inventory[idx].stock_in) || 0) + parseInt(qty);
                } else if (type === 'out') {
                    appState.inventory[idx].stock_out = (parseInt(appState.inventory[idx].stock_out) || 0) + parseInt(qty);
                }
                if (detailSpesifik) {
                    appState.inventory[idx].detail_spesifik = typeof detailSpesifik === 'string'
                        ? detailSpesifik
                        : JSON.stringify(detailSpesifik);
                }
            }
            appState.inventory_transactions.push({
                transaction_id: res.transaction_id || ("TXN" + Math.random().toString(36).substring(2, 10).toUpperCase()),
                item_id: itemId,
                user_id: appState.currentUser.user_id,
                type: type,
                quantity: parseInt(qty),
                location_room: locationRoom,
                date: dateStr,
                remarks: remarks,
                detail_spesifik: typeof detailSpesifik === 'string' ? detailSpesifik : JSON.stringify(detailSpesifik || {}),
                timestamp: new Date().toISOString()
            });
            showToast("✅ Transaksi inventaris berhasil dicatat.", "success");
            return true;
        } else {
            showToast(`⚠️ Transaksi Ditolak: ${res.message}`, "error");
            return false;
        }
    } catch (error) {
        showToast(`⚠️ Gagal mencatat transaksi: ${error.message}`, "error");
        return false;
    }
}

/**
 * Submits Leave/Sick/Permission request with optional file compression
 */
async function submitLeaveRequestLocal(leaveType, startDateStr, endDateStr, reason, imageFile = null) {
    showToast("⏳ Mengirim permohonan izin...", "pending");
    try {
        const payload = {
            action: "submitLeave",
            userId: appState.currentUser.user_id,
            leaveType: leaveType,
            startDate: startDateStr,
            endDate: endDateStr,
            reason: reason
        };

        if (imageFile) {
            const compressed = await compressImage(imageFile);
            payload.fileBase64 = compressed.base64;
            payload.fileName = compressed.name;
        }

        const res = await runWithRetry(payload);
        if (res.success) {
            showToast("✅ Permohonan izin terkirim.", "success");
            appState.leave_requests.push({
                request_id: res.request_id || ("LVE" + Math.random().toString(36).substring(2, 10).toUpperCase()),
                user_id: appState.currentUser.user_id,
                leave_type: leaveType,
                start_date: startDateStr,
                end_date: endDateStr,
                reason: reason,
                status: "Pending",
                evidence_url: res.evidence_url || "",
                created_at: new Date().toISOString()
            });
            return true;
        } else {
            showToast(`⚠️ Pengajuan Gagal: ${res.message}`, "error");
            return false;
        }
    } catch (error) {
        showToast(`⚠️ Masalah Koneksi: ${error.message}`, "error");
        return false;
    }
}

/**
 * Submits periodic project report
 */
async function submitProjectReportLocal(title, description, type, dateStr, imageFile = null) {
    showToast("⏳ Mengirim laporan proyek...", "pending");
    try {
        const payload = {
            action: "submitProject",
            title: title,
            description: description,
            type: type,
            staffId: appState.currentUser.user_id,
            date: dateStr
        };

        if (imageFile) {
            const compressed = await compressImage(imageFile);
            payload.photoBase64 = compressed.base64;
            payload.photoName = compressed.name;
        }

        const res = await runWithRetry(payload);
        if (res.success) {
            showToast("✅ Laporan proyek berhasil dikirim.", "success");
            appState.projects.push({
                project_id: res.project_id || ("PRJ" + Math.random().toString(36).substring(2, 10).toUpperCase()),
                title: title,
                description: description,
                type: type,
                staff_id: appState.currentUser.user_id,
                date: dateStr,
                status: "Pending",
                photo_url: res.photo_url || "",
                timestamp: new Date().toISOString()
            });
            return true;
        } else {
            showToast(`⚠️ Pengiriman Gagal: ${res.message}`, "error");
            return false;
        }
    } catch (error) {
        showToast(`⚠️ Masalah Koneksi: ${error.message}`, "error");
        return false;
    }
}

// --- MANAGER ACTIONS ---

async function approveLeaveLocal(requestId, status) {
    try {
        showToast("⏳ Memproses izin...", "pending");
        const res = await runWithRetry({
            action: "approveLeave",
            requestId: requestId,
            managerId: appState.currentUser.user_id,
            status: status
        });
        if (res.success) {
            showToast(`✅ Permohonan izin ${status === "approved" ? "disetujui" : "ditolak"}.`, "success");
            const req = appState.leave_requests.find(r => r.request_id === requestId);
            if (req) {
                req.status = status;
            }
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        showToast(`⚠️ Gagal memproses: ${error.message}`, "error");
        return false;
    }
}

async function approveProjectLocal(projectId, status) {
    try {
        showToast("⏳ Memproses laporan projek...", "pending");
        const res = await runWithRetry({
            action: "approveProject",
            projectId: projectId,
            managerId: appState.currentUser.user_id,
            status: status
        });
        if (res.success) {
            showToast(`✅ Laporan projek telah ${status === "Approved" ? "disetujui" : "ditolak"}.`, "success");
            const proj = appState.projects.find(p => p.project_id === projectId);
            if (proj) {
                proj.status = status;
            }
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        showToast(`⚠️ Gagal memproses: ${error.message}`, "error");
        return false;
    }
}

async function requestOvertimeLocal(attendanceId, requestedAtStr) {
    showToast("⚠️ Fitur pengajuan lembur telah dinonaktifkan.", "error");
    return false;
}

async function approveOvertimeLocal(attendanceId, status) {
    showToast("⚠️ Fitur persetujuan lembur telah dinonaktifkan.", "error");
    return false;
}

/**
 * Submits daily area tasks
 */
async function submitAreaTaskDailyLocal(areaId, areaShiftId, dateStr, status, remarks = "", tasksCompleted = {}, linenChanged = [], refills = []) {
    showLoading("Menyinkronkan laporan area...");
    try {
        const res = await runWithRetry({
            action: "submitAreaTaskDaily",
            areaId: areaId,
            areaShiftId: areaShiftId,
            staffId: appState.currentUser.user_id,
            date: dateStr,
            status: status,
            remarks: remarks,
            tasksCompleted: tasksCompleted,
            linenChanged: linenChanged,
            refills: refills
        });

        if (res.success) {
            const idx = appState.area_tasks_daily.findIndex(x => x.area_shift_id === areaShiftId && x.date === dateStr);
            const recordObj = {
                task_daily_id: res.task_daily_id || ("ATD" + Math.random().toString(36).substring(2, 10).toUpperCase()),
                area_id: areaId,
                area_shift_id: areaShiftId,
                staff_id: appState.currentUser.user_id,
                date: dateStr,
                status: status,
                remarks: remarks,
                timestamp: new Date().toISOString(),
                tasks_completed: typeof tasksCompleted === 'string' ? tasksCompleted : JSON.stringify(tasksCompleted),
                linen_changed: typeof linenChanged === 'string' ? linenChanged : JSON.stringify(linenChanged),
                refills: typeof refills === 'string' ? refills : JSON.stringify(refills)
            };
            if (idx !== -1) {
                appState.area_tasks_daily[idx] = recordObj;
            } else {
                appState.area_tasks_daily.push(recordObj);
            }

            // Update local assignment status
            const taskAssign = appState.staff_area_tasks.find(t =>
                t.area_id === areaId &&
                t.area_shift_id === areaShiftId &&
                t.staff_id === appState.currentUser.user_id &&
                t.date === dateStr
            );
            if (taskAssign) {
                taskAssign.status = "selesai";
            }

            hideLoading();
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    title: "Berhasil!",
                    text: "Checklist area berhasil disimpan.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Checklist area disimpan.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menyimpan.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== "undefined") {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal mengirim: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Submits staff work project reports
 */
async function submitStaffWorkProjectLocal(title, description, period, dateStr, imageFile = null) {
    showLoading("Mengirim laporan proyek pekerjaan staf...");
    try {
        const payload = {
            action: "submitStaffWorkProject",
            title: title,
            description: description,
            period: period,
            staffId: appState.currentUser.user_id,
            date: dateStr
        };

        if (imageFile) {
            const compressed = await compressImage(imageFile);
            payload.photoBase64 = compressed.base64;
            payload.photoName = compressed.name;
        }

        const res = await runWithRetry(payload);
        if (res.success) {
            // Local state mutation
            appState.staff_work_projects.push({
                work_project_id: res.work_project_id || ("WPR" + Math.random().toString(36).substring(2, 10).toUpperCase()),
                title: title,
                description: description,
                period: period,
                staff_id: appState.currentUser.user_id,
                photo_url: res.photo_url || "",
                date: dateStr
            });

            hideLoading();
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    title: "Berhasil!",
                    text: "Laporan proyek pekerjaan staf berhasil dikirim.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Laporan proyek pekerjaan staf berhasil dikirim.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal mengirim laporan.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== "undefined") {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

async function runMonthlyResetLocal() {
    if (typeof Swal !== "undefined") {
        const result = await Swal.fire({
            title: 'Konfirmasi Reset',
            text: 'Peringatan: Seluruh transaksi bulan lalu akan diarsipkan dan sisa stok dipindahkan ke Stok Awal. Anda yakin ingin mereset?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#1E3A8A',
            cancelButtonColor: '#EF4444',
            confirmButtonText: 'Ya, Reset Sekarang',
            cancelButtonText: 'Batal'
        });
        if (!result.isConfirmed) {
            return false;
        }
    } else {
        if (!confirm("Peringatan: Seluruh transaksi bulan lalu akan diarsipkan dan sisa stok dipindahkan ke Stok Awal. Anda yakin ingin mereset?")) {
            return false;
        }
    }
    showLoading("Menjalankan reset bulanan...");
    try {
        const res = await runWithRetry({ action: "monthlyReset" });
        if (res.success) {
            await fetchDataFromServer();
            hideLoading();
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    title: "Berhasil!",
                    text: res.message,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ " + res.message, "success");
            }
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== "undefined") {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal melakukan reset: ${error.message}`, "error");
        }
        return false;
    }
}

async function updateStaffAssignmentsLocal(staffUserId, activeTaskIds) {
    showLoading("Memperbarui penugasan...");
    try {
        const res = await runWithRetry({
            action: "updateStaffChecklistAssignments",
            userId: staffUserId,
            taskIds: activeTaskIds
        });
        if (res.success) {
            // Local state mutation
            appState.staff_checklist_assignments = appState.staff_checklist_assignments.filter(a => a.user_id !== staffUserId);
            activeTaskIds.forEach(taskId => {
                appState.staff_checklist_assignments.push({
                    assignment_id: "SCA" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                    user_id: staffUserId,
                    task_id: taskId,
                    is_enabled: true
                });
            });

            hideLoading();
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    title: "Berhasil!",
                    text: "Penugasan checklist berhasil diperbarui.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Penugasan checklist berhasil diperbarui.", "success");
            }
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== "undefined") {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal memperbarui: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Updates application settings (like API key and Google Drive folder URL)
 */
async function updateSettingsLocal(settingId, apiKey, folderId) {
    showLoading("Menyimpan pengaturan...");
    try {
        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_settings",
            keyCol: "setting_id",
            keyValue: settingId,
            updates: {
                api_key: apiKey,
                folder_id: folderId
            }
        });
        if (res.success) {
            // Local state mutation
            const idx = appState.settings.findIndex(s => s.setting_id === settingId);
            if (idx !== -1) {
                appState.settings[idx].api_key = apiKey;
                appState.settings[idx].folder_id = folderId;
            } else {
                appState.settings.push({ setting_id: settingId, api_key: apiKey, folder_id: folderId });
            }

            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: "Pengaturan berhasil disimpan.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Pengaturan berhasil disimpan.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menyimpan pengaturan.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal menyimpan: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Assigns a staff member to clean a room on a target date with detailed statuses & instructions
 */
async function addRoomAssignmentLocal(dateStr, roomNumber, staffId, statusFrom, statusTo, remarks = "", status = "Pending") {
    showLoading("Menugaskan staf ke kamar...");
    try {
        const assignmentId = "ASGR" + Math.random().toString(36).substring(2, 10).toUpperCase();
        const res = await runWithRetry({
            action: "createRecord",
            sheetName: "tb_room_assignments",
            record: {
                assignment_id: assignmentId,
                date: dateStr,
                room_number: String(roomNumber),
                staff_id: staffId,
                target_status_from: statusFrom,
                target_status_to: statusTo,
                remarks: remarks,
                status: status
            }
        });
        if (res.success) {
            // Local state mutation
            appState.room_assignments.push({
                assignment_id: res.assignment_id || assignmentId,
                date: dateStr,
                room_number: String(roomNumber),
                staff_id: staffId,
                target_status_from: statusFrom,
                target_status_to: statusTo,
                remarks: remarks,
                status: status
            });

            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: "Penugasan staf berhasil disimpan.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Penugasan staf berhasil disimpan.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menugaskan.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Masalah Koneksi: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Updates an existing staff room assignment
 */
async function updateRoomAssignmentLocal(assignmentId, dateStr, roomNumber, staffId, statusFrom, statusTo, remarks = "", status = "Pending") {
    showLoading("Menyimpan perubahan penugasan...");
    try {
        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_room_assignments",
            keyCol: "assignment_id",
            keyValue: assignmentId,
            updates: {
                date: dateStr,
                room_number: String(roomNumber),
                staff_id: staffId,
                target_status_from: statusFrom,
                target_status_to: statusTo,
                remarks: remarks,
                status: status
            }
        });
        if (res.success) {
            // Local state mutation
            const idx = appState.room_assignments.findIndex(a => a.assignment_id === assignmentId);
            if (idx !== -1) {
                appState.room_assignments[idx].date = dateStr;
                appState.room_assignments[idx].room_number = String(roomNumber);
                appState.room_assignments[idx].staff_id = staffId;
                appState.room_assignments[idx].target_status_from = statusFrom;
                appState.room_assignments[idx].target_status_to = statusTo;
                appState.room_assignments[idx].remarks = remarks;
                appState.room_assignments[idx].status = status;
            }

            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: "Penugasan berhasil diperbarui.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Penugasan berhasil diperbarui.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal memperbarui penugasan.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Masalah Koneksi: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Deletes a staff room assignment
 */
async function deleteRoomAssignmentLocal(assignmentId) {
    showLoading("Menghapus penugasan...");
    try {
        const res = await runWithRetry({
            action: "deleteRecord",
            sheetName: "tb_room_assignments",
            keyCol: "assignment_id",
            keyValue: assignmentId
        });
        if (res.success) {
            // Local state mutation
            appState.room_assignments = appState.room_assignments.filter(a => a.assignment_id !== assignmentId);

            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: "Penugasan berhasil dihapus.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Penugasan berhasil dihapus.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menghapus penugasan.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Masalah Koneksi: ${error.message}`, "error");
        }
        return false;
    }
}

async function updateRoomChecklistLocal(checklistId, tasksCompleted, linenChanged, refills, kpiScore, extraData = {}) {
    const isNew = !checklistId;
    const actionLabel = isNew ? "Menambahkan laporan pembersihan..." : "Menyimpan perubahan laporan pembersihan...";
    showLoading(actionLabel);
    try {
        let res;
        const tasksStr = typeof tasksCompleted === "string" ? tasksCompleted : JSON.stringify(tasksCompleted);
        const linenStr = typeof linenChanged === "string" ? linenChanged : JSON.stringify(linenChanged);
        const refillsStr = typeof refills === "string" ? refills : JSON.stringify(refills);
        const scoreNum = Number(kpiScore);

        if (isNew) {
            const newId = "CKR" + Math.random().toString(36).substring(2, 10).toUpperCase();
            res = await runWithRetry({
                action: "createRecord",
                sheetName: "tb_room_checklist",
                record: {
                    checklist_id: newId,
                    room_number: String(extraData.room_number || ""),
                    staff_id: extraData.staff_id || appState.currentUser.user_id,
                    date: extraData.date || new Date().toISOString().substring(0, 10),
                    start_time: extraData.start_time || "08:00",
                    end_time: extraData.end_time || "08:15",
                    duration_minutes: Number(extraData.duration_minutes) || 15,
                    tasks_completed: tasksStr,
                    linen_changed: linenStr,
                    refills: refillsStr,
                    status: "Completed",
                    kpi_score: scoreNum
                }
            });
            if (res.success) {
                // Mutate local state
                appState.room_checklist.push({
                    checklist_id: newId,
                    room_number: String(extraData.room_number || ""),
                    staff_id: extraData.staff_id || appState.currentUser.user_id,
                    date: extraData.date || new Date().toISOString().substring(0, 10),
                    start_time: extraData.start_time || "08:00",
                    end_time: extraData.end_time || "08:15",
                    duration_minutes: Number(extraData.duration_minutes) || 15,
                    tasks_completed: tasksStr,
                    linen_changed: linenStr,
                    refills: refillsStr,
                    status: "Completed",
                    kpi_score: scoreNum
                });
            }
        } else {
            res = await runWithRetry({
                action: "updateRecord",
                sheetName: "tb_room_checklist",
                keyCol: "checklist_id",
                keyValue: checklistId,
                updates: {
                    tasks_completed: tasksStr,
                    linen_changed: linenStr,
                    refills: refillsStr,
                    kpi_score: scoreNum
                }
            });
            if (res.success) {
                // Mutate local state
                const idx = appState.room_checklist.findIndex(c => c.checklist_id === checklistId);
                if (idx !== -1) {
                    appState.room_checklist[idx].tasks_completed = tasksStr;
                    appState.room_checklist[idx].linen_changed = linenStr;
                    appState.room_checklist[idx].refills = refillsStr;
                    appState.room_checklist[idx].kpi_score = scoreNum;
                }
            }
        }

        if (res.success) {
            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: isNew ? "Laporan pembersihan berhasil dibuat." : "Laporan pembersihan berhasil diperbarui.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Laporan pembersihan berhasil disimpan.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menyimpan laporan.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Masalah Koneksi: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Adds a new inventory item
 */
async function addInventoryItemLocal(itemCode, categoryId, itemName, locationRoom = "Global", stockInitial = 0, minStock = 5, remarks = "", detailSpesifik = "{}") {
    showLoading("Menambahkan barang inventaris...");
    try {
        const itemId = "INV" + Math.random().toString(36).substring(2, 10).toUpperCase();
        const detailStr = typeof detailSpesifik === 'string' ? detailSpesifik : JSON.stringify(detailSpesifik);
        const res = await runWithRetry({
            action: "addInventoryItem",
            item_id: itemId,
            item_code: itemCode,
            category_id: categoryId,
            item_name: itemName,
            location_room: locationRoom,
            stock_initial: Number(stockInitial) || 0,
            min_stock: Number(minStock) || 5,
            detail_spesifik: detailStr,
            remarks: remarks
        });
        if (res.success) {
            appState.inventory.push({
                item_id: itemId,
                item_code: itemCode,
                category_id: categoryId,
                item_name: itemName,
                location_room: locationRoom,
                stock_initial: Number(stockInitial) || 0,
                stock_in: 0,
                stock_out: 0,
                stock_current: Number(stockInitial) || 0,
                min_stock: Number(minStock) || 5,
                detail_spesifik: detailStr,
                remarks: remarks
            });
            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: `Barang ${itemName} berhasil ditambahkan.`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast(`✅ Barang ${itemName} berhasil ditambahkan.`, "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menambahkan barang.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Updates an inventory item
 */
async function updateInventoryItemLocal(itemId, itemCode, categoryId, itemName, locationRoom, minStock, remarks = "", detailSpesifik = "{}") {
    showLoading("Menyimpan pembaruan barang...");
    try {
        const detailStr = typeof detailSpesifik === 'string' ? detailSpesifik : JSON.stringify(detailSpesifik);
        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_inventory",
            keyCol: "item_id",
            keyValue: itemId,
            updates: {
                item_code: itemCode,
                category_id: categoryId,
                item_name: itemName,
                location_room: locationRoom,
                min_stock: Number(minStock) || 5,
                detail_spesifik: detailStr,
                remarks: remarks
            }
        });
        if (res.success) {
            const idx = appState.inventory.findIndex(i => i.item_id === itemId);
            if (idx !== -1) {
                appState.inventory[idx].item_code = itemCode;
                appState.inventory[idx].category_id = categoryId;
                appState.inventory[idx].item_name = itemName;
                appState.inventory[idx].location_room = locationRoom;
                appState.inventory[idx].min_stock = Number(minStock) || 5;
                appState.inventory[idx].detail_spesifik = detailStr;
                appState.inventory[idx].remarks = remarks;
            }
            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: `Barang ${itemName} berhasil diperbarui.`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast(`✅ Barang ${itemName} diperbarui.`, "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal memperbarui barang.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Deletes an inventory item
 */
async function deleteInventoryItemLocal(itemId) {
    showLoading("Menghapus barang inventaris...");
    try {
        const res = await runWithRetry({
            action: "deleteRecord",
            sheetName: "tb_inventory",
            keyCol: "item_id",
            keyValue: itemId
        });
        if (res.success) {
            appState.inventory = appState.inventory.filter(i => i.item_id !== itemId);
            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Berhasil!",
                    text: "Barang berhasil dihapus.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Barang berhasil dihapus.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menghapus barang.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

/**
 * Adds an inventory category
 */
async function addCategoryLocal(name, desc, defaultAttributes = "[]") {
    showLoading("Menambahkan kategori...");
    try {
        const catId = "CAT" + Math.random().toString(36).substring(2, 10).toUpperCase();
        const attrStr = typeof defaultAttributes === 'string' ? defaultAttributes : JSON.stringify(defaultAttributes);
        const res = await runWithRetry({
            action: "createRecord",
            sheetName: "tb_inventory_categories",
            record: {
                category_id: catId,
                category_name: name,
                description: desc,
                default_attributes: attrStr,
                is_active: true
            }
        });
        if (res.success) {
            appState.inventory_categories.push({
                category_id: catId,
                category_name: name,
                description: desc,
                default_attributes: attrStr,
                is_active: true
            });
            hideLoading();
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') Swal.fire("Gagal", error.message, "error");
        return false;
    }
}

/**
 * Updates an inventory category
 */
async function updateCategoryLocal(catId, name, desc, defaultAttributes = "[]", isActive = true) {
    showLoading("Memperbarui kategori...");
    try {
        const attrStr = typeof defaultAttributes === 'string' ? defaultAttributes : JSON.stringify(defaultAttributes);
        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_inventory_categories",
            keyCol: "category_id",
            keyValue: catId,
            updates: {
                category_name: name,
                description: desc,
                default_attributes: attrStr,
                is_active: isActive
            }
        });
        if (res.success) {
            const idx = appState.inventory_categories.findIndex(c => c.category_id === catId);
            if (idx !== -1) {
                appState.inventory_categories[idx].category_name = name;
                appState.inventory_categories[idx].description = desc;
                appState.inventory_categories[idx].default_attributes = attrStr;
                appState.inventory_categories[idx].is_active = isActive;
            }
            hideLoading();
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') Swal.fire("Gagal", error.message, "error");
        return false;
    }
}

/**
 * Adds a new user account
 */
async function addUserLocal(username, password, name, role, shiftId) {
    showLoading("Menambahkan karyawan...");
    try {
        const userId = "USR" + Math.random().toString(36).substring(2, 10).toUpperCase();
        const pwdHash = await hashPasswordSHA256(password);
        const res = await runWithRetry({
            action: "addUser",
            user_id: userId,
            username: username,
            password: pwdHash,
            name: name,
            role: role,
            shift_id: shiftId
        });
        if (res.success) {
            appState.users.push({
                user_id: userId,
                username: username,
                name: name,
                role: role,
                shift_id: shiftId,
                status: "active"
            });
            hideLoading();
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') Swal.fire("Gagal", error.message, "error");
        return false;
    }
}

/**
 * Updates a user account
 */
async function updateUserLocal(userId, username, password, name, role, shiftId, status) {
    showLoading("Memperbarui data karyawan...");
    try {
        const updates = {
            username: username,
            name: name,
            role: role,
            shift_id: shiftId,
            status: status
        };
        if (password) {
            updates.password = await hashPasswordSHA256(password);
        }
        const res = await runWithRetry({
            action: "updateUser",
            user_id: userId,
            ...updates
        });
        if (res.success) {
            const idx = appState.users.findIndex(u => u.user_id === userId);
            if (idx !== -1) {
                appState.users[idx].username = username;
                appState.users[idx].name = name;
                appState.users[idx].role = role;
                appState.users[idx].shift_id = shiftId;
                appState.users[idx].status = status;
            }
            hideLoading();
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') Swal.fire("Gagal", error.message, "error");
        return false;
    }
}

/**
 * Adds a new work shift configuration
 */
async function addShiftLocal(shiftId, name, checkIn, checkOut, preIn, preOut) {
    showLoading("Menambahkan shift...");
    try {
        const res = await runWithRetry({
            action: "addShift",
            shift_id: shiftId,
            shift_name: name,
            check_in_time: checkIn,
            check_out_time: checkOut,
            pre_check_in_minutes: preIn,
            pre_check_out_minutes: preOut
        });
        if (res.success) {
            appState.shifts.push({
                shift_id: shiftId,
                shift_name: name,
                check_in_time: checkIn,
                check_out_time: checkOut,
                pre_check_in_minutes: Number(preIn) || 30,
                pre_check_out_minutes: Number(preOut) || 15,
                is_active: true
            });
            hideLoading();
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') Swal.fire("Gagal", error.message, "error");
        return false;
    }
}

/**
 * Updates a shift configuration
 */
async function updateShiftLocal(shiftId, name, checkIn, checkOut, preIn, preOut, isActive) {
    showLoading("Memperbarui shift...");
    try {
        const res = await runWithRetry({
            action: "updateShift",
            shift_id: shiftId,
            shift_name: name,
            check_in_time: checkIn,
            check_out_time: checkOut,
            pre_check_in_minutes: preIn,
            pre_check_out_minutes: preOut,
            is_active: isActive
        });
        if (res.success) {
            const idx = appState.shifts.findIndex(s => s.shift_id === shiftId);
            if (idx !== -1) {
                appState.shifts[idx].shift_name = name;
                appState.shifts[idx].check_in_time = checkIn;
                appState.shifts[idx].check_out_time = checkOut;
                appState.shifts[idx].pre_check_in_minutes = Number(preIn);
                appState.shifts[idx].pre_check_out_minutes = Number(preOut);
                appState.shifts[idx].is_active = isActive;
            }
            hideLoading();
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') Swal.fire("Gagal", error.message, "error");
        return false;
    }
}

/**
 * Updates application settings
 */
async function updateSettingsLocal(settingsData) {
    showLoading("Menyimpan pengaturan...");
    try {
        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_settings",
            keyCol: "setting_id",
            keyValue: "SET001",
            updates: {
                api_key: settingsData.api_key,
                folder_id: settingsData.folder_id
            }
        });
        if (res.success) {
            if (appState.settings.length > 0) {
                appState.settings[0].api_key = settingsData.api_key;
                appState.settings[0].folder_id = settingsData.folder_id;
            } else {
                appState.settings.push({
                    setting_id: "SET001",
                    api_key: settingsData.api_key,
                    folder_id: settingsData.folder_id
                });
            }
            hideLoading();
            showToast("✅ Pengaturan berhasil disimpan.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') Swal.fire("Gagal", error.message, "error");
        else showToast("Gagal menyimpan pengaturan.", "error");
        return false;
    }
}

/**
 * Updates admin credentials
 */
async function updateAdminCredentialsLocal(adminData) {
    showLoading("Menyimpan kredensial admin...");
    try {
        const updates = {
            username: adminData.username,
            name: adminData.name
        };
        if (adminData.password) {
            updates.password = await hashPasswordSHA256(adminData.password);
        }

        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_users",
            keyCol: "user_id",
            keyValue: appState.currentUser.user_id,
            updates: updates
        });

        if (res.success) {
            appState.currentUser.username = adminData.username;
            appState.currentUser.name = adminData.name;

            const idx = appState.users.findIndex(u => u.user_id === appState.currentUser.user_id);
            if (idx !== -1) {
                appState.users[idx].username = adminData.username;
                appState.users[idx].name = adminData.name;
            }

            hideLoading();
            showToast("✅ Kredensial admin berhasil diperbarui.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') Swal.fire("Gagal", error.message, "error");
        else showToast("Gagal menyimpan kredensial.", "error");
        return false;
    }
}// Add Settings and Admin update functions
async function updateSettingsLocal(settingsData) {
    showLoading("Menyimpan pengaturan...");
    try {
        const res = await runWithRetry({
            action: "updateSettings",
            api_key: settingsData.api_key,
            folder_id: settingsData.folder_id
        });
        if (res.success) {
            if (appState.settings.length > 0) {
                appState.settings[0].api_key = settingsData.api_key;
                appState.settings[0].folder_id = settingsData.folder_id;
            } else {
                appState.settings.push({
                    setting_id: 'SET1',
                    api_key: settingsData.api_key,
                    folder_id: settingsData.folder_id
                });
            }
            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: "Berhasil!", text: "Pengaturan sistem berhasil disimpan.", icon: "success", timer: 2000, showConfirmButton: false });
            } else {
                showToast("✅ Pengaturan berhasil disimpan.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal menyimpan pengaturan.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

async function updateAdminCredentialsLocal(adminData) {
    showLoading("Memperbarui kredensial admin...");
    try {
        const payload = {
            action: "updateAdminCredentials",
            username: adminData.username,
            name: adminData.name
        };
        if (adminData.password && adminData.password.trim() !== '') {
            payload.passwordHash = await hashPasswordSHA256(adminData.password);
        }

        const res = await runWithRetry(payload);
        if (res.success) {
            if (appState.currentUser) {
                appState.currentUser.username = adminData.username;
                appState.currentUser.name = adminData.name;
            }
            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: "Berhasil!", text: "Kredensial admin berhasil diperbarui.", icon: "success", timer: 2000, showConfirmButton: false });
            } else {
                showToast("✅ Kredensial admin berhasil diperbarui.", "success");
            }
            return true;
        } else {
            throw new Error(res.message || "Gagal memperbarui kredensial admin.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

async function generateDailyDataLocal() {
    showLoading("Membuat data harian...");
    try {
        const res = await runWithRetry({
            action: "generateDailyData"
        });
        if (res.success) {
            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: "Berhasil!", text: res.message, icon: "success" });
            } else {
                showToast("✅ " + res.message, "success");
            }
            await fetchDataFromServer(); // Sync again to load newly generated data
            return true;
        } else {
            throw new Error(res.message || "Gagal membuat data harian.");
        }
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

async function addHouseKeepingMasterLocal(title, description, periodType, staffIds, startDate, idealTime) {
    showLoading("Menyimpan Master Proyek...");
    try {
        const masterId = "MAS" + Date.now().toString(36).toUpperCase();
        const res = await runWithRetry({
            action: "createRecord",
            sheetName: "tb_housekeeping_project_master",
            record: {
                master_id: masterId,
                title: title,
                description: description,
                period_type: periodType,
                staff_ids: JSON.stringify(staffIds),
                start_date: startDate,
                last_generated_date: "",
                ideal_time: idealTime || "",
                is_active: true
            }
        });
        if (res.success) {
            hideLoading();
            showToast("✅ Master proyek berhasil ditambahkan.", "success");
            if (res.updated_masters) {
                appState.housekeeping_project_master = res.updated_masters;
            }
            if (res.updated_projects) {
                appState.housekeeping_projects = res.updated_projects;
            }
            return true;
        } else {
            throw new Error(res.message);
        }
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function updateHouseKeepingMasterLocal(masterId, updates) {
    showLoading("Memperbarui Master Proyek...");
    try {
        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_housekeeping_project_master",
            keyCol: "master_id",
            keyValue: masterId,
            updates: updates
        });
        if (res.success) {
            hideLoading();
            showToast("✅ Master proyek berhasil diperbarui.", "success");
            if (res.updated_masters) {
                appState.housekeeping_project_master = res.updated_masters;
            }
            if (res.updated_projects) {
                appState.housekeeping_projects = res.updated_projects;
            }
            return true;
        } else {
            throw new Error(res.message);
        }
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function updateHouseKeepingProjectLocal(projectId, updates) {
    showLoading("Menyimpan status proyek...");
    try {
        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_housekeeping_projects",
            keyCol: "project_id",
            keyValue: projectId,
            updates: updates
        });
        if (res.success) {
            hideLoading();
            showToast("✅ Proyek berhasil diupdate.", "success");
            const idx = appState.housekeeping_projects.findIndex(p => p.project_id === projectId);
            if (idx !== -1) {
                Object.assign(appState.housekeeping_projects[idx], updates);
            }
            return true;
        } else {
            throw new Error(res.message);
        }
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function updateRoomInventoryLocal(roomNumber, roomInventoryData) {
    showLoading("Menyimpan inventaris kamar...");
    try {
        const res = await runWithRetry({
            action: "updateRoomInventory",
            room_number: roomNumber,
            room_inventory: typeof roomInventoryData === "string" ? roomInventoryData : JSON.stringify(roomInventoryData),
            userId: appState.currentUser ? appState.currentUser.user_id : "system"
        });
        if (res.success) {
            const idx = appState.rooms.findIndex(r => String(r.room_number) === String(roomNumber));
            if (idx !== -1) {
                appState.rooms[idx].room_inventory = typeof roomInventoryData === "string" ? roomInventoryData : JSON.stringify(roomInventoryData);
                appState.rooms[idx].last_updated = new Date().toISOString();
            }
            hideLoading();
            showToast("✅ Inventaris kamar berhasil diperbarui.", "success");
            return true;
        } else {
            throw new Error(res.message || "Gagal memperbarui inventaris.");
        }
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function submitHousekeepingSubmissionLocal(projectId, description, photoFile = null) {
    showLoading("Mengirim laporan housekeeping...");
    try {
        const payload = {
            action: "submitHousekeepingSubmission",
            projectId: projectId,
            staffId: appState.currentUser.user_id,
            description: description,
            submittedAt: new Date().toISOString()
        };

        if (photoFile) {
            const compressed = await compressImage(photoFile);
            payload.photoBase64 = compressed.base64;
            payload.photoName = compressed.name;
        }

        const res = await runWithRetry(payload);
        if (res.success) {
            hideLoading();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Terkirim!",
                    text: "Laporan housekeeping berhasil diajukan.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast("✅ Laporan housekeeping berhasil diajukan.", "success");
            }
            appState.housekeeping_submissions.push({
                submission_id: res.submission_id,
                project_id: projectId,
                staff_id: appState.currentUser.user_id,
                description: description,
                photo_url: res.photo_url || "",
                submitted_at: payload.submittedAt,
                status: "Pending",
                kpi_score: res.kpi_score || "",
                approved_by: "",
                approved_at: ""
            });
            const pIdx = appState.housekeeping_projects.findIndex(p => p.project_id === projectId);
            if (pIdx !== -1) {
                appState.housekeeping_projects[pIdx].status = "Done";
            }
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        if (typeof Swal !== 'undefined') {
            Swal.fire("Gagal", error.message, "error");
        } else {
            showToast(`⚠️ Gagal: ${error.message}`, "error");
        }
        return false;
    }
}

async function approveHousekeepingSubmissionLocal(submissionId, status) {
    showLoading(status === "Approved" ? "Menyetujui laporan..." : "Menolak laporan...");
    try {
        const res = await runWithRetry({
            action: "approveHousekeepingSubmission",
            submissionId: submissionId,
            managerId: appState.currentUser.user_id,
            status: status
        });
        if (res.success) {
            hideLoading();
            showToast(`✅ Laporan berhasil ${status === "Approved" ? "disetujui" : "ditolak"}.`, "success");
            if (res.updated_submissions) {
                appState.housekeeping_submissions = res.updated_submissions;
            }
            if (res.updated_projects) {
                appState.housekeeping_projects = res.updated_projects;
            }
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

// =========================================================================
// PUBLIC AREA CONTROL SHEET APIS
// =========================================================================

async function addAreaLocal(areaName, idNumber, shiftIds, checklistConfig) {
    showLoading("Menambahkan area baru...");
    try {
        const areaId = "AR" + Math.random().toString(36).substring(2, 10).toUpperCase();
        const res = await runWithRetry({
            action: "createRecord",
            sheetName: "tb_areas",
            record: {
                area_id: areaId,
                area_name: areaName,
                id_number: idNumber,
                shift_ids: shiftIds.join(','),
                checklist_config: typeof checklistConfig === 'string' ? checklistConfig : JSON.stringify(checklistConfig)
            }
        });
        if (res.success) {
            appState.areas.push({
                area_id: areaId,
                area_name: areaName,
                id_number: idNumber,
                shift_ids: shiftIds.join(','),
                checklist_config: typeof checklistConfig === 'string' ? checklistConfig : JSON.stringify(checklistConfig)
            });
            hideLoading();
            showToast("✅ Area baru berhasil ditambahkan.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function updateAreaLocal(areaId, areaName, idNumber, shiftIds, checklistConfig) {
    showLoading("Memperbarui area...");
    try {
        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_areas",
            keyCol: "area_id",
            keyValue: areaId,
            updates: {
                area_name: areaName,
                id_number: idNumber,
                shift_ids: shiftIds.join(','),
                checklist_config: typeof checklistConfig === 'string' ? checklistConfig : JSON.stringify(checklistConfig)
            }
        });
        if (res.success) {
            const idx = appState.areas.findIndex(a => a.area_id === areaId);
            if (idx !== -1) {
                appState.areas[idx].area_name = areaName;
                appState.areas[idx].id_number = idNumber;
                appState.areas[idx].shift_ids = shiftIds.join(',');
                appState.areas[idx].checklist_config = typeof checklistConfig === 'string' ? checklistConfig : JSON.stringify(checklistConfig);
            }
            hideLoading();
            showToast("✅ Area berhasil diperbarui.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function deleteAreaLocal(areaId) {
    showLoading("Menghapus area...");
    try {
        const res = await runWithRetry({
            action: "deleteRecord",
            sheetName: "tb_areas",
            keyCol: "area_id",
            keyValue: areaId
        });
        if (res.success) {
            appState.areas = appState.areas.filter(a => a.area_id !== areaId);
            hideLoading();
            showToast("✅ Area berhasil dihapus.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function addAreaShiftLocal(shiftName, startTime, endTime) {
    showLoading("Menambahkan shift...");
    try {
        const shiftId = "ASH" + Math.random().toString(36).substring(2, 10).toUpperCase();
        const res = await runWithRetry({
            action: "createRecord",
            sheetName: "tb_area_shifts",
            record: {
                area_shift_id: shiftId,
                shift_name: shiftName,
                start_time: startTime,
                end_time: endTime
            }
        });
        if (res.success) {
            appState.area_shifts.push({
                area_shift_id: shiftId,
                shift_name: shiftName,
                start_time: startTime,
                end_time: endTime
            });
            hideLoading();
            showToast("✅ Shift area berhasil ditambahkan.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function updateAreaShiftLocal(areaShiftId, shiftName, startTime, endTime) {
    showLoading("Memperbarui shift...");
    try {
        const res = await runWithRetry({
            action: "updateRecord",
            sheetName: "tb_area_shifts",
            keyCol: "area_shift_id",
            keyValue: areaShiftId,
            updates: {
                shift_name: shiftName,
                start_time: startTime,
                end_time: endTime
            }
        });
        if (res.success) {
            const idx = appState.area_shifts.findIndex(s => s.area_shift_id === areaShiftId);
            if (idx !== -1) {
                appState.area_shifts[idx].shift_name = shiftName;
                appState.area_shifts[idx].start_time = startTime;
                appState.area_shifts[idx].end_time = endTime;
            }
            hideLoading();
            showToast("✅ Shift area berhasil diperbarui.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function deleteAreaShiftLocal(areaShiftId) {
    showLoading("Menghapus shift...");
    try {
        const res = await runWithRetry({
            action: "deleteRecord",
            sheetName: "tb_area_shifts",
            keyCol: "area_shift_id",
            keyValue: areaShiftId
        });
        if (res.success) {
            appState.area_shifts = appState.area_shifts.filter(s => s.area_shift_id !== areaShiftId);
            hideLoading();
            showToast("✅ Shift area berhasil dihapus.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function assignStaffAreaLocal(areaId, shiftIds, staffIds) {
    showLoading("Menyimpan penugasan staf area...");
    try {
        const res = await runWithRetry({
            action: "updateStaffAreaAssignments",
            areaId: areaId,
            shiftIds: shiftIds,
            staffIds: staffIds
        });
        if (res.success) {
            if (res.updated_assignments) {
                appState.staff_area_tasks = res.updated_assignments;
            }
            hideLoading();
            showToast("✅ Penugasan staf area berhasil disimpan.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

async function deleteAssignmentLocal(taskId) {
    showLoading("Menghapus penugasan...");
    try {
        const res = await runWithRetry({
            action: "deleteRecord",
            sheetName: "tb_staff_area_tasks",
            keyCol: "task_id",
            keyValue: taskId
        });
        if (res.success) {
            appState.staff_area_tasks = appState.staff_area_tasks.filter(t => t.task_id !== taskId);
            hideLoading();
            showToast("✅ Penugasan berhasil dihapus.", "success");
            return true;
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        showToast(`⚠️ Gagal: ${error.message}`, "error");
        return false;
    }
}

// =========================================================================
// CHATBOT DATABASE UTILITIES
// =========================================================================

async function executeGenericCUDLocal(action, sheetName, keyCol, keyValue, recordOrUpdates) {
    showLoading("Menjalankan perubahan data...");
    try {
        const payload = {
            action: action === 'create' ? 'createRecord' : action === 'update' ? 'updateRecord' : 'deleteRecord',
            sheetName: sheetName
        };
        if (action === 'create') {
            payload.record = recordOrUpdates;
        } else if (action === 'update') {
            payload.keyCol = keyCol;
            payload.keyValue = keyValue;
            payload.updates = recordOrUpdates;
        } else {
            payload.keyCol = keyCol;
            payload.keyValue = keyValue;
        }

        const res = await runWithRetry(payload);
        if (res.success) {
            // Update local appState dynamically!
            const stateKey = sheetName.replace("tb_", "");
            let localArray = appState[stateKey];
            if (!localArray) {
                // Fallback mapping: e.g. tb_users -> appState.users, etc.
                if (sheetName === 'tb_users') localArray = appState.users;
                else if (sheetName === 'tb_room_checklist') localArray = appState.room_checklist;
                else if (sheetName === 'tb_room_assignments') localArray = appState.room_assignments;
                else if (sheetName === 'tb_area_tasks_daily') localArray = appState.area_tasks_daily;
                else if (sheetName === 'tb_staff_area_tasks') localArray = appState.staff_area_tasks;
                else if (sheetName === 'tb_housekeeping_project_master') localArray = appState.housekeeping_project_master;
                else if (sheetName === 'tb_housekeeping_projects') localArray = appState.housekeeping_projects;
                else if (sheetName === 'tb_inventory_categories') localArray = appState.inventory_categories;
                else if (sheetName === 'tb_inventory') localArray = appState.inventory;
            }

            if (localArray) {
                if (action === 'create') {
                    // Check for unique key duplication
                    const uniqueKey = keyCol || Object.keys(recordOrUpdates)[0];
                    const idx = localArray.findIndex(x => String(x[uniqueKey]) === String(recordOrUpdates[uniqueKey]));
                    if (idx === -1) {
                        localArray.push(recordOrUpdates);
                    } else {
                        Object.assign(localArray[idx], recordOrUpdates);
                    }
                } else if (action === 'update') {
                    const idx = localArray.findIndex(x => String(x[keyCol]) === String(keyValue));
                    if (idx !== -1) {
                        Object.assign(localArray[idx], recordOrUpdates);
                    }
                } else if (action === 'delete') {
                    const filtered = localArray.filter(x => String(x[keyCol]) !== String(keyValue));
                    const stateProp = Object.keys(appState).find(k => appState[k] === localArray);
                    if (stateProp) {
                        appState[stateProp] = filtered;
                    }
                }
            }
            hideLoading();
            return { success: true, message: res.message || "Berhasil." };
        }
        throw new Error(res.message);
    } catch (error) {
        hideLoading();
        return { success: false, message: error.message };
    }
}

function getCurrentStateContext() {
    const context = {
        tables: {
            tb_users: {
                description: "Daftar karyawan dan manager",
                columns: ["user_id", "username", "name", "role", "shift_id", "status"],
                data: appState.users
            },
            tb_shifts: {
                description: "Shift kerja karyawan",
                columns: ["shift_id", "shift_name", "check_in_time", "check_out_time", "pre_check_in_minutes", "pre_check_out_minutes", "is_active"],
                data: appState.shifts
            },
            tb_rooms: {
                description: "Daftar kamar rumah sakit",
                columns: ["room_number", "room_status", "last_cleaned_at", "last_cleaned_by", "last_updated", "checklist_config", "remarks", "ideal_timer_minutes", "room_inventory"],
                data: appState.rooms
            },
            tb_areas: {
                description: "Daftar public area",
                columns: ["area_id", "area_name", "id_number", "shift_ids", "checklist_config"],
                data: appState.areas
            },
            tb_area_shifts: {
                description: "Shift kerja public area",
                columns: ["area_shift_id", "shift_name", "start_time", "end_time"],
                data: appState.area_shifts
            },
            tb_staff_area_tasks: {
                description: "Penugasan staf ke public area",
                columns: ["task_id", "area_id", "area_shift_id", "staff_id", "date", "status"],
                data: appState.staff_area_tasks
            },
            tb_area_tasks_daily: {
                description: "Tugas harian public area harian (hanya 5 data terakhir)",
                columns: ["task_daily_id", "area_id", "area_shift_id", "staff_id", "date", "status", "remarks", "updated_by", "updated_at", "tasks_completed", "linen_changed", "refills"],
                data: (appState.area_tasks_daily || []).slice(-5)
            },
            tb_inventory_categories: {
                description: "Kategori barang inventaris",
                columns: ["category_id", "category_name", "description", "default_attributes", "is_active"],
                data: appState.inventory_categories
            },
            tb_inventory: {
                description: "Stok barang inventaris global dan kamar",
                columns: ["item_id", "item_code", "category_id", "item_name", "location_room", "stock_initial", "stock_in", "stock_out", "stock_current", "min_stock", "detail_spesifik", "remarks"],
                data: appState.inventory
            },
            tb_room_assignments: {
                description: "Penugasan pembersihan kamar untuk staf (hanya 5 data terakhir)",
                columns: ["assignment_id", "date", "room_number", "staff_id", "target_status_from", "target_status_to", "remarks", "status"],
                data: (appState.room_assignments || []).slice(-5)
            },
            tb_room_checklist: {
                description: "Log checklist pembersihan kamar (hanya 5 data terakhir)",
                columns: ["checklist_id", "room_number", "staff_id", "date", "start_time", "end_time", "duration_minutes", "tasks_completed", "linen_changed", "refills", "status", "kpi_score"],
                data: (appState.room_checklist || []).slice(-5)
            },
            tb_housekeeping_project_master: {
                description: "Master proyek/tugas housekeeping",
                columns: ["master_id", "title", "description", "period_type", "staff_ids", "start_date", "last_generated_date", "ideal_time", "is_active"],
                data: appState.housekeeping_project_master
            },
            tb_housekeeping_projects: {
                description: "Instansi tugas/proyek housekeeping (hanya 5 data terakhir)",
                columns: ["project_id", "master_id", "title", "description", "type", "staff_ids", "date", "ideal_time", "status"],
                data: (appState.housekeeping_projects || []).slice(-5)
            },
            tb_housekeeping_submissions: {
                description: "Pengajuan persetujuan proyek housekeeping dari staf (hanya 5 data terakhir)",
                columns: ["submission_id", "project_id", "staff_id", "description", "photo_url", "submitted_at", "status", "kpi_score", "approved_by", "approved_at"],
                data: (appState.housekeeping_submissions || []).slice(-5)
            }
        }
    };
    return JSON.stringify(context);
}
