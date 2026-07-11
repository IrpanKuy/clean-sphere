// =========================================================================
// VUE COMPONENT: ROOM & STATUS MANAGEMENT VIEW
// =========================================================================
const RoomManagementView = {
  props: ['rooms', 'users', 'statusHistory'],
  emits: ['update-status', 'add-room', 'delete-room', 'update-room'],
  data() {
    return {
      searchQuery: '',
      statusFilter: '',
      // Form states for the "Quick Change Status Panel"
      quickRoomNumber: '',
      quickStatus: 'VD',
      quickRemarks: '',
      // Modal state
      showAddModal: false,
      newRoomNumber: '',
      newRoomStatus: 'VD',
      newRoomRemarks: '',
      // Edit Modal state
      showEditModal: false,
      editingRoomNumber: '',
      editRoomNumberInput: '',
      editRoomStatus: 'VD',
      editRoomRemarks: '',
      // Static config for 10 fixed statuses
      statusConfig: {
        "VD": { name: "Vacant Dirty", color: "#EF4444", text: "#FFFFFF" },
        "VC": { name: "Vacant Clean", color: "#10B981", text: "#FFFFFF" },
        "OD": { name: "Occupied Dirty", color: "#F59E0B", text: "#FFFFFF" },
        "OC": { name: "Occupied Clean", color: "#3B82F6", text: "#FFFFFF" },
        "DND": { name: "Do Not Disturb", color: "#8B5CF6", text: "#FFFFFF" },
        "SR": { name: "Service Refused", color: "#EC4899", text: "#FFFFFF" },
        "NS": { name: "No Show", color: "#64748B", text: "#FFFFFF" },
        "SO": { name: "Sleep Out", color: "#14B8A6", text: "#FFFFFF" },
        "OOO": { name: "Out of Order", color: "#374151", text: "#FFFFFF" },
        "OOS": { name: "Out of Service", color: "#78350F", text: "#FFFFFF" }
      },
      // Categories builder list
      newRoomChecklist: [
        { name: "Cleaning", type: "checklist", itemsText: "Trash, Bed Making, Floor, Toilet" },
        { name: "Change", type: "inout", itemsText: "Bedding, Towel" },
        { name: "Refill", type: "in", itemsText: "Toiletries, Water Bottle" }
      ],
      editingRoomChecklist: []
    };
  },
  computed: {
    filteredRooms() {
      let list = this.rooms || [];
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(r => 
          String(r.room_number).toLowerCase().includes(q) || 
          (r.remarks && r.remarks.toLowerCase().includes(q))
        );
      }
      if (this.statusFilter) {
        list = list.filter(r => r.room_status === this.statusFilter);
      }
      return [...list].sort((a, b) => Number(a.room_number) - Number(b.room_number));
    }
  },
  methods: {
    getStatusColor(status) {
      const cfg = this.statusConfig[status];
      return cfg ? cfg.color : '#E2E8F0';
    },
    getStatusName(status) {
      const cfg = this.statusConfig[status];
      return cfg ? cfg.name : status;
    },
    getStaffName(id) {
      const u = this.users.find(x => x.user_id === id);
      return u ? u.name : id || '-';
    },
    selectRoomForQuickChange(room) {
      this.quickRoomNumber = room.room_number;
      this.quickStatus = room.room_status;
      this.quickRemarks = room.remarks || '';
    },
    submitQuickChange() {
      if (!this.quickRoomNumber) {
        Swal.fire("Peringatan", "Pilih kamar terlebih dahulu dari Grid atau dropdown.", "warning");
        return;
      }
      this.$emit('update-status', this.quickRoomNumber, this.quickStatus, this.quickRemarks);
    },
    openEditModal(room) {
      this.editingRoomNumber = room.room_number;
      this.editRoomNumberInput = room.room_number;
      this.editRoomStatus = room.room_status;
      this.editRoomRemarks = room.remarks || '';
      
      let list = [];
      if (room.checklist_config) {
        try {
          const parsed = JSON.parse(room.checklist_config);
          for (let cat in parsed) {
            const catVal = parsed[cat];
            if (catVal && Array.isArray(catVal.items)) {
              list.push({
                name: cat,
                type: catVal.type || 'checklist',
                itemsText: catVal.items.join(', ')
              });
            } else if (Array.isArray(catVal)) {
              list.push({
                name: cat,
                type: 'checklist',
                itemsText: catVal.join(', ')
              });
            }
          }
        } catch (e) {
          console.warn(e);
        }
      }
      if (list.length === 0) {
        list = [
          { name: "Cleaning", type: "checklist", itemsText: "Trash, Bed Making, Floor, Toilet" },
          { name: "Change", type: "inout", itemsText: "Bedding, Towel" },
          { name: "Refill", type: "in", itemsText: "Toiletries, Water Bottle" }
        ];
      }
      this.editingRoomChecklist = list;
      this.showEditModal = true;
    },
    submitEditRoom() {
      if (!this.editRoomNumberInput) {
        Swal.fire("Peringatan", "Nomor kamar tidak boleh kosong.", "warning");
        return;
      }
      const configObj = {};
      this.editingRoomChecklist.forEach(cat => {
        if (cat.name.trim()) {
          configObj[cat.name.trim()] = {
            type: cat.type,
            items: cat.itemsText.split(',').map(i => i.trim()).filter(Boolean)
          };
        }
      });
      const checklistConfig = JSON.stringify(configObj);
      this.$emit('update-room', this.editingRoomNumber, this.editRoomNumberInput, this.editRoomStatus, checklistConfig, this.editRoomRemarks);
      this.showEditModal = false;
    },
    confirmDeleteRoom(roomNumber) {
      Swal.fire({
        title: "Hapus Kamar?",
        text: `Apakah Anda yakin ingin menghapus Kamar ${roomNumber}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DC2626",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Ya, Hapus!",
        cancelButtonText: "Batal"
      }).then((result) => {
        if (result.isConfirmed) {
          this.$emit('delete-room', roomNumber);
          this.showEditModal = false;
        }
      });
    },
    submitAddRoom() {
      if (!this.newRoomNumber) {
        Swal.fire("Peringatan", "Nomor kamar wajib diisi.", "warning");
        return;
      }
      const configObj = {};
      this.newRoomChecklist.forEach(cat => {
        if (cat.name.trim()) {
          configObj[cat.name.trim()] = {
            type: cat.type,
            items: cat.itemsText.split(',').map(i => i.trim()).filter(Boolean)
          };
        }
      });
      const checklistConfig = JSON.stringify(configObj);
      this.$emit('add-room', this.newRoomNumber, this.newRoomStatus, checklistConfig, this.newRoomRemarks);
      this.newRoomNumber = '';
      this.newRoomStatus = 'VD';
      this.newRoomRemarks = '';
      this.newRoomChecklist = [
        { name: "Cleaning", type: "checklist", itemsText: "Trash, Bed Making, Floor, Toilet" },
        { name: "Change", type: "inout", itemsText: "Bedding, Towel" },
        { name: "Refill", type: "in", itemsText: "Toiletries, Water Bottle" }
      ];
      this.showAddModal = false;
    }
  },
  template: `
    <div class="flex flex-col gap-6 w-full max-w-[1200px] mx-auto">
      <!-- Room Status Control Panel (Bagan Input Atas) -->
      <div class="bg-white p-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col gap-5 w-full">
        <h4 class="text-[16px] font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
          <svg class="w-5 h-5 text-amber-500 mr-1.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Panel Perubahan Cepat Status Kamar
        </h4>
        <form @submit.prevent="submitQuickChange" class="flex flex-col md:flex-row md:items-end gap-5">
          <div class="flex flex-col sm:flex-row gap-5 flex-1">
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Nomor Kamar</label>
              <select v-model="quickRoomNumber" class="w-full sm:w-[180px] h-[42px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
                <option value="">-- Pilih Kamar --</option>
                <option v-for="r in rooms" :key="r.room_number" :value="r.room_number">
                  Kamar {{ r.room_number }} ({{ r.room_status }})
                </option>
              </select>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Ganti Status Kamar</label>
              <select v-model="quickStatus" class="w-full sm:w-[200px] h-[42px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
                <option v-for="(cfg, code) in statusConfig" :key="code" :value="code">
                  {{ code }} - {{ cfg.name }}
                </option>
              </select>
            </div>
            
            <div class="flex flex-col gap-2 flex-1">
              <label class="text-[13px] font-bold text-slate-700">Keterangan / Remarks</label>
              <input type="text" v-model="quickRemarks" placeholder="Masukkan keterangan (cth: AC Rusak, Perbaikan Pipa, DND)" class="w-full h-[42px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
            </div>
          </div>
          <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_15px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 transition-all outline-none shrink-0 inline-flex items-center justify-center">
            <svg class="w-4 h-4 mr-1 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Simpan Status
          </button>
        </form>
      </div>

      <!-- Controls: Search, Filter, and Add Button -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div class="relative w-full sm:w-[280px]">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari kamar atau keterangan..." class="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
          </div>
          <select v-model="statusFilter" class="w-full sm:w-[180px] h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            <option value="">Semua Status</option>
            <option v-for="(cfg, code) in statusConfig" :key="code" :value="code">
              {{ code }} - {{ cfg.name }}
            </option>
          </select>
        </div>
        <button class="w-full md:w-auto h-[42px] px-5 bg-white text-blue-600 border border-blue-100 font-bold text-[13px] rounded-xl shadow-sm hover:bg-blue-50 hover:border-blue-200 hover:-translate-y-0.5 transition-all outline-none inline-flex items-center justify-center" @click="showAddModal = true">
          <svg class="w-4 h-4 text-blue-600 mr-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Registrasi Kamar Baru
        </button>
      </div>

      <!-- Room Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <div 
          v-for="room in filteredRooms" 
          :key="room.room_number" 
          class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col overflow-hidden transition-transform hover:-translate-y-1 cursor-pointer"
          :style="{ borderLeft: '5px solid ' + getStatusColor(room.room_status) }"
          @click="selectRoomForQuickChange(room)"
        >
          <div class="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <span class="text-base font-extrabold text-slate-900 tracking-tight">Kamar {{ room.room_number }}</span>
            <span 
              class="px-2.5 py-1 rounded-md text-[11px] font-bold text-white tracking-wide uppercase shadow-sm" 
              :style="{ backgroundColor: getStatusColor(room.room_status) }"
            >
              {{ room.room_status }}
            </span>
          </div>
          
          <div class="flex flex-col gap-3 p-5 flex-1">
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Keterangan:</span>
              <span class="text-[13.5px] font-semibold text-slate-700 truncate" :title="room.remarks">{{ room.remarks || '-' }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dibersihkan:</span>
              <span class="text-[13.5px] font-semibold text-slate-700 tracking-tight">{{ room.last_cleaned_at ? new Date(room.last_cleaned_at).toLocaleDateString('id-ID') : '-' }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Oleh Staf:</span>
              <span class="text-[13.5px] font-semibold text-slate-700">{{ getStaffName(room.last_cleaned_by) }}</span>
            </div>
          </div>

          <div class="p-4 pt-0 border-t border-slate-100 bg-slate-50/30 mt-auto" @click.stop>
            <button class="w-full h-9 mt-4 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center" @click="openEditModal(room)">
              <svg class="w-3.5 h-3.5 text-blue-600 mr-1" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              Edit Detail / Hapus
            </button>
          </div>
        </div>

        <div v-if="filteredRooms.length === 0" class="col-span-full py-16 text-center text-slate-400 text-sm font-medium bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
          🎈 Tidak ada kamar yang ditemukan.
        </div>
      </div>

      <!-- Modal: Tambah Kamar Baru -->
      <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showAddModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">Tambah Kamar Baru</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="showAddModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitAddRoom" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Nomor Kamar</label>
              <input type="text" v-model="newRoomNumber" placeholder="Masukkan nomor kamar (cth: 302)" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Status Awal</label>
              <select v-model="newRoomStatus" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option v-for="(cfg, code) in statusConfig" :key="code" :value="code">
                  {{ code }} - {{ cfg.name }}
                </option>
              </select>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Konfigurasi Checklist Beranak (Dinamis)</label>
              <div class="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div v-for="(cat, idx) in newRoomChecklist" :key="idx" class="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input type="text" v-model="cat.name" placeholder="Kategori (cth: Cleaning)" class="w-full sm:w-[120px] h-[38px] px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors" required>
                  <select v-model="cat.type" class="w-full sm:w-[150px] h-[38px] px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors">
                    <option value="checklist">Centang saja (Checklist)</option>
                    <option value="in">Refill (In)</option>
                    <option value="inout">Linen (In & Out)</option>
                  </select>
                  <input type="text" v-model="cat.itemsText" placeholder="Item detail, pisahkan koma" class="flex-1 w-full h-[38px] px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors">
                  <button type="button" @click="newRoomChecklist.splice(idx, 1)" class="w-[38px] h-[38px] shrink-0 bg-red-50 text-red-500 rounded-lg font-bold text-lg hover:bg-red-100 transition-colors flex items-center justify-center">×</button>
                </div>
                <button type="button" @click="newRoomChecklist.push({ name: '', type: 'checklist', itemsText: '' })" class="h-[38px] w-full border border-dashed border-slate-300 rounded-lg text-[13px] font-bold text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mt-2 inline-flex items-center justify-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Tambah Kategori Baru
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Catatan (Remarks)</label>
              <input type="text" v-model="newRoomRemarks" placeholder="Masukkan catatan awal" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
              <button type="button" class="h-[42px] px-5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors" @click="showAddModal = false">Batal</button>
              <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all">Simpan Kamar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Edit Detail / Hapus Kamar -->
      <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showEditModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">Edit Kamar {{ editingRoomNumber }}</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="showEditModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitEditRoom" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Nomor Kamar</label>
              <input type="text" v-model="editRoomNumberInput" placeholder="Masukkan nomor kamar" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Status Kamar</label>
              <select v-model="editRoomStatus" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option v-for="(cfg, code) in statusConfig" :key="code" :value="code">
                  {{ code }} - {{ cfg.name }}
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Konfigurasi Checklist Beranak (Dinamis)</label>
              <div class="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div v-for="(cat, idx) in editingRoomChecklist" :key="idx" class="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input type="text" v-model="cat.name" placeholder="Kategori" class="w-full sm:w-[120px] h-[38px] px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors" required>
                  <select v-model="cat.type" class="w-full sm:w-[150px] h-[38px] px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors">
                    <option value="checklist">Centang saja (Checklist)</option>
                    <option value="in">Refill (In)</option>
                    <option value="inout">Linen (In & Out)</option>
                  </select>
                  <input type="text" v-model="cat.itemsText" placeholder="Item detail, pisahkan koma" class="flex-1 w-full h-[38px] px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors">
                  <button type="button" @click="editingRoomChecklist.splice(idx, 1)" class="w-[38px] h-[38px] shrink-0 bg-red-50 text-red-500 rounded-lg font-bold text-lg hover:bg-red-100 transition-colors flex items-center justify-center">×</button>
                </div>
                <button type="button" @click="editingRoomChecklist.push({ name: '', type: 'checklist', itemsText: '' })" class="h-[38px] w-full border border-dashed border-slate-300 rounded-lg text-[13px] font-bold text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mt-2 inline-flex items-center justify-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Tambah Kategori Baru
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Catatan (Remarks)</label>
              <input type="text" v-model="editRoomRemarks" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>

            <div class="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
              <button type="button" class="h-[42px] px-4 bg-red-50 text-red-600 font-bold text-[13px] rounded-xl hover:bg-red-100 transition-colors inline-flex items-center gap-1.5" @click="confirmDeleteRoom(editingRoomNumber)">
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Hapus Kamar
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
