// =========================================================================
// VUE COMPONENT: AREA MANAGEMENT VIEW
// =========================================================================
const AreaManagementView = {
  props: ['subTab', 'areas', 'areaShifts', 'staffAreaTasks', 'users'],
  emits: ['add-area', 'update-area', 'delete-area', 'add-area-shift', 'update-area-shift', 'delete-area-shift', 'assign-staff-area', 'delete-assignment'],
  data() {
    return {
      // Area Modal States
      showAreaModal: false,
      isEditingArea: false,
      editingAreaId: null,
      areaForm: {
        area_name: '',
        id_number: '',
        shift_ids: [],
        checklist_config: []
      },
      
      // Shift Modal States
      showShiftModal: false,
      isEditingShift: false,
      editingShiftId: null,
      shiftForm: {
        shift_name: '',
        start_time: '',
        end_time: ''
      },

      // Assignment Modal States
      showAssignModal: false,
      assignForm: {
        area_id: '',
        shift_ids: [],
        staff_ids: []
      }
    };
  },
  computed: {
    staffUsers() {
      return (this.users || []).filter(u => u.role === 'staff' && u.status === 'active');
    }
  },
  methods: {
    // Utility helpers
    getShiftNamesCsv(shiftIdsCsv) {
      if (!shiftIdsCsv) return '-';
      const ids = shiftIdsCsv.split(',').map(s => s.trim()).filter(Boolean);
      return ids.map(id => {
        const sh = this.areaShifts.find(s => s.area_shift_id === id);
        return sh ? sh.shift_name : id;
      }).join(', ');
    },
    getUserName(id) {
      const u = this.users.find(x => x.user_id === id);
      return u ? u.name : id || '-';
    },
    getShiftName(id) {
      const sh = this.areaShifts.find(x => x.area_shift_id === id);
      return sh ? sh.shift_name : id || '-';
    },
    getAreaName(id) {
      const a = this.areas.find(x => x.area_id === id);
      return a ? a.area_name : id || '-';
    },

    // --- AREA CRUD ---
    openAddArea() {
      this.isEditingArea = false;
      this.editingAreaId = null;
      this.areaForm = {
        area_name: '',
        id_number: '',
        shift_ids: [],
        checklist_config: [
          { name: "Cleaning", type: "checklist", itemsText: "Trash, Floor, Toilet" },
          { name: "Change", type: "inout", itemsText: "Linen" },
          { name: "Refill", type: "in", itemsText: "Soap, Tissue" }
        ]
      };
      this.showAreaModal = true;
    },
    openEditArea(area) {
      this.isEditingArea = true;
      this.editingAreaId = area.area_id;
      
      let parsedConfig = [];
      if (area.checklist_config) {
        try {
          const parsed = JSON.parse(area.checklist_config);
          for (let cat in parsed) {
            const catVal = parsed[cat];
            parsedConfig.push({
              name: cat,
              type: catVal.type || 'checklist',
              itemsText: Array.isArray(catVal.items) ? catVal.items.join(', ') : ''
            });
          }
        } catch(e) {
          console.error(e);
        }
      }
      
      if (parsedConfig.length === 0) {
        parsedConfig = [
          { name: "Cleaning", type: "checklist", itemsText: "Trash, Floor, Toilet" },
          { name: "Change", type: "inout", itemsText: "Linen" },
          { name: "Refill", type: "in", itemsText: "Soap, Tissue" }
        ];
      }

      this.areaForm = {
        area_name: area.area_name,
        id_number: area.id_number || '',
        shift_ids: area.shift_ids ? area.shift_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
        checklist_config: parsedConfig
      };
      this.showAreaModal = true;
    },
    addConfigCategory() {
      this.areaForm.checklist_config.push({
        name: '',
        type: 'checklist',
        itemsText: ''
      });
    },
    removeConfigCategory(idx) {
      this.areaForm.checklist_config.splice(idx, 1);
    },
    saveArea() {
      if (!this.areaForm.area_name.trim()) {
        Swal.fire("Peringatan", "Nama Area wajib diisi.", "warning");
        return;
      }
      if (this.areaForm.shift_ids.length === 0) {
        Swal.fire("Peringatan", "Pilih minimal satu Shift untuk area ini.", "warning");
        return;
      }

      const configObj = {};
      this.areaForm.checklist_config.forEach(cat => {
        if (cat.name.trim()) {
          configObj[cat.name.trim()] = {
            type: cat.type,
            items: cat.itemsText.split(',').map(i => i.trim()).filter(Boolean)
          };
        }
      });

      if (this.isEditingArea) {
        this.$emit('update-area', this.editingAreaId, this.areaForm.area_name, this.areaForm.id_number, this.areaForm.shift_ids, configObj);
      } else {
        this.$emit('add-area', this.areaForm.area_name, this.areaForm.id_number, this.areaForm.shift_ids, configObj);
      }
      this.showAreaModal = false;
    },
    deleteArea(areaId) {
      Swal.fire({
        title: "Apakah Anda yakin?",
        text: "Data area ini beserta penugasannya akan dihapus secara permanen!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#EF4444",
        confirmButtonText: "Ya, Hapus!",
        cancelButtonText: "Batal"
      }).then((result) => {
        if (result.isConfirmed) {
          this.$emit('delete-area', areaId);
        }
      });
    },

    // --- SHIFT CRUD ---
    openAddShift() {
      this.isEditingShift = false;
      this.editingShiftId = null;
      this.shiftForm = {
        shift_name: '',
        start_time: '08:00',
        end_time: '16:00'
      };
      this.showShiftModal = true;
    },
    openEditShift(shift) {
      this.isEditingShift = true;
      this.editingShiftId = shift.area_shift_id;
      this.shiftForm = {
        shift_name: shift.shift_name,
        start_time: shift.start_time,
        end_time: shift.end_time
      };
      this.showShiftModal = true;
    },
    saveShift() {
      if (!this.shiftForm.shift_name.trim() || !this.shiftForm.start_time || !this.shiftForm.end_time) {
        Swal.fire("Peringatan", "Semua kolom shift wajib diisi.", "warning");
        return;
      }
      if (this.isEditingShift) {
        this.$emit('update-area-shift', this.editingShiftId, this.shiftForm.shift_name, this.shiftForm.start_time, this.shiftForm.end_time);
      } else {
        this.$emit('add-area-shift', this.shiftForm.shift_name, this.shiftForm.start_time, this.shiftForm.end_time);
      }
      this.showShiftModal = false;
    },
    deleteShift(shiftId) {
      Swal.fire({
        title: "Apakah Anda yakin?",
        text: "Shift area ini akan dihapus secara permanen!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#EF4444",
        confirmButtonText: "Ya, Hapus!",
        cancelButtonText: "Batal"
      }).then((result) => {
        if (result.isConfirmed) {
          this.$emit('delete-area-shift', shiftId);
        }
      });
    },

    // --- ASSIGNMENT CRUD ---
    openAssignStaff() {
      this.assignForm = {
        area_id: this.areas[0] ? this.areas[0].area_id : '',
        shift_ids: [],
        staff_ids: []
      };
      this.showAssignModal = true;
    },
    openEditAssign(areaId) {
      // Find all current staff and shifts assigned to this area
      const currentTasks = this.staffAreaTasks.filter(t => t.area_id === areaId);
      const shiftIdsSet = new Set(currentTasks.map(t => t.area_shift_id));
      const staffIdsSet = new Set(currentTasks.map(t => t.staff_id));

      this.assignForm = {
        area_id: areaId,
        shift_ids: Array.from(shiftIdsSet),
        staff_ids: Array.from(staffIdsSet)
      };
      this.showAssignModal = true;
    },
    saveAssignment() {
      if (!this.assignForm.area_id) {
        Swal.fire("Peringatan", "Pilih area terlebih dahulu.", "warning");
        return;
      }
      if (this.assignForm.shift_ids.length === 0) {
        Swal.fire("Peringatan", "Pilih minimal satu Shift.", "warning");
        return;
      }
      if (this.assignForm.staff_ids.length === 0) {
        Swal.fire("Peringatan", "Pilih minimal satu Staf.", "warning");
        return;
      }

      this.$emit('assign-staff-area', this.assignForm.area_id, this.assignForm.shift_ids, this.assignForm.staff_ids);
      this.showAssignModal = false;
    },
    getAssignedStaffCount(areaId) {
      const staffSet = new Set(this.staffAreaTasks.filter(t => t.area_id === areaId).map(t => t.staff_id));
      return staffSet.size;
    },
    getAssignedShiftsCount(areaId) {
      const shiftSet = new Set(this.staffAreaTasks.filter(t => t.area_id === areaId).map(t => t.area_shift_id));
      return shiftSet.size;
    },
    getAssignedStaffNames(areaId) {
      const staffIds = Array.from(new Set(this.staffAreaTasks.filter(t => t.area_id === areaId).map(t => t.staff_id)));
      if (staffIds.length === 0) return '-';
      return staffIds.map(id => this.getUserName(id)).join(', ');
    },
    getAssignedShiftNames(areaId) {
      const shiftIds = Array.from(new Set(this.staffAreaTasks.filter(t => t.area_id === areaId).map(t => t.area_shift_id)));
      if (shiftIds.length === 0) return '-';
      return shiftIds.map(id => this.getShiftName(id)).join(', ');
    },
    deleteAssignment(taskId) {
      Swal.fire({
        title: "Apakah Anda yakin?",
        text: "Penugasan staf area ini akan dihapus secara permanen!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#EF4444",
        confirmButtonText: "Ya, Hapus!",
        cancelButtonText: "Batal"
      }).then((result) => {
        if (result.isConfirmed) {
          this.$emit('delete-assignment', taskId);
        }
      });
    }
  },
  template: `
    <div class="flex flex-col gap-6 w-full animate-[fadeIn_0.3s_ease]">
      
      <!-- TITLE BAR & TOP ACTION -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900 leading-tight">
            {{ subTab === 'areas-data' ? 'Manajemen Public Area' : subTab === 'area-shifts' ? 'Konfigurasi Shift Area' : 'Penugasan Staf Area' }}
          </h2>
          <p class="text-xs text-slate-400 font-semibold mt-1">
            {{ subTab === 'areas-data' ? 'Kelola dataset public area dan konfigurasi formulir checklist beranak secara dinamis.' : 
               subTab === 'area-shifts' ? 'Konfigurasi jam kerja shift (Morning, Middle, Evening, Night) untuk pembersihan area.' : 
               'Tugaskan staf pelaksana ke area kerja beserta shift tanggung jawab harian.' }}
          </p>
        </div>
        
        <div>
          <button v-if="subTab === 'areas-data'" @click="openAddArea" class="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-1.5 shrink-0 border-none cursor-pointer">
            + Tambah Area
          </button>
          <button v-if="subTab === 'area-shifts'" @click="openAddShift" class="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-1.5 shrink-0 border-none cursor-pointer">
            + Tambah Shift Area
          </button>
          <button v-if="subTab === 'staff-area-tasks'" @click="openAssignStaff" class="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-1.5 shrink-0 border-none cursor-pointer">
            + Atur Penugasan Staf
          </button>
        </div>
      </div>

      <!-- VIEW 1: DATA AREA -->
      <div v-if="subTab === 'areas-data'" class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
        <div class="overflow-x-auto w-full custom-scrollbar">
          <table class="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">ID Number</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Nama Area</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Shift Terkait</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Konfigurasi Checklist</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[160px]">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="area in areas" :key="area.area_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><code class="font-mono text-[12px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">{{ area.id_number || '-' }}</code></td>
                <td class="py-3.5 px-4 align-middle"><strong class="text-[14px] font-bold text-slate-900">{{ area.area_name }}</strong></td>
                <td class="py-3.5 px-4 align-middle">
                  <span class="text-[13px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    {{ getShiftNamesCsv(area.shift_ids) }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="(val, catName) in JSON.parse(area.checklist_config || '{}')" :key="catName" class="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/50 rounded text-[10.5px] font-bold uppercase">
                      {{ catName }} ({{ val.type }})
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <div class="flex justify-center gap-1.5">
                    <button @click="openEditArea(area)" class="h-[32px] px-3 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center shadow-sm cursor-pointer">
                      Edit
                    </button>
                    <button @click="deleteArea(area.area_id)" class="h-[32px] px-3 bg-white border border-slate-200 text-rose-600 font-bold text-[12px] rounded-lg hover:bg-rose-50 hover:border-rose-200 transition-colors inline-flex items-center justify-center shadow-sm cursor-pointer">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="areas.length === 0">
                <td colspan="5" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Tidak ada data area publik tercatat.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VIEW 2: KONFIGURASI SHIFT AREA -->
      <div v-if="subTab === 'area-shifts'" class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
        <div class="overflow-x-auto w-full custom-scrollbar">
          <table class="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Nama Shift</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Waktu Mulai</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Waktu Selesai</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[160px]">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="shift in areaShifts" :key="shift.area_shift_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><strong class="text-[14px] font-bold text-slate-900">{{ shift.shift_name }}</strong></td>
                <td class="py-3.5 px-4 align-middle text-center font-bold text-blue-900 text-[13.5px]">{{ shift.start_time }}</td>
                <td class="py-3.5 px-4 align-middle text-center font-bold text-blue-900 text-[13.5px]">{{ shift.end_time }}</td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <div class="flex justify-center gap-1.5">
                    <button @click="openEditShift(shift)" class="h-[32px] px-3 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center shadow-sm cursor-pointer">
                      Edit
                    </button>
                    <button @click="deleteShift(shift.area_shift_id)" class="h-[32px] px-3 bg-white border border-slate-200 text-rose-600 font-bold text-[12px] rounded-lg hover:bg-rose-50 hover:border-rose-200 transition-colors inline-flex items-center justify-center shadow-sm cursor-pointer">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="areaShifts.length === 0">
                <td colspan="4" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Tidak ada shift area dikonfigurasikan.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VIEW 3: PENUGASAN STAFF -->
      <div v-if="subTab === 'staff-area-tasks'" class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
        <div class="overflow-x-auto w-full custom-scrollbar">
          <table class="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Nama Area</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Shift Kerja</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Petugas Staf</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[120px]">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="task in staffAreaTasks" :key="task.task_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><strong class="text-[14px] font-bold text-slate-900">{{ getAreaName(task.area_id) }}</strong></td>
                <td class="py-3.5 px-4 align-middle text-[13px] font-bold text-slate-700">{{ getShiftName(task.area_shift_id) }}</td>
                <td class="py-3.5 px-4 align-middle text-[13px] font-semibold text-slate-800">{{ getUserName(task.staff_id) }}</td>
                <td class="py-3.5 px-4 align-middle text-[13px] font-mono font-bold text-slate-600">{{ task.date || '-' }}</td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10.5px] font-extrabold uppercase tracking-wide border shadow-sm', 
                    task.status === 'selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200']">
                    {{ task.status || 'pending' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <button @click="deleteAssignment(task.task_id)" class="h-[32px] px-3 bg-white border border-slate-200 text-rose-600 font-bold text-[12px] rounded-lg hover:bg-rose-50 hover:border-rose-200 transition-colors inline-flex items-center justify-center shadow-sm cursor-pointer">
                    Hapus
                  </button>
                </td>
              </tr>
              <tr v-if="staffAreaTasks.length === 0">
                <td colspan="6" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Tidak ada penugasan staf area aktif.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ==================== MODAL: AREA ADD/EDIT ==================== -->
      <div v-if="showAreaModal" class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] flex flex-col relative animate-[zoomIn_0.2s_ease-out]">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">{{ isEditingArea ? 'Edit Data Area' : 'Tambah Area Baru' }}</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 border-none cursor-pointer" @click="showAreaModal = false">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="saveArea" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <!-- Basic Info -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-700">Nama Area *</label>
              <input type="text" v-model="areaForm.area_name" placeholder="Contoh: Toilet Lobby Utama, Gedung A" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" required>
            </div>
            
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-700">ID Number (Kode Area)</label>
              <input type="text" v-model="areaForm.id_number" placeholder="Contoh: A.TOI.01" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>

            <!-- Shift association -->
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-slate-700">Pilih Shift Terkait (Bisa > 1) *</label>
              <div class="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <label v-for="shift in areaShifts" :key="shift.area_shift_id" class="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100/60 rounded-md cursor-pointer select-none">
                  <input type="checkbox" v-model="areaForm.shift_ids" :value="shift.area_shift_id" class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                  <span class="text-xs font-bold text-slate-700">{{ shift.shift_name }} ({{ shift.start_time }})</span>
                </label>
              </div>
            </div>

            <!-- Dynamic Checklist Config Editor -->
            <div class="flex flex-col gap-3">
              <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-slate-700">Konfigurasi Checklist Beranak (Dinamis)</label>
                <button type="button" @click="addConfigCategory" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10.5px] font-extrabold rounded-lg border border-blue-200 transition-colors cursor-pointer">
                  + Kategori
                </button>
              </div>

              <div class="flex flex-col gap-3">
                <div v-for="(cat, idx) in areaForm.checklist_config" :key="idx" class="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3 relative">
                  <button type="button" @click="removeConfigCategory(idx)" class="absolute top-3 right-3 text-slate-400 hover:text-rose-500 border-none bg-transparent cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mr-6">
                    <div class="flex flex-col gap-1">
                      <label class="text-[10px] font-black text-slate-500 uppercase">Nama Kategori</label>
                      <input type="text" v-model="cat.name" placeholder="Misal: Cleaning / Refill" class="h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500" required>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="text-[10px] font-black text-slate-500 uppercase">Tipe Input</label>
                      <select v-model="cat.type" class="h-[36px] px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                        <option value="checklist">Checklist (Centang)</option>
                        <option value="inout">In & Out (Linen)</option>
                        <option value="in">In (Refill)</option>
                      </select>
                    </div>
                  </div>

                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-black text-slate-500 uppercase">Daftar Sub-Item (Pisahkan dengan koma)</label>
                    <input type="text" v-model="cat.itemsText" placeholder="Contoh: Trash, Floor, Mirror, Soap Dispenser" class="h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                  </div>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-2">
              <button type="button" @click="showAreaModal = false" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer border-none">
                Batal
              </button>
              <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer border-none">
                Simpan Area
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ==================== MODAL: SHIFT ADD/EDIT ==================== -->
      <div v-if="showShiftModal" class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[450px] flex flex-col relative animate-[zoomIn_0.2s_ease-out]">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">{{ isEditingShift ? 'Edit Shift Area' : 'Tambah Shift Baru' }}</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 border-none cursor-pointer" @click="showShiftModal = false">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="saveShift" class="flex flex-col gap-5 p-6">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-700">Nama Shift *</label>
              <input type="text" v-model="shiftForm.shift_name" placeholder="Contoh: Morning / Evening / Night" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500" required>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-700">Waktu Mulai *</label>
                <input type="time" v-model="shiftForm.start_time" class="h-[42px] px-3 bg-white border border-slate-200 rounded-xl text-[13.5px] font-semibold text-slate-700 outline-none" required>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-700">Waktu Selesai *</label>
                <input type="time" v-model="shiftForm.end_time" class="h-[42px] px-3 bg-white border border-slate-200 rounded-xl text-[13.5px] font-semibold text-slate-700 outline-none" required>
              </div>
            </div>

            <div class="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-2">
              <button type="button" @click="showShiftModal = false" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border-none cursor-pointer">
                Batal
              </button>
              <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs border-none shadow-md cursor-pointer">
                Simpan Shift
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ==================== MODAL: ATUR PENUGASAN STAFF ==================== -->
      <div v-if="showAssignModal" class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] flex flex-col relative animate-[zoomIn_0.2s_ease-out]">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">Atur Penugasan Staf Area</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 border-none cursor-pointer" @click="showAssignModal = false">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="saveAssignment" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <!-- Select Area -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-700">Pilih Area *</label>
              <select v-model="assignForm.area_id" class="h-[42px] px-3 bg-white border border-slate-200 rounded-xl text-[13.5px] font-semibold text-slate-700 outline-none focus:border-blue-500 shadow-sm" required>
                <option value="" disabled>-- Pilih Area --</option>
                <option v-for="area in areas" :key="area.area_id" :value="area.area_id">{{ area.area_name }}</option>
              </select>
            </div>

            <!-- Select Shifts (Multi-select) -->
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-slate-700">Pilih Shift yang Ditugaskan (Bisa > 1) *</label>
              <div class="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60 max-h-[140px] overflow-y-auto custom-scrollbar">
                <label v-for="shift in areaShifts" :key="shift.area_shift_id" class="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 rounded-md cursor-pointer select-none">
                  <input type="checkbox" v-model="assignForm.shift_ids" :value="shift.area_shift_id" class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                  <span class="text-xs font-bold text-slate-700">{{ shift.shift_name }} ({{ shift.start_time }})</span>
                </label>
              </div>
            </div>

            <!-- Select Staff (Multi-select) -->
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-slate-700">Pilih Petugas Staf (Bisa > 1) *</label>
              <div class="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60 max-h-[200px] overflow-y-auto custom-scrollbar">
                <label v-for="staff in staffUsers" :key="staff.user_id" class="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-100 rounded-md cursor-pointer select-none">
                  <input type="checkbox" v-model="assignForm.staff_ids" :value="staff.user_id" class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                  <div class="flex flex-col">
                    <span class="text-xs font-bold text-slate-800">{{ staff.name }}</span>
                    <span class="text-[10px] text-slate-400 font-medium">@{{ staff.username }}</span>
                  </div>
                </label>
                <div v-if="staffUsers.length === 0" class="text-xs text-center py-4 text-slate-400 italic">Tidak ada staf aktif ditemukan.</div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-2">
              <button type="button" @click="showAssignModal = false" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border-none cursor-pointer">
                Batal
              </button>
              <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs border-none shadow-md cursor-pointer">
                Simpan Penugasan
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
};
