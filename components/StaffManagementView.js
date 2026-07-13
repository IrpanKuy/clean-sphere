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
      // Exclude managers/admins from staff menu as requested
      let list = this.users ? this.users.filter(u => u.role !== 'manager' && u.role !== 'admin') : [];
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
    getEmployeeOverallKpi(userId) {
      const kpis = [];
      const checklists = (this.roomChecklist || appState.room_checklist || []).filter(c => c.staff_id === userId);
      checklists.forEach(c => {
        if (c.kpi_score !== undefined && c.kpi_score !== null && c.kpi_score !== '') {
          kpis.push(Number(c.kpi_score));
        }
      });
      const history = (appState.room_status_history || []).filter(h => h.changed_by === userId);
      history.forEach(h => {
        if (h.kpi_score !== undefined && h.kpi_score !== null && h.kpi_score !== '') {
          kpis.push(Number(h.kpi_score));
        }
      });
      const hkSubs = (appState.housekeeping_submissions || []).filter(s => s.staff_id === userId);
      hkSubs.forEach(s => {
        if (s.kpi_score !== undefined && s.kpi_score !== null && s.kpi_score !== '') {
          kpis.push(Number(s.kpi_score));
        }
      });
      const atts = (this.attendance || appState.attendance || []).filter(a => a.user_id === userId);
      atts.forEach(a => {
        if (a.kpi_score !== undefined && a.kpi_score !== null && a.kpi_score !== '') {
          kpis.push(Number(a.kpi_score));
        }
      });
      if (kpis.length === 0) return '-';
      const sum = kpis.reduce((total, val) => total + val, 0);
      return Math.round(sum / kpis.length);
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
    <div class="flex flex-col gap-6 w-full max-w-[1200px] mx-auto">
      
      <!-- SUB-TAB 1: DATA KARYAWAN & AKUN -->
      <div v-if="subTab === 'staff-accounts'" class="flex flex-col gap-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative w-full sm:w-[320px]">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari nama, username..." class="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
          </div>
          <button @click="openAddUser" class="w-full sm:w-auto h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center shrink-0">
            + Tambah Karyawan
          </button>
        </div>

        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Nama Lengkap</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Username</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                 <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Shift Default</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Rata-rata KPI</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[100px]">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="u in filteredUsers" :key="u.user_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ u.name }}</strong></td>
                <td class="py-3.5 px-4 align-middle">{{ u.username }}</td>
                <td class="py-3.5 px-4 align-middle">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border', u.role === 'manager' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200']">
                    {{ u.role.toUpperCase() }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle">{{ getShiftName(u.shift_id) }}</td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[12px] font-bold tracking-wider border bg-indigo-50 text-indigo-700 border-indigo-200" v-if="getEmployeeOverallKpi(u.user_id) !== '-'">
                    {{ getEmployeeOverallKpi(u.user_id) }} / 100
                  </span>
                  <span v-else class="text-slate-400 font-medium">-</span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border', u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200']">
                    {{ u.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <button @click="openEditUser(u)" class="h-[32px] px-4 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center shadow-sm">
                    Edit
                  </button>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="7" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Tidak ada data karyawan tercatat.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 2: PERSETUJUAN IZIN & CUTI -->
      <div v-if="subTab === 'leave-approvals'" class="flex flex-col gap-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative w-full sm:w-[320px]">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari nama, jenis izin, alasan..." class="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
          </div>
          <div>&nbsp;</div>
        </div>

        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Petugas</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Jenis Izin</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tanggal Mulai</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tanggal Selesai</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Alasan</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Bukti Gambar</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[180px]">Tindakan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="l in filteredLeave" :key="l.request_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ getUserById(l.user_id)?.name || l.user_id }}</strong></td>
                <td class="py-3.5 px-4 align-middle">
                  <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
                    {{ l.leave_type.toUpperCase() }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle">{{ formatDateStr(l.start_date) }}</td>
                <td class="py-3.5 px-4 align-middle">{{ formatDateStr(l.end_date) }}</td>
                <td class="py-3.5 px-4 align-middle"><span class="text-slate-500 text-[12.5px] font-medium">{{ l.reason }}</span></td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <a v-if="l.attachment_url" :href="l.attachment_url" target="_blank" class="h-[28px] px-3 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center shadow-sm gap-1.5 no-underline">
                    🖼️ Lihat Bukti
                  </a>
                  <span v-else class="text-slate-400 text-[12px] font-medium">Tidak Ada</span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border', l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : l.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200']">
                    {{ l.status === 'approved' ? 'DISETUJUI' : l.status === 'rejected' ? 'DITOLAK' : 'PENDING' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <div v-if="l.status === 'pending'" class="flex gap-1.5 justify-center">
                    <button @click="handleLeaveDecision(l.request_id, 'approved')" class="h-[32px] px-3 bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold text-[12px] rounded-lg hover:bg-emerald-100 transition-colors inline-flex items-center justify-center shadow-sm">
                      Setujui
                    </button>
                    <button @click="handleLeaveDecision(l.request_id, 'rejected')" class="h-[32px] px-3 bg-red-50 border border-red-200 text-red-600 font-bold text-[12px] rounded-lg hover:bg-red-100 transition-colors inline-flex items-center justify-center shadow-sm">
                      Tolak
                    </button>
                  </div>
                  <span v-else class="text-slate-400 text-[12px] font-medium">Diproses oleh Admin</span>
                </td>
              </tr>
              <tr v-if="filteredLeave.length === 0">
                <td colspan="8" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Tidak ada pengajuan izin staf tercatat.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 3: SHIFT KERJA -->
      <div v-if="subTab === 'shift-config'" class="flex flex-col gap-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative w-full sm:w-[320px]">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari shift..." class="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
          </div>
          <button @click="openAddShift" class="w-full sm:w-auto h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center shrink-0">
            + Tambah Shift
          </button>
        </div>

        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Nama Shift</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Jam Masuk</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Jam Pulang</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Toleransi Check-In (min)</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Toleransi Check-Out (min)</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[100px]">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="s in filteredShifts" :key="s.shift_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ s.shift_name }}</strong></td>
                <td class="py-3.5 px-4 align-middle text-center font-bold text-slate-700">{{ s.check_in_time }}</td>
                <td class="py-3.5 px-4 align-middle text-center font-bold text-slate-700">{{ s.check_out_time }}</td>
                <td class="py-3.5 px-4 align-middle text-center font-medium">{{ s.pre_check_in_minutes }} menit</td>
                <td class="py-3.5 px-4 align-middle text-center font-medium">{{ s.pre_check_out_minutes }} menit</td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border', s.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200']">
                    {{ s.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <button @click="openEditShift(s)" class="h-[32px] px-4 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center shadow-sm">
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
      <div v-if="subTab === 'attendance-kpi-report'" class="flex flex-col gap-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative w-full sm:w-[320px]">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari nama karyawan..." class="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
          </div>
          
          <div class="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <select v-model="attPeriodFilter" class="w-full sm:w-auto h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              <option value="all">Semua Waktu</option>
              <option value="day">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
            
            <input type="date" v-model="attDateFilter" class="w-full sm:w-auto h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" title="Pilih tanggal spesifik">
            <input type="month" v-model="attMonthFilter" class="w-full sm:w-auto h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" title="Pilih bulan spesifik">
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Tanggal</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Karyawan</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Shift</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Absen Masuk</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Absen Pulang</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Status Absensi</th>
                 <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg">KPI Absensi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="a in filteredAttendance" :key="a.attendance_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><span class="tracking-tight text-[13.5px] font-semibold text-slate-700">{{ formatDateStr(a.date) }}</span></td>
                <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ getUserById(a.user_id)?.name || a.user_id }}</strong></td>
                <td class="py-3.5 px-4 align-middle text-[13.5px] font-medium text-slate-700">{{ getShiftName(a.shift_id) }}</td>
                <td class="py-3.5 px-4 align-middle text-center font-bold text-blue-900">{{ a.check_in_time || '-' }}</td>
                <td class="py-3.5 px-4 align-middle text-center font-bold text-blue-900">{{ a.check_out_time || '-' }}</td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border', a.status === 'Ontime' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : a.status === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200']">
                    {{ a.status === 'Ontime' ? 'Tepat Waktu' : a.status === 'Late' ? 'Terlambat' : a.status.toUpperCase() }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[12px] font-bold tracking-wider border bg-amber-50 text-amber-700 border-amber-200" v-if="a.kpi_score !== undefined && a.kpi_score !== null && a.kpi_score !== ''">
                    {{ a.kpi_score }} / 100
                  </span>
                  <span v-else class="text-slate-400 font-medium">-</span>
                </td>
              </tr>
              <tr v-if="filteredAttendance.length === 0">
                <td colspan="7" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Tidak ada data absensi tercatat pada filter aktif.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- MODAL: ADD / EDIT KARYAWAN -->
      <div class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showUserModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">{{ isEditingUser ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru' }}</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="showUserModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitUserForm" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Nama Lengkap</label>
              <input type="text" v-model="editingUser.name" placeholder="Contoh: Budi Santoso" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Username</label>
              <input type="text" v-model="editingUser.username" placeholder="Contoh: budi" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Password {{ isEditingUser ? '(Biarkan kosong jika tidak ingin diubah)' : '' }}</label>
              <input type="password" v-model="editingUser.password" placeholder="Ketik password..." :required="!isEditingUser" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Jabatan / Role</label>
              <select v-model="editingUser.role" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option value="staff">Staff Housekeeping</option>
                <option value="manager">Manager / Admin</option>
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Shift Kerja Default</label>
              <select v-model="editingUser.shift_id" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option v-for="s in shifts" :key="s.shift_id" :value="s.shift_id">
                  {{ s.shift_name }} ({{ s.check_in_time }} - {{ s.check_out_time }})
                </option>
              </select>
            </div>
            <div class="flex flex-col gap-2" v-if="isEditingUser">
              <label class="text-[13px] font-bold text-slate-700">Status Akun</label>
              <select v-model="editingUser.status" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
              <button type="button" class="h-[42px] px-5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors" @click="showUserModal = false">Batal</button>
              <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all">Simpan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: ADD / EDIT SHIFT CONFIG -->
      <div class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showShiftModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">{{ isEditingShift ? 'Edit Konfigurasi Shift' : 'Tambah Shift Baru' }}</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="showShiftModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitShiftForm" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">ID Shift (Unique)</label>
              <input type="text" v-model="editingShift.shift_id" placeholder="Contoh: S1, S2, S3" :disabled="isEditingShift" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Nama Shift</label>
              <input type="text" v-model="editingShift.shift_name" placeholder="Contoh: Pagi, Siang, Malam" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Jam Masuk</label>
                <input type="time" v-model="editingShift.check_in_time" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Jam Pulang</label>
                <input type="time" v-model="editingShift.check_out_time" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700" title="Toleransi Check-In Sebelum Jam Shift (menit)">Toleransi In (min)</label>
                <input type="number" v-model.number="editingShift.pre_check_in_minutes" min="0" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700" title="Toleransi Check-Out Setelah Jam Shift (menit)">Toleransi Out (min)</label>
                <input type="number" v-model.number="editingShift.pre_check_out_minutes" min="0" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              </div>
            </div>
            <div class="flex flex-col gap-2" v-if="isEditingShift">
              <label class="text-[13px] font-bold text-slate-700">Status Shift</label>
              <select v-model="editingShift.is_active" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option :value="true">Aktif</option>
                <option :value="false">Nonaktif</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
              <button type="button" class="h-[42px] px-5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors" @click="showShiftModal = false">Batal</button>
              <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all">Simpan</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
};
