// =========================================================================
// VUE COMPONENT: ROOM INVENTORY VIEW (100% IMMEDIATE CRUD TO GOOGLE SHEETS)
// =========================================================================
const RoomInventoryView = {
  props: ['rooms', 'inventory'],
  emits: ['update-room-inventory'],
  data() {
    return {
      selectedRoomNumber: '',
      localInventoryItems: [],
      // For adding new item
      newItemSource: 'global', // 'global' or 'custom'
      selectedGlobalItemId: '',
      customItemName: '',
      newItemQty: 2,
      newItemMinQty: 1
    };
  },
  watch: {
    selectedRoomNumber(newVal) {
      this.loadRoomInventory();
    },
    rooms: {
      deep: true,
      handler() {
        this.loadRoomInventory();
      }
    }
  },
  computed: {
    selectedRoom() {
      if (!this.selectedRoomNumber) return null;
      return this.rooms.find(r => String(r.room_number) === String(this.selectedRoomNumber));
    },
    totalItemsCount() {
      return this.localInventoryItems.length;
    },
    thinStockCount() {
      return this.localInventoryItems.filter(item => Number(item.qty) < Number(item.min_qty)).length;
    },
    inventoryStatus() {
      if (this.totalItemsCount === 0) return 'Belum Diatur';
      return this.thinStockCount > 0 ? 'Butuh Tambahan' : 'Aman';
    }
  },
  methods: {
    loadRoomInventory() {
      if (!this.selectedRoomNumber) {
        this.localInventoryItems = [];
        return;
      }
      const room = this.rooms.find(r => String(r.room_number) === String(this.selectedRoomNumber));
      if (room && room.room_inventory) {
        try {
          const parsed = JSON.parse(room.room_inventory);
          this.localInventoryItems = Array.isArray(parsed) ? JSON.parse(JSON.stringify(parsed)) : [];
        } catch (e) {
          console.warn("Error parsing room inventory:", e);
          this.localInventoryItems = [];
        }
      } else {
        this.localInventoryItems = [];
      }
    },
    incrementQty(index) {
      this.localInventoryItems[index].qty = Number(this.localInventoryItems[index].qty) + 1;
      this.saveInventory();
    },
    decrementQty(index) {
      if (Number(this.localInventoryItems[index].qty) > 0) {
        this.localInventoryItems[index].qty = Number(this.localInventoryItems[index].qty) - 1;
        this.saveInventory();
      }
    },
    deleteItem(index) {
      Swal.fire({
        title: "Hapus Barang?",
        text: `Hapus "${this.localInventoryItems[index].name}" dari inventaris kamar ini?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#EF4444",
        cancelButtonColor: "#64748B",
        confirmButtonText: "Ya, Hapus"
      }).then((result) => {
        if (result.isConfirmed) {
          this.localInventoryItems.splice(index, 1);
          this.saveInventory();
        }
      });
    },
    addNewItem() {
      let name = '';
      if (this.newItemSource === 'global') {
        if (!this.selectedGlobalItemId) {
          Swal.fire("Peringatan", "Silakan pilih barang dari daftar inventaris.", "warning");
          return;
        }
        const globalItem = this.inventory.find(i => i.item_id === this.selectedGlobalItemId);
        name = globalItem ? globalItem.item_name : '';
      } else {
        if (!this.customItemName.trim()) {
          Swal.fire("Peringatan", "Silakan masukkan nama barang kustom.", "warning");
          return;
        }
        name = this.customItemName.trim();
      }

      // Check if item name already exists in local list
      const exists = this.localInventoryItems.some(i => i.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        Swal.fire("Peringatan", `Barang "${name}" sudah ada dalam daftar kamar ini.`, "warning");
        return;
      }

      this.localInventoryItems.push({
        name: name,
        qty: Number(this.newItemQty),
        min_qty: Number(this.newItemMinQty)
      });

      this.saveInventory();

      // Reset form fields
      this.selectedGlobalItemId = '';
      this.customItemName = '';
      this.newItemQty = 2;
      this.newItemMinQty = 1;
    },
    saveInventory() {
      if (!this.selectedRoomNumber) return;
      // Convert to clean list
      const cleanList = this.localInventoryItems.map(item => ({
        name: item.name,
        qty: Number(item.qty),
        min_qty: Number(item.min_qty)
      }));
      // Direct emit to parent to execute App Script POST request
      this.$emit('update-room-inventory', this.selectedRoomNumber, cleanList);
    }
  },
  template: `
    <div class="flex flex-col gap-6 p-6 max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
      
      <!-- Selection & Room Header Card -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <h2 class="text-xl font-extrabold text-slate-800 tracking-tight">Manajemen Stok Inventaris Kamar</h2>
          <p class="text-xs font-semibold text-slate-500">Kelola kuantitas standar barang di masing-masing kamar.</p>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-[13px] font-bold text-slate-700 whitespace-nowrap">Pilih Kamar:</label>
          <select v-model="selectedRoomNumber" class="h-[40px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all min-w-[150px]">
            <option value="">-- Pilih Kamar --</option>
            <option v-for="r in rooms" :key="r.room_number" :value="r.room_number">
              Kamar {{ r.room_number }} ({{ r.room_status }})
            </option>
          </select>
        </div>
      </div>

      <!-- No Room Selected Placeholder -->
      <div v-if="!selectedRoomNumber" class="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
        <div class="text-[52px] mb-4">🛏️</div>
        <h3 class="text-[16px] font-bold text-slate-700">Belum Ada Kamar yang Dipilih</h3>
        <p class="text-xs font-semibold text-slate-400 mt-1 max-w-[320px] text-center leading-relaxed">Pilih salah satu nomor kamar di atas untuk mulai memantau dan mengelola persediaan stok khusus di kamar tersebut.</p>
      </div>

      <!-- Room Inventory Management Section -->
      <template v-else>
        <!-- Top Summary Indicators -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <!-- Total Items Card -->
          <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold">
              📦
            </div>
            <div class="flex flex-col">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Item Standar</span>
              <span class="text-2xl font-black text-slate-800 mt-0.5">{{ totalItemsCount }} Jenis</span>
            </div>
          </div>

          <!-- Thin Stock Alert Card -->
          <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
            <div :class="['w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold', thinStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600']">
              ⚠️
            </div>
            <div class="flex flex-col">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stok Menipis</span>
              <span :class="['text-2xl font-black mt-0.5', thinStockCount > 0 ? 'text-red-600' : 'text-green-600']">
                {{ thinStockCount }} Barang
              </span>
            </div>
          </div>

          <!-- Inventory Status Card -->
          <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
            <div :class="['w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold', inventoryStatus === 'Aman' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600']">
              💡
            </div>
            <div class="flex flex-col">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kecukupan Stok</span>
              <span :class="['text-2xl font-black mt-0.5', inventoryStatus === 'Aman' ? 'text-green-600' : 'text-amber-600']">
                {{ inventoryStatus }}
              </span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Items Table (Left 2 Columns) -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2 flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-slate-50 pb-4">
              <h3 class="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                <span>Daftar Stok Saat Ini</span>
                <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full font-bold">Kamar {{ selectedRoomNumber }}</span>
              </h3>
              <span class="text-xs font-semibold text-slate-400 italic">Perubahan akan langsung disimpan ke spreadsheet.</span>
            </div>

            <!-- Empty Items State -->
            <div v-if="localInventoryItems.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-400">
              <span class="text-4xl mb-2">📥</span>
              <p class="text-xs font-bold text-slate-500">Stok inventaris belum ditentukan untuk kamar ini.</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Tambahkan beberapa barang melalui form di sebelah kanan.</p>
            </div>

            <!-- Table of local room inventory -->
            <div v-else class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-slate-100">
                    <th class="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[50px] text-center">No</th>
                    <th class="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nama Barang</th>
                    <th class="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[160px]">Stok Saat Ini</th>
                    <th class="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[120px]">Min. Stok</th>
                    <th class="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[100px]">Status</th>
                    <th class="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[70px]">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  <tr v-for="(item, idx) in localInventoryItems" :key="idx" class="hover:bg-slate-50/50 transition-colors group">
                    <!-- Index -->
                    <td class="py-3 text-[12.5px] font-semibold text-slate-400 text-center">{{ idx + 1 }}</td>
                    
                    <!-- Item Name -->
                    <td class="py-3 text-[13px] font-bold text-slate-700">{{ item.name }}</td>
                    
                    <!-- Qty Control Buttons -->
                    <td class="py-3">
                      <div class="flex items-center justify-center gap-1.5">
                        <button type="button" @click="decrementQty(idx)" class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-none outline-none">-</button>
                        <input type="number" v-model.number="item.qty" min="0" @change="saveInventory" class="w-12 h-7 bg-slate-50 border border-slate-200 rounded-lg text-[12.5px] font-bold text-slate-700 text-center outline-none focus:border-blue-500">
                        <button type="button" @click="incrementQty(idx)" class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-none outline-none">+</button>
                      </div>
                    </td>
                    
                    <!-- Min Qty input -->
                    <td class="py-3 text-center">
                      <input type="number" v-model.number="item.min_qty" min="0" @change="saveInventory" class="w-16 h-7 bg-slate-50 border border-slate-200 rounded-lg text-[12.5px] font-bold text-slate-700 text-center outline-none focus:border-blue-500">
                    </td>
                    
                    <!-- Status Badge -->
                    <td class="py-3 text-center">
                      <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold inline-block', 
                        Number(item.qty) < Number(item.min_qty) ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200']">
                        {{ Number(item.qty) < Number(item.min_qty) ? 'Menipis' : 'Aman' }}
                      </span>
                    </td>
                    
                    <!-- Delete Action -->
                    <td class="py-3 text-center">
                      <button @click="deleteItem(idx)" class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors flex items-center justify-center mx-auto cursor-pointer border-none outline-none">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Add Item Form (Right 1 Column) -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <h3 class="text-[15px] font-bold text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
              <span>Tambah Item Baru</span>
            </h3>
            
            <!-- Source Selector tabs -->
            <div class="flex bg-slate-50 p-1 rounded-xl">
              <button type="button" @click="newItemSource = 'global'" :class="['flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border-none outline-none cursor-pointer', newItemSource === 'global' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700']">
                Pilih Inventaris
              </button>
              <button type="button" @click="newItemSource = 'custom'" :class="['flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border-none outline-none cursor-pointer', newItemSource === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700']">
                Kustom Mandiri
              </button>
            </div>

            <form @submit.prevent="addNewItem" class="flex flex-col gap-4">
              <!-- Global Dropdown selection -->
              <div class="flex flex-col gap-1.5" v-if="newItemSource === 'global'">
                <label class="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">Pilih Barang Global</label>
                <select v-model="selectedGlobalItemId" class="w-full h-[40px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors">
                  <option value="">-- Pilih Barang --</option>
                  <option v-for="item in inventory" :key="item.item_id" :value="item.item_id">
                    {{ item.item_name }} (Stok Gudang: {{ item.stock_current }})
                  </option>
                </select>
              </div>

              <!-- Custom Text field selection -->
              <div class="flex flex-col gap-1.5" v-else>
                <label class="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">Nama Barang Baru</label>
                <input type="text" v-model="customItemName" placeholder="Masukkan nama barang baru" class="w-full h-[40px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors">
              </div>

              <!-- Initial Qty Input -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">Stok Awal Kamar</label>
                <input type="number" v-model.number="newItemQty" min="0" class="w-full h-[40px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors">
              </div>

              <!-- Minimum Qty Input -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">Stok Minimum (Alert)</label>
                <input type="number" v-model.number="newItemMinQty" min="0" class="w-full h-[40px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors">
              </div>

              <button type="submit" class="h-[40px] w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[12.5px] rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer border-none outline-none">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Tambahkan Item
              </button>
            </form>
          </div>

        </div>
      </template>

    </div>
  `
};
