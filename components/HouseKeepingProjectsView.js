const HouseKeepingProjectsView = {
  template: `
    <div class="h-full flex flex-col space-y-6">
      
      <!-- HEADER -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-800">{{ isMasterTab ? 'Master Proyek Rutin' : 'Daftar Tugas Proyek' }}</h2>
          <p class="text-sm text-slate-500 mt-1">
            {{ isMasterTab ? 'Kelola konfigurasi jadwal proyek rutin untuk staf' : 'Pantau dan tindak lanjuti proyek housekeeping yang telah digenerate' }}
          </p>
        </div>
        <button v-if="isMasterTab" @click="openMasterModal(null)" class="bg-primary-royal hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Buat Proyek Rutin
        </button>
      </div>

      <!-- CONTENT MASTER -->
      <div v-if="isMasterTab" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th class="px-6 py-4 font-semibold">Judul Proyek</th>
                <th class="px-6 py-4 font-semibold">Periode</th>
                <th class="px-6 py-4 font-semibold">Staf Ditugaskan</th>
                <th class="px-6 py-4 font-semibold">Tgl Mulai</th>
                <th class="px-6 py-4 font-semibold">Status</th>
                <th class="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              <tr v-if="masters.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-slate-400">Belum ada data master proyek rutin.</td>
              </tr>
              <tr v-for="master in masters" :key="master.master_id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-medium text-slate-900">{{ master.title }}</td>
                <td class="px-6 py-4">
                  <span :class="['px-2.5 py-1 rounded-full text-xs font-semibold', 
                    master.period_type === 'Daily' ? 'bg-indigo-100 text-indigo-700' : 
                    master.period_type === 'Weekly' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700']">
                    {{ master.period_type }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="sId in getStaffArray(master.staff_ids)" :key="sId" class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                      {{ getUserName(sId) }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4">{{ master.start_date }}</td>
                <td class="px-6 py-4">
                  <span v-if="String(master.is_active) !== 'false'" class="text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-semibold border border-green-200/50">Aktif</span>
                  <span v-else class="text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-xs font-semibold border border-slate-200">Nonaktif</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button @click="openMasterModal(master)" class="text-blue-600 hover:text-blue-800 font-medium text-[13px] px-2 py-1">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CONTENT INSTANCES -->
      <div v-else class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div class="p-4 border-b border-slate-100 flex gap-4">
          <input type="date" v-model="filterDate" class="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary-royal focus:ring-1 focus:ring-primary-royal">
          <select v-model="filterStatus" class="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary-royal focus:ring-1 focus:ring-primary-royal">
            <option value="">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Done">Selesai (Menunggu Approve)</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
        <div class="overflow-x-auto flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-if="filteredInstances.length === 0" class="col-span-full py-12 text-center text-slate-400">
            Tidak ada data proyek untuk filter tersebut.
          </div>
          <div v-for="inst in filteredInstances" :key="inst.project_id" class="border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
            <div :class="['absolute top-0 left-0 w-1 h-full', 
                inst.status === 'Pending' ? 'bg-amber-400' : 
                inst.status === 'Done' ? 'bg-blue-400' : 'bg-green-500']"></div>
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-bold text-slate-800 line-clamp-1">{{ inst.title }}</h3>
              <span :class="['px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider',
                  inst.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                  inst.status === 'Done' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700']">
                {{ inst.status }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mb-3 line-clamp-2 min-h-[32px]">{{ inst.description || '-' }}</p>
            
            <div class="flex flex-col gap-1.5 text-xs text-slate-600 mb-4">
              <div class="flex justify-between"><span class="text-slate-400">Tgl:</span> <span class="font-medium">{{ inst.date }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Periode:</span> <span class="font-medium">{{ inst.type }}</span></div>
              <div class="flex justify-between items-start">
                <span class="text-slate-400 shrink-0">Staf:</span> 
                <span class="font-medium text-right line-clamp-2">
                  <span v-for="sId in getStaffArray(inst.staff_ids)" :key="sId" class="after:content-[',_'] last:after:content-['']">{{ getUserName(sId) }}</span>
                </span>
              </div>
            </div>

            <div class="mt-auto border-t border-slate-100 pt-3 flex flex-col gap-2">
              <a v-if="inst.photo_url" :href="inst.photo_url" target="_blank" class="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 rounded-lg">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                Lihat Foto
              </a>
              <div class="flex gap-2 w-full">
                <!-- Action Buttons for Admins/Managers to Approve or Manage -->
                <button v-if="inst.status === 'Done'" @click="handleApprove(inst)" class="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                  Approve
                </button>
                <button v-if="inst.status === 'Pending'" @click="handleMarkDone(inst)" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                  Mark as Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MASTER MODAL -->
      <div v-if="showMasterModal" class="fixed inset-0 bg-slate-900/50 z-[999] flex justify-center items-center p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-full">
          <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 class="font-bold text-lg text-slate-800">{{ masterForm.master_id ? 'Edit Master Proyek' : 'Buat Master Proyek Rutin' }}</h3>
            <button @click="closeMasterModal" class="text-slate-400 hover:text-slate-600">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Judul Proyek</label>
              <input type="text" v-model="masterForm.title" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-royal focus:ring-1 focus:ring-primary-royal">
            </div>
            
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
              <textarea v-model="masterForm.description" rows="2" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-royal focus:ring-1 focus:ring-primary-royal"></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Periode</label>
                <select v-model="masterForm.period_type" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-royal focus:ring-1 focus:ring-primary-royal">
                  <option value="Daily">Harian (Daily)</option>
                  <option value="Weekly">Mingguan (Weekly)</option>
                  <option value="Monthly">Bulanan (Monthly)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Tgl Mulai Aktif</label>
                <input type="date" v-model="masterForm.start_date" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-royal focus:ring-1 focus:ring-primary-royal">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-2">Penugasan Staf (Tugas Bersama)</label>
              <div class="border border-slate-200 rounded-lg p-3 max-h-[150px] overflow-y-auto bg-slate-50 grid grid-cols-2 gap-2">
                <label v-for="staff in activeStaffList" :key="staff.user_id" class="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors">
                  <input type="checkbox" :value="staff.user_id" v-model="masterForm.staff_ids" class="rounded text-primary-royal focus:ring-primary-royal">
                  <span class="text-[13px] text-slate-700 font-medium">{{ staff.name }}</span>
                </label>
                <div v-if="activeStaffList.length === 0" class="col-span-2 text-xs text-slate-500 italic">Tidak ada staf aktif.</div>
              </div>
            </div>

            <div v-if="masterForm.master_id" class="flex items-center mt-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="masterForm.is_active" class="rounded text-primary-royal focus:ring-primary-royal">
                <span class="text-sm font-semibold text-slate-700">Master Proyek Aktif</span>
              </label>
            </div>
          </div>
          
          <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
            <button @click="closeMasterModal" class="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Batal</button>
            <button @click="saveMaster" class="px-4 py-2 text-sm font-semibold text-white bg-primary-royal rounded-lg hover:bg-blue-700 transition-colors">Simpan Master</button>
          </div>
        </div>
      </div>

    </div>
  `,
  props: ['subTab', 'masters', 'instances', 'users'],
  emits: ['add-master', 'update-master', 'update-instance'],
  data() {
    return {
      filterDate: '',
      filterStatus: '',
      showMasterModal: false,
      masterForm: {
        master_id: null,
        title: '',
        description: '',
        period_type: 'Daily',
        staff_ids: [],
        start_date: '',
        is_active: true
      }
    }
  },
  computed: {
    isMasterTab() {
      return this.subTab === 'housekeeping-master';
    },
    activeStaffList() {
      return (this.users || []).filter(u => u.role === 'staff' && u.status === 'active');
    },
    filteredInstances() {
      let res = this.instances || [];
      if (this.filterDate) {
        res = res.filter(i => i.date === this.filterDate);
      }
      if (this.filterStatus) {
        res = res.filter(i => i.status === this.filterStatus);
      }
      return res.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  },
  methods: {
    getStaffArray(staffIdsRaw) {
      if (!staffIdsRaw) return [];
      try {
        const arr = JSON.parse(staffIdsRaw);
        return Array.isArray(arr) ? arr : [staffIdsRaw];
      } catch(e) {
        return String(staffIdsRaw).split(',').map(s => s.trim());
      }
    },
    getUserName(userId) {
      const u = (this.users || []).find(x => x.user_id === userId);
      return u ? u.name : userId;
    },
    openMasterModal(master) {
      if (master) {
        this.masterForm = {
          master_id: master.master_id,
          title: master.title,
          description: master.description,
          period_type: master.period_type,
          staff_ids: this.getStaffArray(master.staff_ids),
          start_date: master.start_date,
          is_active: String(master.is_active) !== 'false'
        };
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        this.masterForm = {
          master_id: null,
          title: '',
          description: '',
          period_type: 'Daily',
          staff_ids: [],
          start_date: `${yyyy}-${mm}-${dd}`,
          is_active: true
        };
      }
      this.showMasterModal = true;
    },
    closeMasterModal() {
      this.showMasterModal = false;
    },
    saveMaster() {
      if (!this.masterForm.title || this.masterForm.staff_ids.length === 0) {
        alert("Judul dan minimal 1 Staf harus diisi!");
        return;
      }
      if (this.masterForm.master_id) {
        this.$emit('update-master', this.masterForm.master_id, {
          title: this.masterForm.title,
          description: this.masterForm.description,
          period_type: this.masterForm.period_type,
          staff_ids: JSON.stringify(this.masterForm.staff_ids),
          start_date: this.masterForm.start_date,
          is_active: this.masterForm.is_active
        });
      } else {
        this.$emit('add-master', 
          this.masterForm.title, 
          this.masterForm.description, 
          this.masterForm.period_type, 
          this.masterForm.staff_ids, 
          this.masterForm.start_date
        );
      }
      this.closeMasterModal();
    },
    handleApprove(inst) {
      if (confirm(`Approve tugas "${inst.title}"?`)) {
        this.$emit('update-instance', inst.project_id, {
          status: 'Approved'
        });
      }
    },
    handleMarkDone(inst) {
      if (confirm(`Tandai "${inst.title}" sebagai Selesai? (Tanpa foto)`)) {
        this.$emit('update-instance', inst.project_id, {
          status: 'Done'
        });
      }
    }
  }
};
