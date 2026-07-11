// =========================================================================
// VUE COMPONENT: STAFF ROOM ASSIGNMENTS VIEW
// =========================================================================
const RoomAssignmentsView = {
  props: ['assignments', 'rooms', 'users'],
  emits: ['add-assignment', 'update-assignment', 'delete-assignment'],
  data() {
    return {
      filterDate: new Date().toISOString().substring(0, 10),
      filterStaff: '',
      // Modal state
      showAddModal: false,
      newRoomNumber: '',
      newStaffId: '',
      newDate: new Date().toISOString().substring(0, 10),
      newStatusFrom: 'VD',
      newStatusTo: 'VC',
      newRemarks: '',
      // Edit Modal state
      showEditModal: false,
      editingId: '',
      editRoomNumber: '',
      editStaffId: '',
      editDate: '',
      editStatusFrom: 'VD',
      editStatusTo: 'VC',
      editRemarks: '',
      editStatus: 'Pending',
      
      statusOptions: ['VD', 'VC', 'OD', 'OC', 'DND', 'SR', 'NS', 'SO', 'OOO', 'OOS', 'ED', 'EA', 'RS', 'DL', 'NL', 'CO', 'DO', 'MUR', 'VIP', 'COMP']
    };
  },
  computed: {
    staffUsers() {
      return (this.users || []).filter(u => u.role === 'staff' && u.status === 'active');
    },
    filteredAssignments() {
      let list = this.assignments || [];
      if (this.filterDate) {
        list = list.filter(a => a.date === this.filterDate);
      }
      if (this.filterStaff) {
        list = list.filter(a => a.staff_id === this.filterStaff);
      }
      return [...list].sort((a, b) => Number(a.room_number) - Number(b.room_number));
    }
  },
  methods: {
    getStaffName(id) {
      const u = this.users.find(x => x.user_id === id);
      return u ? u.name : id || 'Tidak dikenal';
    },
    clearDateFilter() {
      this.filterDate = '';
    },
    openAddModal() {
      this.newRoomNumber = this.rooms.length > 0 ? this.rooms[0].room_number : '';
      this.newStaffId = this.staffUsers.length > 0 ? this.staffUsers[0].user_id : '';
      this.newDate = new Date().toISOString().substring(0, 10);
      this.newStatusFrom = 'VD';
      this.newStatusTo = 'VC';
      this.newRemarks = '';
      this.showAddModal = true;
    },
    submitAdd() {
      if (!this.newRoomNumber || !this.newStaffId || !this.newDate) {
        Swal.fire("Peringatan", "Isi semua kolom wajib.", "warning");
        return;
      }
      this.$emit('add-assignment', this.newDate, this.newRoomNumber, this.newStaffId, this.newStatusFrom, this.newStatusTo, this.newRemarks);
      this.showAddModal = false;
    },
    openEdit(asg) {
      this.editingId = asg.assignment_id;
      this.editRoomNumber = asg.room_number;
      this.editStaffId = asg.staff_id;
      this.editDate = asg.date;
      this.editStatusFrom = asg.target_status_from || 'VD';
      this.editStatusTo = asg.target_status_to || 'VC';
      this.editRemarks = asg.remarks || '';
      this.editStatus = asg.status || 'Pending';
      this.showEditModal = true;
    },
    submitEdit() {
      this.$emit('update-assignment', this.editingId, this.editDate, this.editRoomNumber, this.editStaffId, this.editStatusFrom, this.editStatusTo, this.editRemarks, this.editStatus);
      this.showEditModal = false;
    },
    confirmDelete(id) {
      Swal.fire({
        title: "Hapus Penugasan?",
        text: "Apakah Anda yakin ingin menghapus jadwal penugasan staf ini?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DC2626",
        confirmButtonText: "Ya, Hapus!",
        cancelButtonText: "Batal"
      }).then((res) => {
        if (res.isConfirmed) {
          this.$emit('delete-assignment', id);
          this.showEditModal = false;
        }
      });
    },
    getAssignmentBadgeClass(status) {
      if (status === 'Completed') return 'status-done';
      if (status === 'In Progress') return 'status-process';
      return 'status-pending';
    }
  },
  template: `
    <div class="assignments-wrapper">
      
      <!-- Filter Row -->
      <div class="grid-controls-row">
        <div class="controls-left">
          <div class="filter-field-inline flex items-center gap-2">
            <span class="text-sm font-bold text-gray-700">Tanggal:</span>
            <input type="date" v-model="filterDate" class="ctrl-select-filter">
            
            <!-- Button to clear date filter -->
            <button 
              @click="clearDateFilter" 
              class="btn-sync flex items-center gap-1"
              style="padding: 9px 12px; background-color: var(--accent-light); color: var(--primary); font-weight: 700; border-radius: var(--radius-sm); font-size: 12px; height: 35px;"
            >
              <svg class="w-4 h-4 inline-block mr-0.5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Lihat Semua Tugas
            </button>
          </div>

          <div class="filter-field-inline flex items-center gap-2">
            <span class="text-sm font-bold text-gray-700">Petugas Staf:</span>
            <select v-model="filterStaff" class="ctrl-select-filter">
              <option value="">Semua Staf</option>
              <option v-for="u in staffUsers" :key="u.user_id" :value="u.user_id">
                {{ u.name }}
              </option>
            </select>
          </div>
        </div>

        <button class="btn-add-room flex items-center gap-1.5" @click="openAddModal" style="display: inline-flex; align-items: center;">
          <svg class="w-4 h-4 text-primary mr-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Registrasi Penugasan Baru
        </button>
      </div>

      <!-- Main Assignments Table -->
      <div class="table-card">
        <div class="table-responsive">

          <table>
          <thead>
            <tr>
              <th>Tanggal Tugas</th>
              <th>Kamar</th>
              <th>Petugas Staf</th>
              <th>Target Transisi</th>
              <th>Catatan Kerja</th>
              <th>Status Kerja</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asg in filteredAssignments" :key="asg.assignment_id">
              <td><strong>{{ asg.date }}</strong></td>
              <td><strong>Kamar {{ asg.room_number }}</strong></td>
              <td>{{ getStaffName(asg.staff_id) }}</td>
              <td>
                <span class="status-from-to">
                  {{ asg.target_status_from }} &rarr; {{ asg.target_status_to }}
                </span>
              </td>
              <td class="text-muted">{{ asg.remarks || '-' }}</td>
              <td>
                <span :class="['badge-status', getAssignmentBadgeClass(asg.status)]">
                  {{ asg.status }}
                </span>
              </td>
              <td>
                <button 
                  @click="openEdit(asg)" 
                  class="btn-card-edit flex items-center gap-1"
                  style="padding: 4px 8px; width: auto; display: inline-flex; align-items: center;"
                >
                  <svg class="w-3.5 h-3.5 text-blue-600 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width: 13px; height: 13px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                  Edit
                </button>
              </td>
            </tr>
            <tr v-if="filteredAssignments.length === 0">
              <td colspan="7" class="text-center-placeholder">
                Tidak ada penugasan kerja terjadwal.
              </td>
            </tr>
          </tbody>
        </table>

        </div>
      </div>

      <!-- Modal: Tambah Penugasan Baru -->
      <div class="modal-overlay-v2" v-if="showAddModal">
        <div class="modal-box-v2" style="max-width: 500px;">
          <div class="modal-header-v2">
            <h3>Registrasi Penugasan Baru</h3>
            <button class="btn-close-modal" @click="showAddModal = false">
              <svg style="width: 20px; height: 20px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitAdd" class="modal-body-v2">
            <div class="modal-field">
              <label>Tanggal Tugas</label>
              <input type="date" v-model="newDate" required class="form-input">
            </div>

            <div class="modal-field">
              <label>Kamar</label>
              <select v-model="newRoomNumber" class="form-select" required>
                <option v-for="r in rooms" :key="r.room_number" :value="r.room_number">
                  Kamar {{ r.room_number }} ({{ r.room_status }})
                </option>
              </select>
            </div>

            <div class="modal-field">
              <label>Petugas Staf</label>
              <select v-model="newStaffId" class="form-select" required>
                <option v-for="u in staffUsers" :key="u.user_id" :value="u.user_id">
                  {{ u.name }} ({{ u.user_id }})
                </option>
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="modal-field">
                <label>Status Awal (From)</label>
                <select v-model="newStatusFrom" class="form-select">
                  <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="modal-field">
                <label>Status Target (To)</label>
                <select v-model="newStatusTo" class="form-select">
                  <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <div class="modal-field">
              <label>Catatan Kerja / Keterangan</label>
              <input type="text" v-model="newRemarks" placeholder="Contoh: Pembersihan AC, Ganti linen kasur" class="form-input">
            </div>

            <div class="modal-actions-v2">
              <button type="button" class="btn-cancel" @click="showAddModal = false">Batal</button>
              <button type="submit" class="btn-confirm-add">Registrasikan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Edit Penugasan -->
      <div class="modal-overlay-v2" v-if="showEditModal">
        <div class="modal-box-v2" style="max-width: 500px;">
          <div class="modal-header-v2">
            <h3>Edit Jadwal Tugas Staf</h3>
            <button class="btn-close-modal" @click="showEditModal = false">
              <svg style="width: 20px; height: 20px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitEdit" class="modal-body-v2">
            <div class="modal-field">
              <label>Tanggal Tugas</label>
              <input type="date" v-model="editDate" required class="form-input">
            </div>

            <div class="modal-field">
              <label>Kamar</label>
              <select v-model="editRoomNumber" class="form-select" required>
                <option v-for="r in rooms" :key="r.room_number" :value="r.room_number">
                  Kamar {{ r.room_number }}
                </option>
              </select>
            </div>

            <div class="modal-field">
              <label>Petugas Staf</label>
              <select v-model="editStaffId" class="form-select" required>
                <option v-for="u in staffUsers" :key="u.user_id" :value="u.user_id">
                  {{ u.name }}
                </option>
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="modal-field">
                <label>Status Awal (From)</label>
                <select v-model="editStatusFrom" class="form-select">
                  <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="modal-field">
                <label>Status Target (To)</label>
                <select v-model="editStatusTo" class="form-select">
                  <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <div class="modal-field">
              <label>Catatan Kerja</label>
              <input type="text" v-model="editRemarks" class="form-input">
            </div>

            <div class="modal-field">
              <label>Status Pengerjaan</label>
              <select v-model="editStatus" class="form-select">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div class="modal-actions-v2 flex-between">
              <button type="button" class="btn-delete" @click="confirmDelete(editingId)">
                <svg class="w-4 h-4 inline-block mr-1 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width: 14px; height: 14px; display: inline-block; vertical-align: text-top;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Hapus Jadwal
              </button>
              <div class="flex gap-2">
                <button type="button" class="btn-cancel" @click="showEditModal = false">Batal</button>
                <button type="submit" class="btn-confirm-save">Simpan Perubahan</button>
              </div>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
};
