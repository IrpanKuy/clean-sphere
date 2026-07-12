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
    <div class="flex flex-col gap-6 w-full max-w-[1200px] mx-auto">
      
      <!-- Filter Row -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <span class="text-[13px] font-bold text-slate-700 whitespace-nowrap">Tanggal:</span>
            <input type="date" v-model="filterDate" class="w-full sm:w-auto h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            
            <!-- Button to clear date filter -->
            <button 
              @click="clearDateFilter" 
              class="h-[42px] px-4 bg-blue-50 text-blue-600 font-bold text-[13px] rounded-xl hover:bg-blue-100 transition-colors inline-flex items-center justify-center shrink-0"
            >
              <svg class="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Lihat Semua Tugas
            </button>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <span class="text-[13px] font-bold text-slate-700 whitespace-nowrap">Petugas Staf:</span>
            <select v-model="filterStaff" class="w-full sm:w-[180px] h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              <option value="">Semua Staf</option>
              <option v-for="u in staffUsers" :key="u.user_id" :value="u.user_id">
                {{ u.name }}
              </option>
            </select>
          </div>
        </div>

        <button class="w-full md:w-auto h-[42px] px-5 bg-white text-blue-600 border border-blue-100 font-bold text-[13px] rounded-xl shadow-sm hover:bg-blue-50 hover:border-blue-200 hover:-translate-y-0.5 transition-all outline-none inline-flex items-center justify-center shrink-0" @click="openAddModal">
          <svg class="w-4 h-4 text-blue-600 mr-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Registrasi Penugasan Baru
        </button>
      </div>

      <!-- Main Assignments Table -->
      <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
        <div class="overflow-x-auto w-full custom-scrollbar">

          <table class="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr>
              <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider first:rounded-tl-lg whitespace-nowrap">Tanggal Tugas</th>
              <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kamar</th>
              <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Petugas Staf</th>
              <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Target Transisi</th>
              <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Catatan Kerja</th>
              <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status Kerja</th>
              <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap last:rounded-tr-lg">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="asg in filteredAssignments" :key="asg.assignment_id" class="transition-colors hover:bg-slate-50/50">
              <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ asg.date }}</strong></td>
              <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">Kamar {{ asg.room_number }}</strong></td>
              <td class="py-3.5 px-4 align-middle text-[13.5px] font-medium text-slate-700">{{ getStaffName(asg.staff_id) }}</td>
              <td class="py-3.5 px-4 align-middle">
                <span class="inline-flex items-center gap-2 font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-[13px]">
                  {{ asg.target_status_from }} &rarr; {{ asg.target_status_to }}
                </span>
              </td>
              <td class="py-3.5 px-4 align-middle text-[13px] font-medium text-slate-500">{{ asg.remarks || '-' }}</td>
              <td class="py-3.5 px-4 align-middle">
                <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border', asg.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : asg.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200']">
                  {{ asg.status }}
                </span>
              </td>
              <td class="py-3.5 px-4 align-middle">
                <button 
                  @click="openEdit(asg)" 
                  class="h-[32px] px-3 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center shadow-sm gap-1"
                >
                  <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                  Edit
                </button>
              </td>
            </tr>
            <tr v-if="filteredAssignments.length === 0">
              <td colspan="7" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">
                Tidak ada penugasan kerja terjadwal.
              </td>
            </tr>
          </tbody>
        </table>

        </div>
      </div>

      <!-- Modal: Tambah Penugasan Baru -->
      <div class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showAddModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">Registrasi Penugasan Baru</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="showAddModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitAdd" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Tanggal Tugas</label>
              <input type="date" v-model="newDate" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Kamar</label>
              <select v-model="newRoomNumber" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" required>
                <option v-for="r in rooms" :key="r.room_number" :value="r.room_number">
                  Kamar {{ r.room_number }} ({{ r.room_status }})
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Petugas Staf</label>
              <select v-model="newStaffId" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" required>
                <option v-for="u in staffUsers" :key="u.user_id" :value="u.user_id">
                  {{ u.name }} ({{ u.user_id }})
                </option>
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Status Awal (From)</label>
                <select v-model="newStatusFrom" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                  <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Status Target (To)</label>
                <select v-model="newStatusTo" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                  <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Catatan Kerja / Keterangan</label>
              <input type="text" v-model="newRemarks" placeholder="Contoh: Pembersihan AC, Ganti linen kasur" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
              <button type="button" class="h-[42px] px-5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors" @click="showAddModal = false">Batal</button>
              <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all">Registrasikan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Edit Penugasan -->
      <div class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showEditModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">Edit Jadwal Tugas Staf</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="showEditModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitEdit" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Tanggal Tugas</label>
              <input type="date" v-model="editDate" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Kamar</label>
              <select v-model="editRoomNumber" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" required>
                <option v-for="r in rooms" :key="r.room_number" :value="r.room_number">
                  Kamar {{ r.room_number }}
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Petugas Staf</label>
              <select v-model="editStaffId" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" required>
                <option v-for="u in staffUsers" :key="u.user_id" :value="u.user_id">
                  {{ u.name }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Status Awal (From)</label>
                <select v-model="editStatusFrom" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                  <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Status Target (To)</label>
                <select v-model="editStatusTo" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                  <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Catatan Kerja</label>
              <input type="text" v-model="editRemarks" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Status Pengerjaan</label>
              <select v-model="editStatus" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div class="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
              <button type="button" class="h-[42px] px-4 bg-red-50 text-red-600 font-bold text-[13px] rounded-xl hover:bg-red-100 transition-colors inline-flex items-center gap-1.5" @click="confirmDelete(editingId)">
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Hapus Jadwal
              </button>
              <div class="flex gap-2">
                <button type="button" class="h-[42px] px-5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors" @click="showEditModal = false">Batal</button>
                <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all">Simpan Perubahan</button>
              </div>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
};
