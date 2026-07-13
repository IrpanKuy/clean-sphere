// =========================================================================
// VUE COMPONENT: INVENTORY MANAGEMENT VIEW (REVISED CONTEXT-AWARE DYNAMIC CRUD)
// =========================================================================
const InventoryManagementView = {
  props: ['subTab', 'inventory', 'inventoryTransactions', 'categories', 'users', 'rooms'],
  emits: [
    'add-item', 'update-item', 'delete-item', 
    'record-tx', 'add-category', 'update-category'
  ],
  data() {
    return {
      searchQuery: '',
      
      // Filter Master Barang
      categoryFilter: '',
      roomFilter: '', 
      
      // Filter Mutasi Stok
      logCategoryFilter: '',
      logRoomFilter: '',
      logPeriodFilter: 'all',
      logDateFilter: '',
      logMonthFilter: '',
      
      // Form Mutasi Stok
      directTx: {
        item_id: '',
        type: 'in',
        quantity: 1,
        locationRoom: 'Global', 
        remarks: ''
      },
      // Field edit detail_spesifik saat mutasi stok
      txDetailFields: [],

      // Modal barang
      showItemModal: false,
      isEditingItem: false,
      editingItem: {
        item_id: '',
        item_code: '',
        category_id: '',
        item_name: '',
        location_room: 'Global',
        stock_initial: 0,
        min_stock: 5,
        remarks: ''
      },
      // Field atribut dinamis (sepenuhnya mengikuti kategori default)
      defaultAttrFields: [], // [{name: 'Brand', value: ''}]

      // Modal kategori
      showCatModal: false,
      isEditingCat: false,
      editingCat: {
        category_id: '',
        category_name: '',
        description: '',
        default_attributes: [],
        is_active: true
      },
      newAttrTag: '',
      
      // Filter & options untuk Inventaris Bulanan
      selectedYear: new Date().getFullYear(),
      monthlyCategoryFilter: '',
      monthlyRoomFilter: '',
      yearOptions: [2024, 2025, 2026, 2027, 2028]
    };
  },
  computed: {
    sortedRooms() {
      if (!this.rooms) return [];
      return [...this.rooms].sort((a, b) => String(a.room_number).localeCompare(String(b.room_number), undefined, {numeric: true}));
    },
    
    // ---- FILTER DATA MASTER BARANG ----
    filteredItems() {
      let list = this.inventory ? [...this.inventory] : [];
      
      if (this.categoryFilter) {
        list = list.filter(i => i.category_id === this.categoryFilter);
      }
      
      if (this.roomFilter) {
        list = list.filter(i => String(i.location_room).toLowerCase() === String(this.roomFilter).toLowerCase());
      }
      
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(i => 
          String(i.item_name).toLowerCase().includes(q) ||
          String(i.item_code).toLowerCase().includes(q) ||
          String(i.remarks).toLowerCase().includes(q) ||
          String(i.detail_spesifik).toLowerCase().includes(q) ||
          String(i.location_room).toLowerCase().includes(q)
        );
      }
      return list;
    },

    // Atribut dinamis untuk kolom Master Barang
    dynamicTableColumns() {
      if (!this.categoryFilter) return [];
      return this.getCategoryDefaultAttrs(this.categoryFilter);
    },
    
    // Atribut dinamis untuk Inventaris Bulanan
    monthlyDynamicColumns() {
      if (!this.monthlyCategoryFilter) return [];
      return this.getCategoryDefaultAttrs(this.monthlyCategoryFilter);
    },

    // Olah data bulanan
    monthlyData() {
      const year = parseInt(this.selectedYear, 10) || new Date().getFullYear();
      const monthsList = [
        { name: "JANUARY", number: 0 },
        { name: "FEBRUARY", number: 1 },
        { name: "MARCH", number: 2 },
        { name: "APRIL", number: 3 },
        { name: "MAY", number: 4 },
        { name: "JUNE", number: 5 },
        { name: "JULY", number: 6 },
        { name: "AUGUST", number: 7 },
        { name: "SEPTEMBER", number: 8 },
        { name: "OCTOBER", number: 9 },
        { name: "NOVEMBER", number: 10 },
        { name: "DECEMBER", number: 11 }
      ];

      const data = [];
      let itemsFiltered = this.inventory ? [...this.inventory] : [];
      if (this.monthlyCategoryFilter) {
        itemsFiltered = itemsFiltered.filter(i => i.category_id === this.monthlyCategoryFilter);
      }
      if (this.monthlyRoomFilter) {
        itemsFiltered = itemsFiltered.filter(i => String(i.location_room).toLowerCase() === String(this.monthlyRoomFilter).toLowerCase());
      }

      monthsList.forEach(m => {
        // Last date of month in local Jakarta timezone
        const lastDate = new Date(year, m.number + 1, 0, 23, 59, 59, 999);
        const itemRows = itemsFiltered.map(item => {
          let stock = parseInt(item.stock_initial, 10) || 0;
          const txs = this.inventoryTransactions ? this.inventoryTransactions.filter(t => t.item_id === item.item_id) : [];
          txs.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate <= lastDate) {
              if (t.type === 'in') {
                stock += (parseInt(t.quantity, 10) || 0);
              } else if (t.type === 'out') {
                stock -= (parseInt(t.quantity, 10) || 0);
              }
            }
          });

          return {
            item_id: item.item_id,
            item_code: item.item_code,
            item_name: item.item_name,
            category_id: item.category_id,
            min_stock: item.min_stock,
            current_stock: stock,
            remarks: item.remarks,
            detail_spesifik: item.detail_spesifik
          };
        });

        data.push({
          monthName: m.name,
          monthNumber: m.number,
          items: itemRows
        });
      });
      return data;
    },

    // ---- FILTER DATA LOG MUTASI STOK ----
    filteredTransactions() {
      let list = this.inventoryTransactions ? [...this.inventoryTransactions] : [];
      
      // Filter berdasarkan kategori barang terkait
      if (this.logCategoryFilter) {
        list = list.filter(t => {
          const item = this.getItemById(t.item_id);
          return item && item.category_id === this.logCategoryFilter;
        });
      }

      // Filter berdasarkan kamar
      if (this.logRoomFilter) {
        list = list.filter(t => String(t.location_room).toLowerCase() === String(this.logRoomFilter).toLowerCase());
      }

      // Filter rentang waktu
      const now = new Date();
      if (this.logPeriodFilter === 'day') {
        const todayStr = now.toISOString().substring(0, 10);
        list = list.filter(t => t.date === todayStr);
      } else if (this.logPeriodFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        list = list.filter(t => new Date(t.date) >= oneWeekAgo);
      } else if (this.logPeriodFilter === 'month') {
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        list = list.filter(t => {
          const d = new Date(t.date);
          return d.getFullYear() === curYear && d.getMonth() === curMonth;
        });
      }
      
      if (this.logDateFilter) {
        list = list.filter(t => t.date === this.logDateFilter);
      }
      if (this.logMonthFilter) {
        list = list.filter(t => String(t.date).substring(0, 7) === this.logMonthFilter);
      }

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(t => {
          const item = this.getItemById(t.item_id);
          const staff = this.getStaffName(t.user_id);
          return (
            (item && String(item.item_name).toLowerCase().includes(q)) ||
            (item && String(item.item_code).toLowerCase().includes(q)) ||
            String(t.remarks).toLowerCase().includes(q) ||
            String(t.location_room).toLowerCase().includes(q) ||
            staff.toLowerCase().includes(q)
          );
        });
      }
      
      list.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
      return list;
    },

    // Atribut dinamis untuk kolom Log Mutasi
    logDynamicTableColumns() {
      if (!this.logCategoryFilter) return [];
      return this.getCategoryDefaultAttrs(this.logCategoryFilter);
    }
  },
  watch: {
    'directTx.item_id'(newVal) {
      this.loadTxDetailFields(newVal);
    }
  },
  methods: {
    getItemById(id) {
      return this.inventory.find(i => i.item_id === id);
    },
    getCategoryName(catId) {
      const cat = this.categories.find(c => c.category_id === catId);
      return cat ? cat.category_name : catId;
    },
    getStaffName(userId) {
      const u = this.users.find(x => x.user_id === userId);
      return u ? u.name : userId || 'Sistem';
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
    safeParseJSON(str, fallback = {}) {
      if (!str || str === '' || str === '""') return fallback;
      try {
        return JSON.parse(str);
      } catch(e) {
        return fallback;
      }
    },
    getDetailValue(detailStr, key) {
      const obj = this.safeParseJSON(detailStr, {});
      return obj[key] !== undefined ? obj[key] : '-';
    },
    getDetailEntries(detailStr) {
      const obj = this.safeParseJSON(detailStr, {});
      return Object.entries(obj).map(([key, value]) => ({ key, value }));
    },
    getCategoryDefaultAttrs(categoryId) {
      const cat = this.categories.find(c => c.category_id === categoryId);
      if (!cat || !cat.default_attributes) return [];
      return this.safeParseJSON(cat.default_attributes, []);
    },

    // ---- MUTASI STOK ----
    loadTxDetailFields(itemId) {
      if (!itemId) {
        this.txDetailFields = [];
        return;
      }
      const item = this.getItemById(itemId);
      if (!item) {
        this.txDetailFields = [];
        return;
      }
      const details = this.safeParseJSON(item.detail_spesifik, {});
      const defaultAttrs = this.getCategoryDefaultAttrs(item.category_id);
      
      // Detail spesifik mutasi hanya memuat field yang diizinkan oleh kategori default
      this.txDetailFields = defaultAttrs.map(attrName => ({
        name: attrName,
        value: details[attrName] !== undefined ? String(details[attrName]) : ''
      }));
      
      if (item.location_room && item.location_room !== 'Global') {
        this.directTx.locationRoom = item.location_room;
      } else {
        this.directTx.locationRoom = 'Global';
      }
    },
    submitDirectTx() {
      if (!this.directTx.item_id) {
        alert("Silakan pilih barang terlebih dahulu.");
        return;
      }
      const todayStr = new Date().toISOString().substring(0, 10);
      
      let detailSpesifik = null;
      if (this.txDetailFields.length > 0) {
        const detailObj = {};
        this.txDetailFields.forEach(f => {
          if (f.name.trim()) {
            detailObj[f.name.trim()] = f.value;
          }
        });
        detailSpesifik = JSON.stringify(detailObj);
      }
      
      this.$emit('record-tx', 
        this.directTx.item_id, 
        this.directTx.type, 
        this.directTx.quantity, 
        todayStr, 
        this.directTx.remarks,
        detailSpesifik,
        this.directTx.locationRoom
      );
      
      this.directTx.item_id = '';
      this.directTx.quantity = 1;
      this.directTx.remarks = '';
      this.txDetailFields = [];
    },

    // ---- BARANG CRUD ----
    openAddItem() {
      this.isEditingItem = false;
      this.editingItem = {
        item_id: '',
        item_code: '',
        category_id: this.categories[0] ? this.categories[0].category_id : '',
        item_name: '',
        location_room: this.roomFilter && this.roomFilter !== 'Global' ? this.roomFilter : 'Global',
        stock_initial: 0,
        min_stock: 5,
        remarks: ''
      };
      this.renderDefaultAttrFields(this.editingItem.category_id);
      this.showItemModal = true;
    },
    openEditItem(item) {
      this.isEditingItem = true;
      this.editingItem = { ...item };
      
      const details = this.safeParseJSON(item.detail_spesifik, {});
      const defaultAttrs = this.getCategoryDefaultAttrs(item.category_id);
      
      // Master barang sepenuhnya mengikuti kategori default
      this.defaultAttrFields = defaultAttrs.map(attrName => ({
        name: attrName,
        value: details[attrName] !== undefined ? String(details[attrName]) : ''
      }));
      
      this.showItemModal = true;
    },
    onCategoryChange() {
      this.renderDefaultAttrFields(this.editingItem.category_id);
    },
    renderDefaultAttrFields(categoryId) {
      const attrs = this.getCategoryDefaultAttrs(categoryId);
      this.defaultAttrFields = attrs.map(attrName => ({
        name: attrName,
        value: ''
      }));
    },
    submitItemForm() {
      const detailObj = {};
      
      this.defaultAttrFields.forEach(f => {
        if (f.name.trim()) {
          detailObj[f.name.trim()] = f.value;
        }
      });
      
      const detailSpesifik = JSON.stringify(detailObj);
      
      if (this.isEditingItem) {
        this.$emit('update-item', 
          this.editingItem.item_id, 
          this.editingItem.item_code, 
          this.editingItem.category_id, 
          this.editingItem.item_name, 
          this.editingItem.location_room,
          this.editingItem.min_stock, 
          this.editingItem.remarks,
          detailSpesifik
        );
      } else {
        this.$emit('add-item', 
          this.editingItem.item_code, 
          this.editingItem.category_id, 
          this.editingItem.item_name, 
          this.editingItem.location_room,
          this.editingItem.stock_initial, 
          this.editingItem.min_stock, 
          this.editingItem.remarks,
          detailSpesifik
        );
      }
      this.showItemModal = false;
    },
    confirmDeleteItem(itemId, name) {
      if (confirm('Anda yakin ingin menghapus barang "' + name + '" dari master inventaris?')) {
        this.$emit('delete-item', itemId);
      }
    },

    // ---- KATEGORI CRUD ----
    openAddCat() {
      this.isEditingCat = false;
      this.editingCat = {
        category_id: '',
        category_name: '',
        description: '',
        default_attributes: [],
        is_active: true
      };
      this.newAttrTag = '';
      this.showCatModal = true;
    },
    openEditCat(cat) {
      this.isEditingCat = true;
      this.editingCat = { 
        ...cat,
        default_attributes: this.safeParseJSON(cat.default_attributes, [])
      };
      this.newAttrTag = '';
      this.showCatModal = true;
    },
    addAttrTag() {
      const tag = this.newAttrTag.trim();
      if (!tag) return;
      if (this.editingCat.default_attributes.includes(tag)) {
        alert('Atribut "' + tag + '" sudah ada.');
        return;
      }
      this.editingCat.default_attributes.push(tag);
      this.newAttrTag = '';
    },
    removeAttrTag(index) {
      this.editingCat.default_attributes.splice(index, 1);
    },
    submitCatForm() {
      const attrsJSON = JSON.stringify(this.editingCat.default_attributes);
      if (this.isEditingCat) {
        this.$emit('update-category', 
          this.editingCat.category_id, 
          this.editingCat.category_name, 
          this.editingCat.description, 
          attrsJSON,
          this.editingCat.is_active
        );
      } else {
        this.$emit('add-category', 
          this.editingCat.category_name, 
          this.editingCat.description,
          attrsJSON
        );
      }
      this.showCatModal = false;
    }
  },
  template: `
    <div class="flex flex-col gap-6 w-full max-w-[1200px] mx-auto">
      
      <!-- SUB-TAB 1: MASTER BARANG (GLOBAL & PER-KAMAR INVENTORY) -->
      <div v-if="subTab === 'inventory-stock'" class="flex flex-col gap-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative w-full sm:w-[280px]">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari barang, kode, detail..." class="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
          </div>
          
          <div class="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <!-- Filter Kamar -->
            <select v-model="roomFilter" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              <option value="">Semua Lokasi</option>
              <option value="Global">Global / Gudang</option>
              <option v-for="room in sortedRooms" :key="room.room_number" :value="room.room_number">
                Kamar {{ room.room_number }}
              </option>
            </select>

            <!-- Filter Kategori -->
            <select v-model="categoryFilter" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                {{ cat.category_name }}
              </option>
            </select>
            
            <button @click="openAddItem" class="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-1.5">
              <span class="text-[16px] font-extrabold leading-none">+</span> Tambah Barang
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Kode</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Nama Barang</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" v-if="!categoryFilter">Kategori</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Lokasi</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Stok</th>
                
                <!-- RENDER KOLOM DINAMIS (Memanjang Ke Kanan jika Kategori dipilih) -->
                <template v-if="categoryFilter">
                  <th v-for="col in dynamicTableColumns" :key="col" class="py-3.5 px-4 bg-indigo-50/40 border-b-2 border-indigo-100/60 text-[11.5px] font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">
                    {{ col }}
                  </th>
                </template>
                <template v-else>
                  <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Detail Spesifik</th>
                </template>

                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Keterangan</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[150px]">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in filteredItems" :key="item.item_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><code class="font-mono text-[12px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">{{ item.item_code || '-' }}</code></td>
                <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ item.item_name }}</strong></td>
                <td class="py-3.5 px-4 align-middle text-[13.5px] font-medium text-slate-700" v-if="!categoryFilter">{{ getCategoryName(item.category_id) }}</td>
                <td class="py-3.5 px-4 align-middle">
                  <span :class="['inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase', item.location_room === 'Global' ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-teal-50 text-teal-700 border border-teal-200']">
                    {{ item.location_room === 'Global' ? 'Gudang' : 'Kamar ' + item.location_room }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[12px] font-bold tracking-wide border', item.stock_current < item.min_stock ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200']">
                    Stok: {{ item.stock_current }} (Min: {{ item.min_stock }})
                  </span>
                </td>
                
                <!-- RENDER NILAI DATA DINAMIS -->
                <template v-if="categoryFilter">
                  <td v-for="col in dynamicTableColumns" :key="col" class="py-3.5 px-4 align-middle text-[13px] font-semibold text-slate-800 bg-indigo-50/5">
                    {{ getDetailValue(item.detail_spesifik, col) }}
                  </td>
                </template>
                <template v-else>
                  <td class="py-3 px-4 align-middle">
                    <div class="flex flex-wrap gap-1" v-if="getDetailEntries(item.detail_spesifik).length > 0">
                      <span v-for="entry in getDetailEntries(item.detail_spesifik)" :key="entry.key" class="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-md text-[10.5px] font-semibold gap-0.5">
                        <span class="text-indigo-400 font-medium">{{ entry.key }}:</span>
                        <span>{{ entry.value }}</span>
                      </span>
                    </div>
                    <span v-else class="text-slate-400 text-[12px] italic">-</span>
                  </td>
                </template>

                <td class="py-3.5 px-4 align-middle"><span class="text-slate-500 text-[12.5px] font-medium">{{ item.remarks || '-' }}</span></td>
                <td class="py-3.5 px-4 align-middle">
                  <div class="flex gap-1.5 justify-center">
                    <button @click="openEditItem(item)" class="h-[32px] px-3 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center shadow-sm">
                      Edit
                    </button>
                    <button @click="confirmDeleteItem(item.item_id, item.item_name)" class="h-[32px] px-3 bg-red-50 border border-red-200 text-red-600 font-bold text-[12px] rounded-lg hover:bg-red-100 transition-colors inline-flex items-center justify-center shadow-sm">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredItems.length === 0">
                <td :colspan="categoryFilter ? 6 + dynamicTableColumns.length : 7" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Belum ada barang inventaris tercatat.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 2: MUTASI STOK -->
      <div v-if="subTab === 'inventory-log'" class="flex flex-col gap-6">
        <!-- Form Mutasi Stok: MENYESUAIKAN LEBAR, TIDAK FLAT -->
        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 p-6 md:p-8 w-full max-w-[1200px] mx-auto">
          <div class="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-sm">
              🔄
            </div>
            <div>
              <h3 class="text-[16px] font-extrabold text-slate-900 m-0">Tambah / Kurangi Stok Barang</h3>
              <p class="text-[12px] font-medium text-slate-400 mt-0.5">Catat mutasi inventaris keluar-masuk gudang maupun kamar.</p>
            </div>
          </div>
          
          <form @submit.prevent="submitDirectTx" class="flex flex-col gap-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <!-- Kolom 1: Pilih Barang & Qty -->
              <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-bold text-slate-700">Pilih Barang</label>
                  <select v-model="directTx.item_id" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                    <option value="">-- Pilih Barang --</option>
                    <option v-for="item in inventory" :key="item.item_id" :value="item.item_id">
                      {{ item.item_name }} ({{ item.item_code }}) - Stok: {{ item.stock_current }} [{{ item.location_room === 'Global' ? 'Gudang' : 'Kamar ' + item.location_room }}]
                    </option>
                  </select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-bold text-slate-700">Jumlah (Qty)</label>
                  <input type="number" v-model.number="directTx.quantity" min="1" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                </div>
              </div>

              <!-- Kolom 2: Mutasi & Lokasi Tujuan -->
              <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-bold text-slate-700">Jenis Mutasi</label>
                  <select v-model="directTx.type" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                    <option value="in">Tambah (+ Masuk)</option>
                    <option value="out">Kurang (- Keluar)</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-bold text-slate-700">Ditujukan ke Lokasi Kamar</label>
                  <select v-model="directTx.locationRoom" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                    <option value="Global">Global / Gudang</option>
                    <option v-for="room in sortedRooms" :key="room.room_number" :value="room.room_number">
                      Kamar {{ room.room_number }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Kolom 3: Keterangan -->
              <div class="flex flex-col justify-between gap-4">
                <div class="flex flex-col gap-1.5 h-full">
                  <label class="text-[13px] font-bold text-slate-700">Remarks / Keterangan</label>
                  <textarea v-model="directTx.remarks" placeholder="Contoh: Restock vendor / Pindah unit rusak..." required class="w-full flex-grow px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm min-h-[90px] md:min-h-0"></textarea>
                </div>
              </div>
            </div>
            
            <!-- Update detail_spesifik saat mutasi -->
            <div v-if="txDetailFields.length > 0" class="border-t border-slate-100 pt-5 mt-2">
              <h4 class="text-[13px] font-bold text-indigo-700 mb-3 flex items-center gap-1.5">
                🏷️ Update Detail Spesifik Barang (Berdasarkan Kategori)
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div v-for="(field, idx) in txDetailFields" :key="idx" class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{{ field.name }}</label>
                  <input type="text" v-model="field.value" class="w-full h-[38px] px-3 bg-indigo-50/30 border border-indigo-200/50 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all">
                </div>
              </div>
            </div>
            
            <div class="flex justify-end pt-2 border-t border-slate-50">
              <button type="submit" class="h-[44px] px-8 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[13.5px] rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.35)] transition-all flex items-center justify-center">
                Proses Mutasi Stok
              </button>
            </div>
          </form>
        </div>

        <!-- Filter Riwayat Mutasi (Kamar & Kategori) -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-4">
          <div class="relative w-full lg:w-[280px]">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari riwayat..." class="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
          </div>
          
          <div class="flex flex-wrap gap-2 items-center w-full lg:w-auto">
            <!-- Filter Kamar -->
            <select v-model="logRoomFilter" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              <option value="">Semua Lokasi</option>
              <option value="Global">Global / Gudang</option>
              <option v-for="room in sortedRooms" :key="room.room_number" :value="room.room_number">
                Kamar {{ room.room_number }}
              </option>
            </select>

            <!-- Filter Kategori -->
            <select v-model="logCategoryFilter" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                {{ cat.category_name }}
              </option>
            </select>

            <!-- Filter Waktu -->
            <select v-model="logPeriodFilter" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              <option value="all">Semua Waktu</option>
              <option value="day">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
            <input type="date" v-model="logDateFilter" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" title="Tanggal spesifik">
            <input type="month" v-model="logMonthFilter" class="h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" title="Bulan spesifik">
          </div>
        </div>

        <!-- Tabel Riwayat Mutasi (Dengan Dynamic Table Columns) -->
        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full min-w-[950px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Waktu & Tanggal</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kode Barang</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Nama Barang</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Tipe</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Jumlah</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Lokasi Tujuan</th>
                
                <!-- RENDER KOLOM DINAMIS LOG MUTASI -->
                <template v-if="logCategoryFilter">
                  <th v-for="col in logDynamicTableColumns" :key="'log-col-'+col" class="py-3.5 px-4 bg-indigo-50/40 border-b-2 border-indigo-100/60 text-[11.5px] font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">
                    {{ col }}
                  </th>
                </template>
                <template v-else>
                  <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Detail Barang</th>
                </template>

                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Keterangan</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap last:rounded-tr-lg">Petugas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="tx in filteredTransactions" :key="tx.transaction_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><span class="tracking-tight text-[13.5px] font-semibold text-slate-700">{{ formatDateStr(tx.date) }}</span></td>
                <td class="py-3.5 px-4 align-middle"><code class="font-mono text-[12px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">{{ getItemById(tx.item_id)?.item_code || '-' }}</code></td>
                <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ getItemById(tx.item_id)?.item_name || 'Barang Terhapus' }}</strong></td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border', tx.type === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200']">
                    {{ tx.type === 'in' ? 'MASUK' : 'KELUAR' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center font-bold text-[13.5px]">
                  <span :class="tx.type === 'in' ? 'text-emerald-600' : 'text-red-500'">
                    {{ tx.type === 'in' ? '+' : '-' }}{{ tx.quantity }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle">
                  <span :class="['inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase', tx.location_room === 'Global' ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-teal-50 text-teal-700 border border-teal-200']">
                    {{ tx.location_room === 'Global' ? 'Gudang' : 'Kamar ' + tx.location_room }}
                  </span>
                </td>
                
                <!-- RENDER NILAI DINAMIS LOG MUTASI -->
                <template v-if="logCategoryFilter">
                  <td v-for="col in logDynamicTableColumns" :key="'log-val-'+col" class="py-3.5 px-4 align-middle text-[13px] font-semibold text-slate-800 bg-indigo-50/5">
                    {{ getDetailValue(getItemById(tx.item_id)?.detail_spesifik, col) }}
                  </td>
                </template>
                <template v-else>
                  <td class="py-3 px-4 align-middle text-[12px]">
                    <div class="flex flex-wrap gap-1" v-if="getDetailEntries(getItemById(tx.item_id)?.detail_spesifik).length > 0">
                      <span v-for="entry in getDetailEntries(getItemById(tx.item_id)?.detail_spesifik)" :key="entry.key" class="inline-flex items-center px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-semibold">
                        {{ entry.key }}: {{ entry.value }}
                      </span>
                    </div>
                    <span v-else class="text-slate-400 italic">-</span>
                  </td>
                </template>

                <td class="py-3.5 px-4 align-middle"><span class="text-slate-500 text-[12.5px] font-medium">{{ tx.remarks || '-' }}</span></td>
                <td class="py-3.5 px-4 align-middle text-[13.5px] font-medium text-slate-700">{{ getStaffName(tx.user_id) }}</td>
              </tr>
              <tr v-if="filteredTransactions.length === 0">
                <td :colspan="logCategoryFilter ? 7 + logDynamicTableColumns.length : 8" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Tidak ada log transaksi yang cocok dengan filter aktif.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 3: CONFIG KATEGORI: MENYESUAIKAN LEBAR -->
      <div v-if="subTab === 'inventory-categories'" class="flex flex-col gap-4">
        <div class="flex justify-end">
          <button @click="openAddCat" class="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center shrink-0">
            + Tambah Kategori
          </button>
        </div>
        
        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Nama Kategori</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Deskripsi</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Atribut Default</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[100px]">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="cat in categories" :key="cat.category_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ cat.category_name }}</strong></td>
                <td class="py-3.5 px-4 align-middle"><span class="text-slate-500 text-[12.5px] font-medium">{{ cat.description || '-' }}</span></td>
                <td class="py-3 px-4 align-middle">
                  <div class="flex flex-wrap gap-1" v-if="safeParseJSON(cat.default_attributes, []).length > 0">
                    <span v-for="attr in safeParseJSON(cat.default_attributes, [])" :key="attr" class="inline-block px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200/60 rounded-md text-[10.5px] font-bold">
                      {{ attr }}
                    </span>
                  </div>
                  <span v-else class="text-slate-400 text-[12px] italic">Tidak ada</span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border', cat.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200']">
                    {{ cat.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <button @click="openEditCat(cat)" class="h-[32px] px-4 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center shadow-sm">
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 4: INVENTARIS BULANAN -->
      <div v-if="subTab === 'inventory-monthly'" class="flex flex-col gap-4">
        <!-- Filter Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500 uppercase">Tahun:</span>
            <select v-model="selectedYear" class="h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
              <option v-for="yr in yearOptions" :key="yr" :value="yr">{{ yr }}</option>
            </select>
          </div>
          
          <div class="flex flex-wrap gap-4 items-center">
            <!-- Filter Lokasi -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-500 uppercase">Lokasi:</span>
              <select v-model="monthlyRoomFilter" class="h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                <option value="">Semua Lokasi</option>
                <option value="Global">Global / Gudang</option>
                <option v-for="room in sortedRooms" :key="room.room_number" :value="room.room_number">
                  Kamar {{ room.room_number }}
                </option>
              </select>
            </div>

            <!-- Filter Kategori -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-500 uppercase">Kategori:</span>
              <select v-model="monthlyCategoryFilter" class="h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                <option value="">Semua Kategori</option>
                <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                  {{ cat.category_name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Monthly Tables -->
        <div class="flex flex-col gap-8">
          <div v-for="m in monthlyData" :key="m.monthName" class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <!-- Month Header (mencolok, garis pembatas, deskripsi) -->
            <div class="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div>
                <h4 class="text-base font-black uppercase tracking-wider m-0">PERIOD: {{ m.monthName }} {{ selectedYear }}</h4>
                <p class="text-[10px] text-slate-300 font-semibold mt-0.5">Laporan Rekapitulasi Level Stok & Atribut Master Barang</p>
              </div>
              <span class="px-3 py-1 bg-white/15 text-white border border-white/20 rounded-lg text-xs font-extrabold">
                {{ m.items.length }} Item
              </span>
            </div>

            <!-- Table Container -->
            <div class="overflow-x-auto w-full custom-scrollbar">
              <table class="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr class="bg-slate-50">
                    <th class="py-3 px-4 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Item Code</th>
                    <th class="py-3 px-4 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Item Description</th>
                    <th class="py-3 px-4 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider" v-if="!monthlyCategoryFilter">Category</th>
                    <th class="py-3 px-4 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-center">Min Stock</th>
                    <th class="py-3 px-4 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-center bg-slate-100/50">Current Stock</th>
                    
                    <!-- DYNAMIC COLUMNS (jika filter kategori aktif) -->
                    <template v-if="monthlyCategoryFilter">
                      <th v-for="col in monthlyDynamicColumns" :key="col" class="py-3 px-4 border-b border-slate-200 text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider bg-indigo-50/50">
                        {{ col }}
                      </th>
                    </template>
                    <template v-else>
                      <th class="py-3 px-4 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Detail Spesifik</th>
                    </template>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="item in m.items" :key="item.item_id" class="hover:bg-slate-50/40 transition-colors">
                    <td class="py-3 px-4 align-middle"><code class="font-mono text-xs text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{{ item.item_code }}</code></td>
                    <td class="py-3 px-4 align-middle"><span class="text-xs font-bold text-slate-900">{{ item.item_name }}</span></td>
                    <td class="py-3 px-4 align-middle text-xs text-slate-600" v-if="!monthlyCategoryFilter">{{ getCategoryName(item.category_id) }}</td>
                    <td class="py-3 px-4 align-middle text-center text-xs font-bold text-slate-500">{{ item.min_stock }}</td>
                    <td class="py-3 px-4 align-middle text-center bg-slate-100/30">
                      <span :class="['inline-block px-2.5 py-0.5 rounded-md text-xs font-extrabold border', item.current_stock < item.min_stock ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200']">
                        {{ item.current_stock }}
                      </span>
                    </td>
                    
                    <!-- DYNAMIC VALUES -->
                    <template v-if="monthlyCategoryFilter">
                      <td v-for="col in monthlyDynamicColumns" :key="col" class="py-3 px-4 align-middle text-xs font-semibold text-slate-800 bg-indigo-50/5">
                        {{ getDetailValue(item.detail_spesifik, col) }}
                      </td>
                    </template>
                    <template v-else>
                      <td class="py-3 px-4 align-middle text-xs text-slate-500">
                        <div class="flex flex-wrap gap-1" v-if="getDetailEntries(item.detail_spesifik).length > 0">
                          <span v-for="entry in getDetailEntries(item.detail_spesifik)" :key="entry.key" class="inline-flex items-center px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/30 rounded text-[10px] font-semibold gap-0.5">
                            <span class="text-indigo-400 font-medium">{{ entry.key }}:</span>
                            <span>{{ entry.value }}</span>
                          </span>
                        </div>
                        <span v-else class="text-slate-400 italic">-</span>
                      </td>
                    </template>
                  </tr>
                  <tr v-if="m.items.length === 0">
                    <td colspan="10" class="py-8 px-4 text-center text-xs text-slate-400 font-medium">Tidak ada data untuk periode bulan ini.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: ADD / EDIT ITEM -->
      <div class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showItemModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">{{ isEditingItem ? 'Edit Barang Inventaris' : 'Tambah Barang Baru' }}</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="showItemModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitItemForm" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <!-- Row 1: Code & Name -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Kode Barang</label>
                <input type="text" v-model="editingItem.item_code" placeholder="BRG001" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Nama Barang</label>
                <input type="text" v-model="editingItem.item_name" placeholder="Sprei Single Bed" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              </div>
            </div>

            <!-- Row 2: Category & Location Room -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Kategori</label>
                <select v-model="editingItem.category_id" @change="onCategoryChange" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                  <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                    {{ cat.category_name }}
                  </option>
                </select>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Lokasi / Penempatan Kamar</label>
                <select v-model="editingItem.location_room" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                  <option value="Global">Global / Gudang</option>
                  <option v-for="room in sortedRooms" :key="room.room_number" :value="room.room_number">
                    Kamar {{ room.room_number }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Row 3: Initial Stock & Min Stock -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-2" v-if="!isEditingItem">
                <label class="text-[13px] font-bold text-slate-700">Stok Awal</label>
                <input type="number" v-model.number="editingItem.stock_initial" min="0" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-bold text-slate-700">Batas Stok Minimum</label>
                <input type="number" v-model.number="editingItem.min_stock" min="1" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              </div>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Keterangan</label>
              <textarea v-model="editingItem.remarks" placeholder="Deskripsi tambahan..." class="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm min-h-[60px]" rows="2"></textarea>
            </div>

            <!-- DETAIL DYNAMIC ATTRIBUTES (Fully dependent on category default_attributes) -->
            <div class="border-t border-slate-100 pt-4 mt-1">
              <h4 class="text-[14px] font-extrabold text-indigo-700 mb-3 flex items-center gap-2">
                Detail Spesifik (Sesuai Atribut Kategori)
              </h4>
              
              <!-- Default Attributes -->
              <div v-if="defaultAttrFields.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div v-for="(field, idx) in defaultAttrFields" :key="'default-' + idx" class="flex flex-col gap-1">
                  <label class="text-[11px] font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block"></span>
                    {{ field.name }}
                  </label>
                  <input type="text" v-model="field.value" :placeholder="'Isi ' + field.name + '...'" class="w-full h-[38px] px-3 bg-violet-50/30 border border-violet-200/60 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all">
                </div>
              </div>
              <div v-else class="mb-4 text-[12px] text-slate-400 italic bg-slate-50 py-2 px-3 rounded-lg">
                Kategori ini tidak memiliki atribut wajib.
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
              <button type="button" class="h-[42px] px-5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors" @click="showItemModal = false">Batal</button>
              <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all">Simpan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: ADD / EDIT CATEGORY -->
      <div class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showCatModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">{{ isEditingCat ? 'Edit Kategori' : 'Tambah Kategori Baru' }}</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="showCatModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitCatForm" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Nama Kategori</label>
              <input type="text" v-model="editingCat.category_name" placeholder="Contoh: Linen, Amenities" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Deskripsi Kategori</label>
              <textarea v-model="editingCat.description" placeholder="Deskripsi..." class="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm min-h-[70px]" rows="2"></textarea>
            </div>

            <!-- Default Attributes Tag Manager -->
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Atribut Default</label>
              <p class="text-[11px] text-slate-400 font-medium -mt-1">Field yang otomatis muncul saat tambah barang di kategori ini.</p>
              
              <!-- Tags display -->
              <div class="flex flex-wrap gap-1.5 min-h-[32px] py-1" v-if="editingCat.default_attributes.length > 0">
                <span v-for="(attr, idx) in editingCat.default_attributes" :key="idx" class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-[12px] font-bold">
                  {{ attr }}
                  <button type="button" @click="removeAttrTag(idx)" class="w-5 h-5 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-500 hover:text-violet-700 flex items-center justify-center transition-colors ml-0.5">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              </div>

              <!-- Add new attribute tag input -->
              <div class="flex gap-2">
                <input type="text" v-model="newAttrTag" @keyup.enter.prevent="addAttrTag" placeholder="Nama atribut lalu Enter..." class="flex-1 h-[38px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all">
                <button type="button" @click="addAttrTag" class="h-[38px] px-4 bg-violet-50 border border-violet-200 text-violet-700 font-bold text-[12px] rounded-xl hover:bg-violet-100 transition-colors shrink-0">
                  + Tambah
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-2" v-if="isEditingCat">
              <label class="text-[13px] font-bold text-slate-700">Status Kategori</label>
              <select v-model="editingCat.is_active" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option :value="true">Aktif</option>
                <option :value="false">Nonaktif</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
              <button type="button" class="h-[42px] px-5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors" @click="showCatModal = false">Batal</button>
              <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all">Simpan</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
};
