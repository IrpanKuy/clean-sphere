// =========================================================================
// VUE COMPONENT: STAFF MANAGEMENT & SHIFT CONFIGURATION VIEW
// =========================================================================
const StaffManagementView = {
  props: ['subTab', 'users', 'shifts', 'attendance', 'leaveRequests', 'roomChecklist'],
  emits: [
    'add-user', 'update-user', 
    'approve-leave', 
    'add-shift', 'update-shift'
  ],
  data() {
    return {
      searchQuery: '',
      
      // Attendance Filters
      attPeriodFilter: 'all',  // 'all', 'day', 'week', 'month'
      attDateFilter: '',       // custom date
      attMonthFilter: '',      // custom month (YYYY-MM)
      
      // Modals
      showUserModal: false,
      isEditingUser: false,
      editingUser: {
        user_id: '',
        username: '',
        password: '',
        name: '',
        role: 'staff',
        shift_id: '',
        status: 'active'
      },

      showShiftModal: false,
      isEditingShift: false,
      editingShift: {
        shift_id: '',
        shift_name: '',
        check_in_time: '07:00',
        check_out_time: '15:00',
        pre_check_in_minutes: 30,
        pre_check_out_minutes: 15,
        is_active: true
      }
    };
  },
  computed: {
    filteredUsers() {
      let list = this.users ? [...this.users] : [];
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(u => 
          String(u.name).toLowerCase().includes(q) ||
          String(u.username).toLowerCase().includes(q) ||
          String(u.role).toLowerCase().includes(q) ||
          String(u.user_id).toLowerCase().includes(q)
        );
      }
      return list;
    },
    filteredShifts() {
      let list = this.shifts ? [...this.shifts] : [];
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(s => 
          String(s.shift_name).toLowerCase().includes(q) ||
          String(s.shift_id).toLowerCase().includes(q)
        );
      }
      return list;
    },
    filteredAttendance() {
      let list = this.attendance ? [...this.attendance] : [];
      
      // Sort newest attendance first
      list.sort((a, b) => new Date(b.date + 'T' + (b.check_in_time || '00:00')) - new Date(a.date + 'T' + (a.check_in_time || '00:00')));

      const now = new Date();

      if (this.attPeriodFilter === 'day') {
        const todayStr = now.toISOString().substring(0, 10);
        list = list.filter(a => a.date === todayStr);
      } else if (this.attPeriodFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        list = list.filter(a => new Date(a.date) >= oneWeekAgo);
      } else if (this.attPeriodFilter === 'month') {
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        list = list.filter(a => {
          const d = new Date(a.date);
          return d.getFullYear() === curYear && d.getMonth() === curMonth;
        });
      }

      // Apply custom date picker filter
      if (this.attDateFilter) {
        list = list.filter(a => a.date === this.attDateFilter);
      }
      
      // Apply custom month picker filter
      if (this.attMonthFilter) {
        list = list.filter(a => String(a.date).substring(0, 7) === this.attMonthFilter);
      }

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(a => {
          const u = this.getUserById(a.user_id);
          return (u && u.name.toLowerCase().includes(q)) || a.status.toLowerCase().includes(q);
        });
      }

      return list;
    },
    filteredLeave() {
      let list = this.leaveRequests ? [...this.leaveRequests] : [];
      
      // Sort newest first
      list.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(l => {
          const u = this.getUserById(l.user_id);
          return (
            (u && u.name.toLowerCase().includes(q)) ||
            String(l.leave_type).toLowerCase().includes(q) ||
            String(l.reason).toLowerCase().includes(q) ||
            String(l.status).toLowerCase().includes(q)
          );
        });
      }
      return list;
    }
  },
  methods: {
    getUserById(id) {
      return this.users.find(u => u.user_id === id);
    },
    getShiftName(id) {
      const s = this.shifts.find(x => x.shift_id === id);
      return s ? s.shift_name : id || 'Belum Diatur';
    },
    formatDateStr(dStr) {
      if (!dStr) return '-';
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch(e) {
        return dStr;
      }
    },
    
    // KPI calculation for staff
    getStaffKpiScore(userId, dateStr) {
      const dayChecklists = this.roomChecklist.filter(c => c.staff_id === userId && c.date === dateStr);
      if (dayChecklists.length === 0) return '-';
      const sum = dayChecklists.reduce((total, c) => total + (c.kpi_score || 0), 0);
      return Math.round(sum / dayChecklists.length);
    },

    // User actions
    openAddUser() {
      this.isEditingUser = false;
      this.editingUser = {
        user_id: '',
        username: '',
        password: '',
        name: '',
        role: 'staff',
        shift_id: this.shifts[0] ? this.shifts[0].shift_id : '',
        status: 'active'
      };
      this.showUserModal = true;
    },
    openEditUser(user) {
      this.isEditingUser = true;
      this.editingUser = { 
        ...user,
        password: '' // leave blank unless changing password
      };
      this.showUserModal = true;
    },
    submitUserForm() {
      if (this.isEditingUser) {
        this.$emit('update-user', this.editingUser.user_id, this.editingUser.username, this.editingUser.password, this.editingUser.name, this.editingUser.role, this.editingUser.shift_id, this.editingUser.status);
      } else {
        this.$emit('add-user', this.editingUser.username, this.editingUser.password, this.editingUser.name, this.editingUser.role, this.editingUser.shift_id);
      }
      this.showUserModal = false;
    },

    // Shift actions
    openAddShift() {
      this.isEditingShift = false;
      this.editingShift = {
        shift_id: '',
        shift_name: '',
        check_in_time: '07:00',
        check_out_time: '15:00',
        pre_check_in_minutes: 30,
        pre_check_out_minutes: 15,
        is_active: true
      };
      this.showShiftModal = true;
    },
    openEditShift(shift) {
      this.isEditingShift = true;
      this.editingShift = { ...shift };
      this.showShiftModal = true;
    },
    submitShiftForm() {
      if (this.isEditingShift) {
        this.$emit('update-shift', this.editingShift.shift_id, this.editingShift.shift_name, this.editingShift.check_in_time, this.editingShift.check_out_time, this.editingShift.pre_check_in_minutes, this.editingShift.pre_check_out_minutes, this.editingShift.is_active);
      } else {
        this.$emit('add-shift', this.editingShift.shift_id, this.editingShift.shift_name, this.editingShift.check_in_time, this.editingShift.check_out_time, this.editingShift.pre_check_in_minutes, this.editingShift.pre_check_out_minutes);
      }
      this.showShiftModal = false;
    },

    // Leave approvals
    handleLeaveDecision(requestId, decision) {
      if (confirm(`Anda yakin ingin ${decision === 'approved' ? 'menyetujui' : 'menolak'} izin ini?`)) {
        this.$emit('approve-leave', requestId, decision);
      }
    }
  },
  template: `
    <div class="staff-view-wrapper">
      
      <!-- SUB-TAB 1: DATA KARYAWAN & AKUN -->
      <div v-if="subTab === 'staff-accounts'">
        <div class="grid-controls-row">
          <div class="search-box-wrapper">
            <span class="search-glass">
              <svg style="width: 16px; height: 16px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari nama, username..." class="ctrl-search-input">
          </div>
          <button @click="openAddUser" class="btn-primary-action">
            + Tambah Karyawan
          </button>
        </div>

        <div class="table-card">
          <div class="table-responsive">
            <table>
            <thead>
              <tr>
                <th>Nama Lengkap</th>
                <th>Username</th>
                <th>Role</th>
                <th>Shift Default</th>
                <th style="text-align: center;">Status</th>
                <th style="width: 100px; text-align: center;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in filteredUsers" :key="u.user_id">
                <td><strong>{{ u.name }}</strong></td>
                <td>{{ u.username }}</td>
                <td>
                  <span :class="['badge-status', u.role === 'manager' ? 'status-process' : 'status-vc']" style="padding: 2px 8px; font-weight:bold; font-size:11px;">
                    {{ u.role.toUpperCase() }}
                  </span>
                </td>
                <td>{{ getShiftName(u.shift_id) }}</td>
                <td style="text-align: center;">
                  <span :class="['badge-status', u.status === 'active' ? 'status-vc' : 'status-ooo']">
                    {{ u.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td style="text-align: center;">
                  <button @click="openEditUser(u)" class="btn-card-edit" style="width: auto; padding: 5px 12px; margin:0;">
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 2: PERSETUJUAN IZIN & CUTI -->
      <div v-if="subTab === 'leave-approvals'">
        <div class="grid-controls-row">
          <div class="search-box-wrapper">
            <span class="search-glass">
              <svg style="width: 16px; height: 16px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari nama, jenis izin, alasan..." class="ctrl-search-input">
          </div>
          <div>&nbsp;</div>
        </div>

        <div class="table-card">
          <div class="table-responsive">
            <table>
            <thead>
              <tr>
                <th>Petugas</th>
                <th>Jenis Izin</th>
                <th>Tanggal Mulai</th>
                <th>Tanggal Selesai</th>
                <th>Alasan</th>
                <th style="text-align: center;">Bukti Gambar</th>
                <th style="text-align: center;">Status</th>
                <th style="width: 180px; text-align: center;">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in filteredLeave" :key="l.request_id">
                <td><strong>{{ getUserById(l.user_id)?.name || l.user_id }}</strong></td>
                <td>
                  <span class="badge-status status-process" style="padding: 2px 8px; font-weight:bold; font-size:11.5px;">
                    {{ l.leave_type.toUpperCase() }}
                  </span>
                </td>
                <td>{{ formatDateStr(l.start_date) }}</td>
                <td>{{ formatDateStr(l.end_date) }}</td>
                <td><span class="text-muted" style="font-size:12.5px;">{{ l.reason }}</span></td>
                <td style="text-align: center;">
                  <a v-if="l.attachment_url" :href="l.attachment_url" target="_blank" class="btn-eye-icon" style="padding:4px 8px; font-size:12px; text-decoration:none; display:inline-flex; align-items:center; gap:3px;">
                    🖼️ Lihat Bukti
                  </a>
                  <span v-else class="text-muted" style="font-size:12px;">Tidak Ada</span>
                </td>
                <td style="text-align: center;">
                  <span :class="['badge-status', l.status === 'approved' ? 'status-vc' : l.status === 'rejected' ? 'status-vd' : 'status-process']" style="padding: 4px 8px; font-weight:bold;">
                    {{ l.status === 'approved' ? 'DISETUJUI' : l.status === 'rejected' ? 'DITOLAK' : 'PENDING' }}
                  </span>
                </td>
                <td>
                  <div v-if="l.status === 'pending'" style="display:flex; gap:6px; justify-content:center;">
                    <button @click="handleLeaveDecision(l.request_id, 'approved')" class="btn-card-edit" style="width:auto; padding:5px 10px; background-color:#ECFDF5; border-color:rgba(16,185,129,0.3); color:#10B981; margin:0;">
                      Setujui
                    </button>
                    <button @click="handleLeaveDecision(l.request_id, 'rejected')" class="btn-card-edit" style="width:auto; padding:5px 10px; background-color:#FEF2F2; border-color:rgba(239,68,68,0.2); color:#EF4444; margin:0;">
                      Tolak
                    </button>
                  </div>
                  <span v-else class="text-muted" style="font-size:12px;">Diproses oleh Admin</span>
                </td>
              </tr>
              <tr v-if="filteredLeave.length === 0">
                <td colspan="8" class="text-center-placeholder">Tidak ada pengajuan izin staf tercatat.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 3: SHIFT KERJA -->
      <div v-if="subTab === 'shift-config'">
        <div class="grid-controls-row">
          <div class="search-box-wrapper">
            <span class="search-glass">
              <svg style="width: 16px; height: 16px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari shift..." class="ctrl-search-input">
          </div>
          <button @click="openAddShift" class="btn-primary-action">
            + Tambah Shift
          </button>
        </div>

        <div class="table-card" style="max-width: 900px; margin: 0 auto;">
          <div class="table-responsive">
            <table>
            <thead>
              <tr>
                <th>Nama Shift</th>
                <th style="text-align: center;">Jam Masuk</th>
                <th style="text-align: center;">Jam Pulang</th>
                <th style="text-align: center;">Toleransi Check-In (min)</th>
                <th style="text-align: center;">Toleransi Check-Out (min)</th>
                <th style="text-align: center;">Status</th>
                <th style="width: 100px; text-align: center;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filteredShifts" :key="s.shift_id">
                <td><strong>{{ s.shift_name }}</strong></td>
                <td style="text-align: center; font-weight:500;">{{ s.check_in_time }}</td>
                <td style="text-align: center; font-weight:500;">{{ s.check_out_time }}</td>
                <td style="text-align: center;">{{ s.pre_check_in_minutes }} menit</td>
                <td style="text-align: center;">{{ s.pre_check_out_minutes }} menit</td>
                <td style="text-align: center;">
                  <span :class="['badge-status', s.is_active ? 'status-vc' : 'status-ooo']">
                    {{ s.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td style="text-align: center;">
                  <button @click="openEditShift(s)" class="btn-card-edit" style="width: auto; padding: 5px 12px; margin:0;">
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 4: LAPORAN ABSENSI & KPI -->
      <div v-if="subTab === 'attendance-kpi-report'">
        <div class="grid-controls-row">
          <div class="search-box-wrapper">
            <span class="search-glass">
              <svg style="width: 16px; height: 16px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari nama karyawan..." class="ctrl-search-input">
          </div>
          
          <div class="filter-actions-group" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <select v-model="attPeriodFilter" class="ctrl-select">
              <option value="all">Semua Waktu</option>
              <option value="day">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
            
            <input type="date" v-model="attDateFilter" class="ctrl-select" title="Pilih tanggal spesifik">
            <input type="month" v-model="attMonthFilter" class="ctrl-select" title="Pilih bulan spesifik">
          </div>
        </div>

        <div class="table-card">
          <div class="table-responsive">
            <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Karyawan</th>
                <th>Shift</th>
                <th style="text-align: center;">Absen Masuk</th>
                <th style="text-align: center;">Absen Pulang</th>
                <th style="text-align: center;">Status Absensi</th>
                <th style="text-align: center;">Rata-rata KPI Hari Ini</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in filteredAttendance" :key="a.attendance_id">
                <td><span class="font-compact">{{ formatDateStr(a.date) }}</span></td>
                <td><strong>{{ getUserById(a.user_id)?.name || a.user_id }}</strong></td>
                <td>{{ getShiftName(a.shift_id) }}</td>
                <td style="text-align: center; font-weight:500; color: #1E3A8A;">{{ a.check_in_time || '-' }}</td>
                <td style="text-align: center; font-weight:500; color: #1E3A8A;">{{ a.check_out_time || '-' }}</td>
                <td style="text-align: center;">
                  <span :class="['badge-status', a.status === 'Ontime' ? 'status-vc' : a.status === 'Late' ? 'status-process' : 'status-vd']" style="padding: 3px 8px; font-weight:bold; font-size:11.5px;">
                    {{ a.status === 'Ontime' ? 'Tepat Waktu' : a.status === 'Late' ? 'Terlambat' : a.status.toUpperCase() }}
                  </span>
                </td>
                <td style="text-align: center;">
                  <span class="badge-status status-process" style="padding: 2px 8px; font-weight:bold; font-size:11.5px;" v-if="getStaffKpiScore(a.user_id, a.date) !== '-'">
                    {{ getStaffKpiScore(a.user_id, a.date) }} / 100
                  </span>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              <tr v-if="filteredAttendance.length === 0">
                <td colspan="7" class="text-center-placeholder">Tidak ada data absensi tercatat pada filter aktif.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- MODAL: ADD / EDIT KARYAWAN -->
      <div class="modal-overlay-v2" v-if="showUserModal">
        <div class="modal-box-v2" style="max-width: 460px;">
          <div class="modal-header-v2">
            <h3>{{ isEditingUser ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru' }}</h3>
            <button class="btn-close-modal" @click="showUserModal = false">×</button>
          </div>
          <form @submit.prevent="submitUserForm" class="modal-body-v2">
            <div class="form-group-v2">
              <label>Nama Lengkap</label>
              <input type="text" v-model="editingUser.name" placeholder="Contoh: Budi Santoso" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Username</label>
              <input type="text" v-model="editingUser.username" placeholder="Contoh: budi" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Password {{ isEditingUser ? '(Biarkan kosong jika tidak ingin diubah)' : '' }}</label>
              <input type="password" v-model="editingUser.password" placeholder="Ketik password..." :required="!isEditingUser" class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Jabatan / Role</label>
              <select v-model="editingUser.role" required class="form-input-v2">
                <option value="staff">Staff Housekeeping</option>
                <option value="manager">Manager / Admin</option>
              </select>
            </div>
            <div class="form-group-v2">
              <label>Shift Kerja Default</label>
              <select v-model="editingUser.shift_id" required class="form-input-v2">
                <option v-for="s in shifts" :key="s.shift_id" :value="s.shift_id">
                  {{ s.shift_name }} ({{ s.check_in_time }} - {{ s.check_out_time }})
                </option>
              </select>
            </div>
            <div class="form-group-v2" v-if="isEditingUser">
              <label>Status Akun</label>
              <select v-model="editingUser.status" class="form-input-v2">
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
            <div class="modal-footer-v2">
              <button type="button" class="btn-sec-modal" @click="showUserModal = false">Batal</button>
              <button type="submit" class="btn-primary-action">Simpan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: ADD / EDIT SHIFT CONFIG -->
      <div class="modal-overlay-v2" v-if="showShiftModal">
        <div class="modal-box-v2" style="max-width: 460px;">
          <div class="modal-header-v2">
            <h3>{{ isEditingShift ? 'Edit Konfigurasi Shift' : 'Tambah Shift Baru' }}</h3>
            <button class="btn-close-modal" @click="showShiftModal = false">×</button>
          </div>
          <form @submit.prevent="submitShiftForm" class="modal-body-v2">
            <div class="form-group-v2">
              <label>ID Shift (Unique)</label>
              <input type="text" v-model="editingShift.shift_id" placeholder="Contoh: S1, S2, S3" :disabled="isEditingShift" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Nama Shift</label>
              <input type="text" v-model="editingShift.shift_name" placeholder="Contoh: Pagi, Siang, Malam" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Jam Masuk (HH:mm)</label>
              <input type="text" v-model="editingShift.check_in_time" placeholder="Contoh: 07:00" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Jam Pulang (HH:mm)</label>
              <input type="text" v-model="editingShift.check_out_time" placeholder="Contoh: 15:00" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Toleransi Check-In Sebelum Jam Shift (menit)</label>
              <input type="number" v-model.number="editingShift.pre_check_in_minutes" min="0" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Toleransi Check-Out Setelah Jam Shift (menit)</label>
              <input type="number" v-model.number="editingShift.pre_check_out_minutes" min="0" required class="form-input-v2">
            </div>
            <div class="form-group-v2" v-if="isEditingShift">
              <label>Status Shift</label>
              <select v-model="editingShift.is_active" class="form-input-v2">
                <option :value="true">Aktif</option>
                <option :value="false">Nonaktif</option>
              </select>
            </div>
            <div class="modal-footer-v2">
              <button type="button" class="btn-sec-modal" @click="showShiftModal = false">Batal</button>
              <button type="submit" class="btn-primary-action">Simpan</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
};
