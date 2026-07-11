// =========================================================================
// VUE COMPONENT: INVENTORY MANAGEMENT VIEW (STOCK, MUTASI STOK, CATEGORIES)
// =========================================================================
const InventoryManagementView = {
  props: ['subTab', 'inventory', 'inventoryTransactions', 'categories', 'users'],
  emits: [
    'add-item', 'update-item', 'delete-item', 
    'record-tx', 'add-category', 'update-category'
  ],
  data() {
    return {
      searchQuery: '',
      categoryFilter: '',
      
      // Period filter for Mutasi Stok
      logPeriodFilter: 'all', // 'all', 'day', 'week', 'month'
      logDateFilter: '',      // custom date picker value
      logMonthFilter: '',     // custom month picker value (YYYY-MM)
      
      // Direct Mutasi Stok form data
      directTx: {
        item_id: '',
        type: 'in', // 'in' or 'out'
        quantity: 1,
        remarks: ''
      },

      // Modals
      showItemModal: false,
      isEditingItem: false,
      editingItem: {
        item_id: '',
        item_code: '',
        category_id: '',
        item_name: '',
        stock_initial: 0,
        min_stock: 5,
        remarks: ''
      },

      showCatModal: false,
      isEditingCat: false,
      editingCat: {
        category_id: '',
        category_name: '',
        description: '',
        is_active: true
      }
    };
  },
  computed: {
    filteredItems() {
      let list = this.inventory ? [...this.inventory] : [];
      if (this.categoryFilter) {
        list = list.filter(i => i.category_id === this.categoryFilter);
      }
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(i => 
          String(i.item_name).toLowerCase().includes(q) ||
          String(i.item_code).toLowerCase().includes(q) ||
          String(i.remarks).toLowerCase().includes(q)
        );
      }
      return list;
    },
    filteredTransactions() {
      let list = this.inventoryTransactions ? [...this.inventoryTransactions] : [];
      
      // Sort newest transactions first
      list.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

      const now = new Date();
      
      if (this.logPeriodFilter === 'day') {
        const todayStr = now.toISOString().substring(0, 10);
        list = list.filter(t => t.date === todayStr);
      } else if (this.logPeriodFilter === 'week') {
        // Last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        list = list.filter(t => new Date(t.date) >= oneWeekAgo);
      } else if (this.logPeriodFilter === 'month') {
        // Same month & year
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        list = list.filter(t => {
          const d = new Date(t.date);
          return d.getFullYear() === curYear && d.getMonth() === curMonth;
        });
      }

      // Apply custom date picker filter
      if (this.logDateFilter) {
        list = list.filter(t => t.date === this.logDateFilter);
      }
      
      // Apply custom month picker filter
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
            staff.toLowerCase().includes(q)
          );
        });
      }

      return list;
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
    
    // Direct Mutasi Stok submission
    submitDirectTx() {
      if (!this.directTx.item_id) {
        alert("Silakan pilih barang terlebih dahulu.");
        return;
      }
      const todayStr = new Date().toISOString().substring(0, 10);
      this.$emit('record-tx', 
        this.directTx.item_id, 
        this.directTx.type, 
        this.directTx.quantity, 
        todayStr, 
        this.directTx.remarks
      );
      // Reset form fields
      this.directTx.item_id = '';
      this.directTx.quantity = 1;
      this.directTx.remarks = '';
    },

    // Item Actions
    openAddItem() {
      this.isEditingItem = false;
      this.editingItem = {
        item_id: '',
        item_code: '',
        category_id: this.categories[0] ? this.categories[0].category_id : '',
        item_name: '',
        stock_initial: 0,
        min_stock: 5,
        remarks: ''
      };
      this.showItemModal = true;
    },
    openEditItem(item) {
      this.isEditingItem = true;
      this.editingItem = { ...item };
      this.showItemModal = true;
    },
    submitItemForm() {
      if (this.isEditingItem) {
        this.$emit('update-item', this.editingItem.item_id, this.editingItem.item_code, this.editingItem.category_id, this.editingItem.item_name, this.editingItem.min_stock, this.editingItem.remarks);
      } else {
        this.$emit('add-item', this.editingItem.item_code, this.editingItem.category_id, this.editingItem.item_name, this.editingItem.stock_initial, this.editingItem.min_stock, this.editingItem.remarks);
      }
      this.showItemModal = false;
    },
    confirmDeleteItem(itemId, name) {
      if (confirm(`Anda yakin ingin menghapus barang "${name}" dari inventaris?`)) {
        this.$emit('delete-item', itemId);
      }
    },

    // Category Actions
    openAddCat() {
      this.isEditingCat = false;
      this.editingCat = {
        category_id: '',
        category_name: '',
        description: '',
        is_active: true
      };
      this.showCatModal = true;
    },
    openEditCat(cat) {
      this.isEditingCat = true;
      this.editingCat = { ...cat };
      this.showCatModal = true;
    },
    submitCatForm() {
      if (this.isEditingCat) {
        this.$emit('update-category', this.editingCat.category_id, this.editingCat.category_name, this.editingCat.description, this.editingCat.is_active);
      } else {
        this.$emit('add-category', this.editingCat.category_name, this.editingCat.description);
      }
      this.showCatModal = false;
    }
  },
  template: `
    <div class="flex flex-col gap-6 w-full max-w-[1200px] mx-auto">
      
      <!-- SUB-TAB 1: STOK BARANG -->
      <div v-if="subTab === 'inventory-stock'" class="flex flex-col gap-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative w-full sm:w-[320px]">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari nama barang atau kode..." class="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
          </div>
          <div class="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
            <select v-model="categoryFilter" class="w-full sm:w-auto h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm shrink-0">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                {{ cat.category_name }}
              </option>
            </select>
            <button @click="openAddItem" class="w-full sm:w-auto h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center shrink-0 gap-1.5">
              <span class="text-[16px] font-extrabold leading-none">+</span> Tambah Barang
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Kode Barang</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Nama Barang</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kategori</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Stok Awal</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-emerald-600 uppercase tracking-wider whitespace-nowrap text-center">Masuk</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-red-500 uppercase tracking-wider whitespace-nowrap text-center">Keluar</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Stok Saat Ini</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Min. Stok</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Keterangan</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[150px]">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in filteredItems" :key="item.item_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><code class="font-mono text-[12px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">{{ item.item_code || '-' }}</code></td>
                <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ item.item_name }}</strong></td>
                <td class="py-3.5 px-4 align-middle text-[13.5px] font-medium text-slate-700">{{ getCategoryName(item.category_id) }}</td>
                <td class="py-3.5 px-4 align-middle text-center text-[13.5px] font-medium text-slate-700">{{ item.stock_initial }}</td>
                <td class="py-3.5 px-4 align-middle text-center text-emerald-600 font-bold text-[13.5px]">+{{ item.stock_in || 0 }}</td>
                <td class="py-3.5 px-4 align-middle text-center text-red-500 font-bold text-[13.5px]">-{{ item.stock_out || 0 }}</td>
                <td class="py-3.5 px-4 align-middle text-center">
                  <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[12px] font-bold tracking-wide border', item.stock_current < item.min_stock ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200']">
                    {{ item.stock_current }}
                  </span>
                </td>
                <td class="py-3.5 px-4 align-middle text-center text-slate-400 text-[13.5px] font-medium">{{ item.min_stock }}</td>
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
                <td colspan="10" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Belum ada barang inventaris tercatat.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 2: MUTASI STOK -->
      <div v-if="subTab === 'inventory-log'" class="flex flex-col gap-6">
        <!-- Form Direct Mutasi Stok (Tambah / Kurangi Stok) -->
        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 p-5 md:p-6 max-w-[900px] mx-auto w-full">
          <h3 class="mb-4 text-blue-700 text-[15px] font-bold flex items-center gap-2">
            <span>🔄</span> Tambah / Kurangi Stok Barang
          </h3>
          <form @submit.prevent="submitDirectTx" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div class="flex flex-col gap-2 md:col-span-2">
              <label class="text-[13px] font-bold text-slate-700">Pilih Barang</label>
              <select v-model="directTx.item_id" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option value="">-- Pilih Barang --</option>
                <option v-for="item in inventory" :key="item.item_id" :value="item.item_id">
                  {{ item.item_name }} ({{ item.item_code }}) - Stok: {{ item.stock_current }}
                </option>
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Jenis Mutasi</label>
              <select v-model="directTx.type" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option value="in">Tambah (+ Masuk)</option>
                <option value="out">Kurang (- Keluar)</option>
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Jumlah (Qty)</label>
              <input type="number" v-model.number="directTx.quantity" min="1" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2 md:col-span-2 md:col-start-1">
              <label class="text-[13px] font-bold text-slate-700">Remarks / Keterangan</label>
              <input type="text" v-model="directTx.remarks" placeholder="Contoh: Stok Tambahan / Rusak" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="md:col-start-5">
              <button type="submit" class="w-full h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center">
                Proses Mutasi
              </button>
            </div>
          </form>
        </div>

        <!-- Filter Riwayat Mutasi -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative w-full sm:w-[320px]">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari riwayat, kode, petugas..." class="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
          </div>
          
          <div class="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <select v-model="logPeriodFilter" class="w-full sm:w-auto h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
              <option value="all">Semua Waktu</option>
              <option value="day">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
            
            <input type="date" v-model="logDateFilter" class="w-full sm:w-auto h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" title="Pilih tanggal spesifik">
            <input type="month" v-model="logMonthFilter" class="w-full sm:w-auto h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" title="Pilih bulan spesifik">
          </div>
        </div>

        <!-- Tabel Riwayat Mutasi Stok -->
        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Waktu & Tanggal</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kode Barang</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Nama Barang</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Tipe</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Jumlah</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Keterangan / Remarks</th>
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
                <td class="py-3.5 px-4 align-middle"><span class="text-slate-500 text-[12.5px] font-medium">{{ tx.remarks || '-' }}</span></td>
                <td class="py-3.5 px-4 align-middle text-[13.5px] font-medium text-slate-700">{{ getStaffName(tx.user_id) }}</td>
              </tr>
              <tr v-if="filteredTransactions.length === 0">
                <td colspan="7" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">Tidak ada log transaksi yang cocok dengan filter aktif.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 3: CONFIG KATEGORI -->
      <div v-if="subTab === 'inventory-categories'" class="flex flex-col gap-4">
        <div class="flex justify-end">
          <button @click="openAddCat" class="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center shrink-0">
            + Tambah Kategori
          </button>
        </div>

        <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full max-w-[800px] mx-auto overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full border-collapse text-left">
            <thead>
              <tr>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-lg">Nama Kategori</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Deskripsi</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                <th class="py-3.5 px-4 bg-slate-50 border-b-2 border-slate-100 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg w-[100px]">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="cat in categories" :key="cat.category_id" class="transition-colors hover:bg-slate-50/50">
                <td class="py-3.5 px-4 align-middle"><strong class="text-[13.5px] font-bold text-slate-900">{{ cat.category_name }}</strong></td>
                <td class="py-3.5 px-4 align-middle"><span class="text-slate-500 text-[12.5px] font-medium">{{ cat.description || '-' }}</span></td>
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

      <!-- MODAL: ADD / EDIT ITEM -->
      <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showItemModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">{{ isEditingItem ? 'Edit Barang Inventaris' : 'Tambah Barang Baru' }}</h3>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="showItemModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="submitItemForm" class="flex flex-col gap-5 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Kode Barang (Unique)</label>
              <input type="text" v-model="editingItem.item_code" placeholder="Contoh: BRG001" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Nama Barang</label>
              <input type="text" v-model="editingItem.item_name" placeholder="Contoh: Tisu Roll" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Kategori</label>
              <select v-model="editingItem.category_id" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                  {{ cat.category_name }}
                </option>
              </select>
            </div>
            <!-- Initial stock only allowed when creating a new item -->
            <div class="flex flex-col gap-2" v-if="!isEditingItem">
              <label class="text-[13px] font-bold text-slate-700">Stok Awal</label>
              <input type="number" v-model.number="editingItem.stock_initial" min="0" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Batas Stok Minimum</label>
              <input type="number" v-model.number="editingItem.min_stock" min="1" required class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[13px] font-bold text-slate-700">Keterangan</label>
              <textarea v-model="editingItem.remarks" placeholder="Tambahkan deskripsi..." class="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm min-h-[80px]" rows="3"></textarea>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
              <button type="button" class="h-[42px] px-5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors" @click="showItemModal = false">Batal</button>
              <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all">Simpan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: ADD / EDIT CATEGORY -->
      <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="showCatModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] flex flex-col relative">
          <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 class="text-lg font-extrabold text-slate-900">{{ isEditingCat ? 'Edit Kategori Inventaris' : 'Tambah Kategori Baru' }}</h3>
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
              <textarea v-model="editingCat.description" placeholder="Keterangan singkat..." class="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm min-h-[80px]" rows="3"></textarea>
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
