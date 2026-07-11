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
    <div class="room-mgmt-wrapper">
      <!-- Room Status Control Panel (Bagan Input Atas) -->
      <div class="panel-card ctrl-panel">
        <h4 class="panel-section-title flex items-center gap-1.5" style="display: flex; align-items: center;">
          <svg class="w-5 h-5 text-amber-500 mr-1.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="width: 18px; height: 18px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Panel Perubahan Cepat Status Kamar
        </h4>
        <form @submit.prevent="submitQuickChange" class="quick-form-layout">
          <div class="form-group-row">
            <div class="form-field">
              <label>Nomor Kamar</label>
              <select v-model="quickRoomNumber" class="form-select">
                <option value="">-- Pilih Kamar --</option>
                <option v-for="r in rooms" :key="r.room_number" :value="r.room_number">
                  Kamar {{ r.room_number }} ({{ r.room_status }})
                </option>
              </select>
            </div>
            
            <div class="form-field">
              <label>Ganti Status Kamar</label>
              <select v-model="quickStatus" class="form-select">
                <option v-for="(cfg, code) in statusConfig" :key="code" :value="code">
                  {{ code }} - {{ cfg.name }}
                </option>
              </select>
            </div>
            
            <div class="form-field remarks-field">
              <label>Keterangan / Remarks</label>
              <input type="text" v-model="quickRemarks" placeholder="Masukkan keterangan (cth: AC Rusak, Perbaikan Pipa, DND)" class="form-input">
            </div>
          </div>
          <button type="submit" class="btn-save-status flex items-center gap-1.5" style="display: inline-flex; align-items: center;">
            <svg class="w-4 h-4 mr-1 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width:16px; height:16px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Simpan Status
          </button>
        </form>
      </div>

      <!-- Controls: Search, Filter, and Add Button -->
      <div class="grid-controls-row">
        <div class="controls-left">
          <div class="search-box-wrapper">
            <span class="search-glass">
              <svg style="width: 16px; height: 16px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari kamar atau keterangan..." class="ctrl-search-input">
          </div>
          <select v-model="statusFilter" class="ctrl-select-filter">
            <option value="">Semua Status</option>
            <option v-for="(cfg, code) in statusConfig" :key="code" :value="code">
              {{ code }} - {{ cfg.name }}
            </option>
          </select>
        </div>
        <button class="btn-add-room flex items-center gap-1.5" @click="showAddModal = true" style="display: inline-flex; align-items: center;">
          <svg class="w-4 h-4 text-primary mr-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Registrasi Kamar Baru
        </button>
      </div>

      <!-- Room Cards Grid -->
      <div class="rooms-grid-layout">
        <div 
          v-for="room in filteredRooms" 
          :key="room.room_number" 
          class="room-card-v2"
          :style="{ borderLeft: '5px solid ' + getStatusColor(room.room_status) }"
          @click="selectRoomForQuickChange(room)"
        >
          <div class="room-card-header">
            <span class="room-card-num">Kamar {{ room.room_number }}</span>
            <span 
              class="status-badge-v2" 
              :style="{ backgroundColor: getStatusColor(room.room_status) }"
            >
              {{ room.room_status }}
            </span>
          </div>
          
          <div class="room-card-body">
            <div class="info-row">
              <span class="info-label">Keterangan:</span>
              <span class="info-val remarks-text" :title="room.remarks">{{ room.remarks || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Dibersihkan:</span>
              <span class="info-val font-compact">{{ room.last_cleaned_at ? new Date(room.last_cleaned_at).toLocaleDateString('id-ID') : '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Oleh Staf:</span>
              <span class="info-val">{{ getStaffName(room.last_cleaned_by) }}</span>
            </div>
          </div>

          <div class="room-card-actions" @click.stop>
            <button class="btn-card-edit flex items-center gap-1" @click="openEditModal(room)" style="display: inline-flex; align-items: center; justify-content: center; width: 100%;">
              <svg class="w-3.5 h-3.5 text-blue-600 mr-1" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              Edit Detail / Hapus
            </button>
          </div>
        </div>

        <div v-if="filteredRooms.length === 0" class="no-rooms-placeholder">
          🎈 Tidak ada kamar yang ditemukan.
        </div>
      </div>

      <!-- Modal: Tambah Kamar Baru -->
      <div class="modal-overlay-v2" v-if="showAddModal">
        <div class="modal-box-v2" style="max-width: 600px;">
          <div class="modal-header-v2">
            <h3>Tambah Kamar Baru</h3>
            <button class="btn-close-modal" @click="showAddModal = false">
              <svg style="width: 20px; height: 20px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitAddRoom" class="modal-body-v2">
            <div class="modal-field">
              <label>Nomor Kamar</label>
              <input type="text" v-model="newRoomNumber" placeholder="Masukkan nomor kamar (cth: 302)" required class="form-input">
            </div>
            <div class="modal-field">
              <label>Status Awal</label>
              <select v-model="newRoomStatus" class="form-select">
                <option v-for="(cfg, code) in statusConfig" :key="code" :value="code">
                  {{ code }} - {{ cfg.name }}
                </option>
              </select>
            </div>
            
            <div class="modal-field">
              <label>Konfigurasi Checklist Beranak (Dinamis)</label>
              <div class="checklist-builder-box">
                <div v-for="(cat, idx) in newRoomChecklist" :key="idx" class="builder-row">
                  <input type="text" v-model="cat.name" placeholder="Kategori (cth: Cleaning)" class="builder-input-name" required>
                  <select v-model="cat.type" class="builder-select-type">
                    <option value="checklist">Centang saja (Checklist)</option>
                    <option value="in">Refill (In)</option>
                    <option value="inout">Linen (In & Out)</option>
                  </select>
                  <input type="text" v-model="cat.itemsText" placeholder="Item detail, pisahkan koma" class="builder-input-items">
                  <button type="button" @click="newRoomChecklist.splice(idx, 1)" class="btn-remove-builder">×</button>
                </div>
                <button type="button" @click="newRoomChecklist.push({ name: '', type: 'checklist', itemsText: '' })" class="btn-add-builder-row flex items-center justify-center gap-1">
                  <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Tambah Kategori Baru
                </button>
              </div>
            </div>

            <div class="modal-field">
              <label>Catatan (Remarks)</label>
              <input type="text" v-model="newRoomRemarks" placeholder="Masukkan catatan awal" class="form-input">
            </div>
            <div class="modal-actions-v2">
              <button type="button" class="btn-cancel" @click="showAddModal = false">Batal</button>
              <button type="submit" class="btn-confirm-add">Simpan Kamar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Edit Detail / Hapus Kamar -->
      <div class="modal-overlay-v2" v-if="showEditModal">
        <div class="modal-box-v2" style="max-width: 600px;">
          <div class="modal-header-v2">
            <h3>Edit Kamar {{ editingRoomNumber }}</h3>
            <button class="btn-close-modal" @click="showEditModal = false">
              <svg style="width: 20px; height: 20px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitEditRoom" class="modal-body-v2">
            <div class="modal-field">
              <label>Nomor Kamar</label>
              <input type="text" v-model="editRoomNumberInput" placeholder="Masukkan nomor kamar" required class="form-input">
            </div>
            <div class="modal-field">
              <label>Status Kamar</label>
              <select v-model="editRoomStatus" class="form-select">
                <option v-for="(cfg, code) in statusConfig" :key="code" :value="code">
                  {{ code }} - {{ cfg.name }}
                </option>
              </select>
            </div>

            <div class="modal-field">
              <label>Konfigurasi Checklist Beranak (Dinamis)</label>
              <div class="checklist-builder-box">
                <div v-for="(cat, idx) in editingRoomChecklist" :key="idx" class="builder-row">
                  <input type="text" v-model="cat.name" placeholder="Kategori" class="builder-input-name" required>
                  <select v-model="cat.type" class="builder-select-type">
                    <option value="checklist">Centang saja (Checklist)</option>
                    <option value="in">Refill (In)</option>
                    <option value="inout">Linen (In & Out)</option>
                  </select>
                  <input type="text" v-model="cat.itemsText" placeholder="Item detail, pisahkan koma" class="builder-input-items">
                  <button type="button" @click="editingRoomChecklist.splice(idx, 1)" class="btn-remove-builder">×</button>
                </div>
                <button type="button" @click="editingRoomChecklist.push({ name: '', type: 'checklist', itemsText: '' })" class="btn-add-builder-row flex items-center justify-center gap-1">
                  <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width:14px; height:14px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Tambah Kategori Baru
                </button>
              </div>
            </div>

            <div class="modal-field">
              <label>Catatan (Remarks)</label>
              <input type="text" v-model="editRoomRemarks" class="form-input">
            </div>

            <div class="modal-actions-v2 flex-between">
              <button type="button" class="btn-delete flex items-center gap-1.5" @click="confirmDeleteRoom(editingRoomNumber)">
                <svg class="w-4 h-4 mr-1 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Hapus Kamar
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
