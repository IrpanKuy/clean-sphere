// =========================================================================
// VUE COMPONENT: ROOM AUDITING HISTORY VIEW
// =========================================================================
const RoomHistoryView = {
  props: ['statusHistory', 'users', 'checklists', 'rooms'],
  emits: ['update-checklist'],
  components: {
    'checklist-detail-viewer': ChecklistDetailViewer,
    'checklist-editor-modal': ChecklistEditorModal
  },
  data() {
    return {
      searchQuery: '',
      expandedHistoryIds: [],
      // Modal states
      showChecklistModal: false,
      editingChecklist: null,
      
      // Static config for 10 fixed statuses
      statusConfig: {
        "VD": { name: "Vacant Dirty", color: "#EF4444" },
        "VC": { name: "Vacant Clean", color: "#10B981" },
        "OD": { name: "Occupied Dirty", color: "#F59E0B" },
        "OC": { name: "Occupied Clean", color: "#3B82F6" },
        "DND": { name: "Do Not Disturb", color: "#8B5CF6" },
        "SR": { name: "Service Refused", color: "#EC4899" },
        "NS": { name: "No Show", color: "#64748B" },
        "SO": { name: "Sleep Out", color: "#14B8A6" },
        "OOO": { name: "Out of Order", color: "#374151" },
        "OOS": { name: "Out of Service", color: "#78350F" }
      }
    };
  },
  computed: {
    filteredHistory() {
      let list = this.statusHistory ? [...this.statusHistory] : [];
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(h => 
          String(h.room_number).toLowerCase().includes(q) ||
          this.getStaffName(h.changed_by).toLowerCase().includes(q) ||
          String(h.old_status).toLowerCase().includes(q) ||
          String(h.new_status).toLowerCase().includes(q)
        );
      }
      return list;
    }
  },
  methods: {
    getStaffName(id) {
      const u = this.users.find(x => x.user_id === id);
      return u ? u.name : id || 'Sistem';
    },
    getStatusColor(status) {
      const cfg = this.statusConfig[status];
      return cfg ? cfg.color : '#E2E8F0';
    },
    formatTime(isoStr) {
      if (!isoStr) return '-';
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return isoStr;
      return date.toLocaleString('id-ID', { hour12: false });
    },
    getLogLocalDateStr(timestamp) {
      if (!timestamp) return "";
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          return String(timestamp).substring(0, 10);
        }
        
        // Format to Asia/Jakarta timezone to align with database
        const formatter = new Intl.DateTimeFormat('en-US', { 
          timeZone: 'Asia/Jakarta', 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find(p => p.type === 'year').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        return `${year}-${month}-${day}`;
      } catch (e) {
        console.error("Timezone standardizing error:", e);
        return String(timestamp).substring(0, 10);
      }
    },
    getAssociatedChecklist(log) {
      if (!log.timestamp) return null;
      
      // Standardize search dates to prevent timezone mismatches
      const logDateStr = this.getLogLocalDateStr(log.timestamp);
      if (!logDateStr) return null;
      
      let found = (this.checklists || []).find(c => 
        String(c.room_number) === String(log.room_number) && 
        c.date === logDateStr
      );

      if (!found) {
        // Skeleton checklist
        found = {
          checklist_id: "", 
          room_number: String(log.room_number),
          staff_id: log.changed_by || (this.users[0] ? this.users[0].user_id : "USR002"),
          date: logDateStr,
          start_time: "08:00",
          end_time: "08:15",
          duration_minutes: 15,
          tasks_completed: "{}",
          linen_changed: "{}",
          refills: "{}",
          status: "Completed",
          kpi_score: 0
        };
      }
      return found;
    },
    toggleRow(historyId) {
      const idx = this.expandedHistoryIds.indexOf(historyId);
      if (idx !== -1) {
        this.expandedHistoryIds.splice(idx, 1);
      } else {
        this.expandedHistoryIds.push(historyId);
      }
    },
    isRowExpanded(historyId) {
      return this.expandedHistoryIds.includes(historyId);
    },
    triggerEdit(c) {
      this.editingChecklist = c;
      this.showChecklistModal = true;
    },
    submitUpdateChecklist(payload) {
      const isNew = !payload.checklist_id;
      const extraData = {};
      if (isNew && this.editingChecklist) {
        extraData.room_number = this.editingChecklist.room_number;
        extraData.staff_id = this.editingChecklist.staff_id;
        extraData.date = this.editingChecklist.date;
        extraData.start_time = this.editingChecklist.start_time;
        extraData.end_time = this.editingChecklist.end_time;
        extraData.duration_minutes = this.editingChecklist.duration_minutes;
      }

      this.$emit('update-checklist', 
        payload.checklist_id,
        JSON.stringify(payload.tasks_completed),
        JSON.stringify(payload.linen_changed),
        JSON.stringify(payload.refills),
        payload.kpi_score,
        extraData
      );
      this.showChecklistModal = false;
    }
  },
  template: `
    <div class="room-history-wrapper">
      <div class="grid-controls-row">
        <div class="search-box-wrapper">
          <span class="search-glass">
            <svg style="width: 16px; height: 16px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
            </svg>
          </span>
          <input type="text" v-model="searchQuery" placeholder="Cari nomor kamar, status, atau petugas..." class="ctrl-search-input">
        </div>
      </div>

      <!-- Main Riwayat Status Kamar Table -->
      <div class="table-card">
        <div class="table-responsive">
          <table>
          <thead>
            <tr>
              <th>Waktu Perubahan</th>
              <th>Kamar</th>
              <th>Status Lama</th>
              <th>Status Baru</th>
              <th>Diubah Oleh</th>
              <th>Durasi Status</th>
              <th style="width: 130px; text-align: center;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="log in filteredHistory" :key="log.history_id">
              <tr>
                <td><span class="font-compact">{{ formatTime(log.timestamp) }}</span></td>
                <td><strong>Kamar {{ log.room_number }}</strong></td>
                <td>
                  <span class="history-badge" :style="{ backgroundColor: getStatusColor(log.old_status) }">
                    {{ log.old_status }}
                  </span>
                </td>
                <td>
                  <span class="history-badge" :style="{ backgroundColor: getStatusColor(log.new_status) }">
                    {{ log.new_status }}
                  </span>
                </td>
                <td>{{ getStaffName(log.changed_by) }}</td>
                <td>
                  <span class="duration-text flex items-center gap-1" v-if="log.duration_minutes">
                    <svg class="w-3.5 h-3.5 text-gray-500 inline mr-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width:14px; height:14px; display:inline-block;">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ log.duration_minutes }} menit
                  </span>
                  <span v-else>-</span>
                </td>
                <td style="white-space: nowrap; text-align: center;">
                  <div style="display: inline-flex; align-items: center; gap: 8px;">
                    <!-- Eye Icon Detail next to Edit button -->
                    <button 
                      v-if="getAssociatedChecklist(log)" 
                      @click="toggleRow(log.history_id)" 
                      class="btn-eye-icon"
                      :class="{ 'expanded-eye': isRowExpanded(log.history_id) }"
                      :title="isRowExpanded(log.history_id) ? 'Tutup Detail' : 'Buka Detail'"
                      style="display: inline-flex; align-items: center; justify-content: center; padding: 6px;"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" style="width: 15px; height: 15px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    
                    <button 
                      v-if="getAssociatedChecklist(log)" 
                      @click="triggerEdit(getAssociatedChecklist(log))" 
                      class="btn-card-edit flex items-center gap-1" 
                      style="padding: 6px 10px; width: auto; display: inline-flex; align-items: center; margin: 0;"
                    >
                      <svg class="w-3.5 h-3.5 text-blue-600 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width: 13px; height: 13px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                      Edit
                    </button>
                    <span v-else style="opacity: 0.3;">-</span>
                  </div>
                </td>
              </tr>

              <!-- Accordion Dropdown Sub-Row -->
              <tr v-if="isRowExpanded(log.history_id) && getAssociatedChecklist(log)">
                <td colspan="7" class="expanded-accordion-cell">
                  <checklist-detail-viewer
                    :checklist="getAssociatedChecklist(log)"
                    :rooms="rooms"
                    :users="users"
                  ></checklist-detail-viewer>
                </td>
              </tr>
            </template>
            <tr v-if="filteredHistory.length === 0">
              <td colspan="7" class="text-center-placeholder">
                Belum ada riwayat perubahan status kamar tercatat.
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Checklist Editor Modal -->
      <checklist-editor-modal
        :show="showChecklistModal"
        :checklist="editingChecklist"
        :rooms="rooms"
        :users="users"
        @close="showChecklistModal = false"
        @save="submitUpdateChecklist"
      ></checklist-editor-modal>
    </div>
  `
};
