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
    <div class="inventory-view-wrapper">
      
      <!-- SUB-TAB 1: STOK BARANG -->
      <div v-if="subTab === 'inventory-stock'">
        <div class="grid-controls-row">
          <div class="search-box-wrapper">
            <span class="search-glass">
              <svg style="width: 16px; height: 16px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari nama barang atau kode..." class="ctrl-search-input">
          </div>
          <div class="filter-actions-group" style="display: flex; gap: 8px; align-items: center;">
            <select v-model="categoryFilter" class="ctrl-select">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                {{ cat.category_name }}
              </option>
            </select>
            <button @click="openAddItem" class="btn-primary-action flex items-center gap-1">
              <span style="font-size:16px; font-weight:bold;">+</span> Tambah Barang
            </button>
          </div>
        </div>

        <div class="table-card">
          <div class="table-responsive">
            <table>
            <thead>
              <tr>
                <th>Kode Barang</th>
                <th>Nama Barang</th>
                <th>Kategori</th>
                <th style="text-align: center;">Stok Awal</th>
                <th style="text-align: center; color: #10B981;">Masuk</th>
                <th style="text-align: center; color: #EF4444;">Keluar</th>
                <th style="text-align: center;">Stok Saat Ini</th>
                <th style="text-align: center;">Min. Stok</th>
                <th>Keterangan</th>
                <th style="width: 150px; text-align: center;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="item.item_id">
                <td><code class="code-badge">{{ item.item_code || '-' }}</code></td>
                <td><strong>{{ item.item_name }}</strong></td>
                <td>{{ getCategoryName(item.category_id) }}</td>
                <td style="text-align: center;">{{ item.stock_initial }}</td>
                <td style="text-align: center; color: #10B981; font-weight:600;">+{{ item.stock_in || 0 }}</td>
                <td style="text-align: center; color: #EF4444; font-weight:600;">-{{ item.stock_out || 0 }}</td>
                <td style="text-align: center;">
                  <span :class="['badge-status', item.stock_current < item.min_stock ? 'status-vd' : 'status-vc']" style="padding: 3px 8px; font-weight: 700;">
                    {{ item.stock_current }}
                  </span>
                </td>
                <td style="text-align: center; opacity:0.8;">{{ item.min_stock }}</td>
                <td><span class="text-muted" style="font-size:12.5px;">{{ item.remarks || '-' }}</span></td>
                <td>
                  <div style="display: flex; gap: 6px; justify-content: center;">
                    <button @click="openEditItem(item)" class="btn-card-edit" style="width: auto; padding: 5px 10px; margin:0;">
                      Edit
                    </button>
                    <button @click="confirmDeleteItem(item.item_id, item.item_name)" class="btn-card-edit" style="width: auto; padding: 5px 10px; background-color: #FEF2F2; color:#EF4444; border-color:rgba(239,68,68,0.2); margin:0;">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredItems.length === 0">
                <td colspan="10" class="text-center-placeholder">Belum ada barang inventaris tercatat.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 2: MUTASI STOK -->
      <div v-if="subTab === 'inventory-log'">
        <!-- Form Direct Mutasi Stok (Tambah / Kurangi Stok) -->
        <div class="table-card" style="padding: 20px; margin-bottom: 24px; max-width: 900px; margin-left: auto; margin-right: auto; box-shadow: var(--shadow-md);">
          <h3 style="margin-bottom: 14px; color: var(--primary); font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
            <span>🔄</span> Tambah / Kurangi Stok Barang
          </h3>
          <form @submit.prevent="submitDirectTx" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: flex-end;">
            <div class="form-group-v2" style="margin: 0;">
              <label>Pilih Barang</label>
              <select v-model="directTx.item_id" required class="ctrl-select" style="width: 100%;">
                <option value="">-- Pilih Barang --</option>
                <option v-for="item in inventory" :key="item.item_id" :value="item.item_id">
                  {{ item.item_name }} ({{ item.item_code }}) - Stok: {{ item.stock_current }}
                </option>
              </select>
            </div>
            <div class="form-group-v2" style="margin: 0;">
              <label>Jenis Mutasi</label>
              <select v-model="directTx.type" required class="ctrl-select" style="width: 100%;">
                <option value="in">Tambah (+ Masuk)</option>
                <option value="out">Kurang (- Keluar)</option>
              </select>
            </div>
            <div class="form-group-v2" style="margin: 0;">
              <label>Jumlah (Qty)</label>
              <input type="number" v-model.number="directTx.quantity" min="1" required class="form-input-v2" style="padding: 7px 12px; font-size: 13px;">
            </div>
            <div class="form-group-v2" style="margin: 0;">
              <label>Remarks / Keterangan</label>
              <input type="text" v-model="directTx.remarks" placeholder="Contoh: Stok Tambahan / Rusak" required class="form-input-v2" style="padding: 7px 12px; font-size: 13px;">
            </div>
            <div style="text-align: right;">
              <button type="submit" class="btn-primary-action" style="padding: 9px 20px; width: 100%; justify-content: center;">
                Proses Mutasi
              </button>
            </div>
          </form>
        </div>

        <!-- Filter Riwayat Mutasi -->
        <div class="grid-controls-row">
          <div class="search-box-wrapper">
            <span class="search-glass">
              <svg style="width: 16px; height: 16px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input type="text" v-model="searchQuery" placeholder="Cari riwayat, kode, petugas..." class="ctrl-search-input">
          </div>
          
          <div class="filter-actions-group" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <select v-model="logPeriodFilter" class="ctrl-select">
              <option value="all">Semua Waktu</option>
              <option value="day">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
            
            <input type="date" v-model="logDateFilter" class="ctrl-select" title="Pilih tanggal spesifik">
            <input type="month" v-model="logMonthFilter" class="ctrl-select" title="Pilih bulan spesifik">
          </div>
        </div>

        <!-- Tabel Riwayat Mutasi Stok -->
        <div class="table-card">
          <div class="table-responsive">
            <table>
            <thead>
              <tr>
                <th>Waktu & Tanggal</th>
                <th>Kode Barang</th>
                <th>Nama Barang</th>
                <th style="text-align: center;">Tipe</th>
                <th style="text-align: center;">Jumlah</th>
                <th>Keterangan / Remarks</th>
                <th>Petugas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in filteredTransactions" :key="tx.transaction_id">
                <td><span class="font-compact">{{ formatDateStr(tx.date) }}</span></td>
                <td><code class="code-badge">{{ getItemById(tx.item_id)?.item_code || '-' }}</code></td>
                <td><strong>{{ getItemById(tx.item_id)?.item_name || 'Barang Terhapus' }}</strong></td>
                <td style="text-align: center;">
                  <span :class="['badge-status', tx.type === 'in' ? 'status-vc' : 'status-vd']" style="padding: 2px 8px; font-weight:bold;">
                    {{ tx.type === 'in' ? 'MASUK' : 'KELUAR' }}
                  </span>
                </td>
                <td style="text-align: center; font-weight:700;">
                  <span :style="{ color: tx.type === 'in' ? '#10B981' : '#EF4444' }">
                    {{ tx.type === 'in' ? '+' : '-' }}{{ tx.quantity }}
                  </span>
                </td>
                <td><span class="text-muted" style="font-size:12.5px;">{{ tx.remarks || '-' }}</span></td>
                <td>{{ getStaffName(tx.user_id) }}</td>
              </tr>
              <tr v-if="filteredTransactions.length === 0">
                <td colspan="7" class="text-center-placeholder">Tidak ada log transaksi yang cocok dengan filter aktif.</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- SUB-TAB 3: CONFIG KATEGORI -->
      <div v-if="subTab === 'inventory-categories'">
        <div class="grid-controls-row">
          <div>&nbsp;</div>
          <button @click="openAddCat" class="btn-primary-action">
            + Tambah Kategori
          </button>
        </div>

        <div class="table-card" style="max-width: 800px; margin: 0 auto;">
          <div class="table-responsive">
            <table>
            <thead>
              <tr>
                <th>Nama Kategori</th>
                <th>Deskripsi</th>
                <th style="text-align: center;">Status</th>
                <th style="width: 100px; text-align: center;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cat in categories" :key="cat.category_id">
                <td><strong>{{ cat.category_name }}</strong></td>
                <td><span class="text-muted" style="font-size:12.5px;">{{ cat.description || '-' }}</span></td>
                <td style="text-align: center;">
                  <span :class="['badge-status', cat.is_active ? 'status-vc' : 'status-ooo']">
                    {{ cat.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td>
                  <button @click="openEditCat(cat)" class="btn-card-edit" style="width: auto; padding: 5px 12px; margin:0;">
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
      <div class="modal-overlay-v2" v-if="showItemModal">
        <div class="modal-box-v2" style="max-width: 480px;">
          <div class="modal-header-v2">
            <h3>{{ isEditingItem ? 'Edit Barang Inventaris' : 'Tambah Barang Baru' }}</h3>
            <button class="btn-close-modal" @click="showItemModal = false">×</button>
          </div>
          <form @submit.prevent="submitItemForm" class="modal-body-v2">
            <div class="form-group-v2">
              <label>Kode Barang (Unique)</label>
              <input type="text" v-model="editingItem.item_code" placeholder="Contoh: BRG001" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Nama Barang</label>
              <input type="text" v-model="editingItem.item_name" placeholder="Contoh: Tisu Roll" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Kategori</label>
              <select v-model="editingItem.category_id" required class="form-input-v2">
                <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                  {{ cat.category_name }}
                </option>
              </select>
            </div>
            <!-- Initial stock only allowed when creating a new item -->
            <div class="form-group-v2" v-if="!isEditingItem">
              <label>Stok Awal</label>
              <input type="number" v-model.number="editingItem.stock_initial" min="0" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Batas Stok Minimum</label>
              <input type="number" v-model.number="editingItem.min_stock" min="1" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Keterangan</label>
              <textarea v-model="editingItem.remarks" placeholder="Tambahkan deskripsi..." class="form-input-v2" rows="3"></textarea>
            </div>
            <div class="modal-footer-v2">
              <button type="button" class="btn-sec-modal" @click="showItemModal = false">Batal</button>
              <button type="submit" class="btn-primary-action">Simpan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: ADD / EDIT CATEGORY -->
      <div class="modal-overlay-v2" v-if="showCatModal">
        <div class="modal-box-v2" style="max-width: 440px;">
          <div class="modal-header-v2">
            <h3>{{ isEditingCat ? 'Edit Kategori Inventaris' : 'Tambah Kategori Baru' }}</h3>
            <button class="btn-close-modal" @click="showCatModal = false">×</button>
          </div>
          <form @submit.prevent="submitCatForm" class="modal-body-v2">
            <div class="form-group-v2">
              <label>Nama Kategori</label>
              <input type="text" v-model="editingCat.category_name" placeholder="Contoh: Linen, Amenities" required class="form-input-v2">
            </div>
            <div class="form-group-v2">
              <label>Deskripsi Kategori</label>
              <textarea v-model="editingCat.description" placeholder="Keterangan singkat..." class="form-input-v2" rows="3"></textarea>
            </div>
            <div class="form-group-v2" v-if="isEditingCat">
              <label>Status Kategori</label>
              <select v-model="editingCat.is_active" class="form-input-v2">
                <option :value="true">Aktif</option>
                <option :value="false">Nonaktif</option>
              </select>
            </div>
            <div class="modal-footer-v2">
              <button type="button" class="btn-sec-modal" @click="showCatModal = false">Batal</button>
              <button type="submit" class="btn-primary-action">Simpan</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
};
