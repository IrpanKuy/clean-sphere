// =========================================================================
// VUE COMPONENT: ROOM AUDITING HISTORY VIEW
// =========================================================================
const RoomHistoryView = {
  props: ['statusHistory', 'users', 'checklists', 'rooms'],
  emits: ['update-checklist'],
  components: {
    'checklist-detail-viewer': ChecklistDetailViewer,
    'checklist-editor-modal': ChecklistEditorModal
  },
  data() {
    return {
      searchQuery: '',
      statusFilter: '',
      periodFilter: 'all', // 'all', 'day', 'week', 'month'
      dateFilter: '',     // YYYY-MM-DD
      monthFilter: '',    // YYYY-MM
      expandedHistoryIds: [],
      // Modal states
      showChecklistModal: false,
      editingChecklist: null,
      
      // Static config for 10 fixed statuses
      statusConfig: {
        "VD": { name: "Vacant Dirty", color: "#EF4444" },
        "VC": { name: "Vacant Clean", color: "#10B981" },
        "OD": { name: "Occupied Dirty", color: "#F59E0B" },
        "OC": { name: "Occupied Clean", color: "#3B82F6" },
        "DND": { name: "Do Not Disturb", color: "#8B5CF6" },
        "SR": { name: "Service Refused", color: "#EC4899" },
        "NS": { name: "No Show", color: "#64748B" },
        "SO": { name: "Sleep Out", color: "#14B8A6" },
        "OOO": { name: "Out of Order", color: "#374151" },
        "OOS": { name: "Out of Service", color: "#78350F" }
      }
    };
  },
  computed: {
    // 1. Filter history based on time & period controls
    timeFilteredHistory() {
      let list = this.statusHistory ? [...this.statusHistory] : [];
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      const now = new Date();

      if (this.periodFilter === 'day') {
        const todayStr = this.getTodayDateStr();
        list = list.filter(h => this.getLogLocalDateStr(h.timestamp) === todayStr);
      } else if (this.periodFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        list = list.filter(h => new Date(h.timestamp) >= oneWeekAgo);
      } else if (this.periodFilter === 'month') {
        const curYearMonth = this.getCurrentYearMonthStr();
        list = list.filter(h => this.getLogLocalDateStr(h.timestamp).startsWith(curYearMonth));
      }

      if (this.dateFilter) {
        list = list.filter(h => this.getLogLocalDateStr(h.timestamp) === this.dateFilter);
      }

      if (this.monthFilter) {
        list = list.filter(h => this.getLogLocalDateStr(h.timestamp).startsWith(this.monthFilter));
      }

      return list;
    },

    // 2. Filter history based on status & search query for table display
    filteredHistory() {
      let list = [...this.timeFilteredHistory];

      if (this.statusFilter) {
        list = list.filter(h => h.new_status === this.statusFilter || h.old_status === this.statusFilter);
      }

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(h => 
          String(h.room_number).toLowerCase().includes(q) ||
          this.getStaffName(h.changed_by).toLowerCase().includes(q) ||
          String(h.old_status).toLowerCase().includes(q) ||
          String(h.new_status).toLowerCase().includes(q) ||
          (h.guest_name && String(h.guest_name).toLowerCase().includes(q))
        );
      }
      return list;
    },

    // 3. Dynamic context-aware overview cards grid depending on statusFilter & time filter
    overviewCards() {
      const baseList = this.timeFilteredHistory;

      // When NO status filter is selected (Semua Status)
      if (!this.statusFilter) {
        const totalLogs = baseList.length;
        const vdToVc = baseList.filter(h => h.old_status === 'VD' && h.new_status === 'VC').length;
        const odToOc = baseList.filter(h => h.old_status === 'OD' && h.new_status === 'OC').length;
        const vciCount = baseList.filter(h => h.new_status === 'VCI').length;
        const oooCount = baseList.filter(h => h.new_status === 'OOO' || h.new_status === 'OOS').length;
        
        const validKpis = baseList.filter(h => h.kpi_score !== undefined && h.kpi_score !== null && h.kpi_score !== '').map(h => Number(h.kpi_score));
        const avgKpi = validKpis.length > 0 ? Math.round(validKpis.reduce((a,b) => a+b, 0) / validKpis.length) : 100;

        return [
          {
            title: "Total Perubahan Status",
            value: totalLogs,
            unit: "log",
            desc: "Total transisi status kamar dalam periode ini",
            iconBg: "bg-slate-100 text-slate-700 border-slate-200",
            valColor: "text-slate-800",
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
          },
          {
            title: "Pembersihan VD → VC",
            value: vdToVc,
            unit: "kali",
            desc: "Pembersihan kamar kotor (VD) ke bersih (VC)",
            iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
            valColor: "text-emerald-600",
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
          },
          {
            title: "Pembersihan OD → OC",
            value: odToOc,
            unit: "kali",
            desc: "Pembersihan kamar terisi (OD) ke terisi bersih (OC)",
            iconBg: "bg-blue-50 text-blue-600 border-blue-100",
            valColor: "text-blue-600",
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"></path></svg>`
          },
          {
            title: "Inspeksi VCI",
            value: vciCount,
            unit: "kamar",
            desc: "Kamar bersih yang lolos inspeksi supervisor",
            iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
            valColor: "text-indigo-600",
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
          },
          {
            title: "Kamar Perbaikan (OOO / OOS)",
            value: oooCount,
            unit: "log",
            desc: "Kamar out of order / out of service",
            iconBg: "bg-rose-50 text-rose-600 border-rose-100",
            valColor: "text-rose-600",
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"></path></svg>`
          },
          {
            title: "Rata-rata Skor KPI",
            value: avgKpi,
            unit: "skor",
            desc: "Rata-rata pencapaian KPI pembersihan",
            iconBg: "bg-amber-50 text-amber-600 border-amber-100",
            valColor: "text-amber-600",
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.488-.415.871-.84.613l-4.72-2.882a.563.563 0 00-.582 0l-4.72 2.882c-.425.258-.956-.125-.84-.613l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"></path></svg>`
          }
        ];
      }

      // When a SPECIFIC status filter IS selected (e.g. 'VD', 'OD', 'VC', 'OC', etc.)
      const st = this.statusFilter;
      const cfg = this.statusConfig[st] || { name: st, color: '#3B82F6' };
      const stLogs = baseList.filter(h => h.old_status === st || h.new_status === st);
      
      const totalStLogs = stLogs.length;
      const inToSt = baseList.filter(h => h.new_status === st).length;
      const outFromSt = baseList.filter(h => h.old_status === st).length;

      let specificCleaningCard = null;
      if (st === 'VD') {
        const vdToVc = baseList.filter(h => h.old_status === 'VD' && h.new_status === 'VC').length;
        specificCleaningCard = {
          title: "Pembersihan VD → VC",
          value: vdToVc,
          unit: "kali",
          desc: "Kamar kotor (VD) selesai dibersihkan menjadi (VC)",
          iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
          valColor: "text-emerald-600",
          icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
        };
      } else if (st === 'OD') {
        const odToOc = baseList.filter(h => h.old_status === 'OD' && h.new_status === 'OC').length;
        specificCleaningCard = {
          title: "Pembersihan OD → OC",
          value: odToOc,
          unit: "kali",
          desc: "Pembersihan kamar terisi kotor (OD) menjadi (OC)",
          iconBg: "bg-blue-50 text-blue-600 border-blue-100",
          valColor: "text-blue-600",
          icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"></path></svg>`
        };
      }

      const durations = stLogs.filter(h => h.duration_minutes > 0).map(h => Number(h.duration_minutes));
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a,b) => a+b, 0) / durations.length) : 0;

      const kpis = stLogs.filter(h => h.kpi_score !== undefined && h.kpi_score !== null && h.kpi_score !== '').map(h => Number(h.kpi_score));
      const avgKpi = kpis.length > 0 ? Math.round(kpis.reduce((a,b) => a+b, 0) / kpis.length) : 100;

      const cards = [
        {
          title: `Total Log Status ${st}`,
          value: totalStLogs,
          unit: "log",
          desc: `Seluruh transisi terkait status ${st} (${cfg.name})`,
          iconBg: "bg-slate-100 text-slate-700 border-slate-200",
          valColor: "text-slate-800",
          icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
        },
        {
          title: `Transisi Masuk ke ${st}`,
          value: inToSt,
          unit: "kali",
          desc: `Perubahan status kamar dari status lain MENJADI ${st}`,
          iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
          valColor: "text-indigo-600",
          icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"></path></svg>`
        },
        {
          title: `Transisi Keluar dari ${st}`,
          value: outFromSt,
          unit: "kali",
          desc: `Perubahan status kamar DARI ${st} ke status selanjutnya`,
          iconBg: "bg-violet-50 text-violet-600 border-violet-100",
          valColor: "text-violet-600",
          icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"></path></svg>`
        }
      ];

      if (specificCleaningCard) {
        cards.push(specificCleaningCard);
      }

      cards.push(
        {
          title: `Rata-rata Durasi Status ${st}`,
          value: avgDuration,
          unit: "menit",
          desc: `Lama kamar berada di status ${st} sebelum diubah`,
          iconBg: "bg-amber-50 text-amber-600 border-amber-100",
          valColor: "text-amber-600",
          icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
        },
        {
          title: `Rata-rata KPI Status ${st}`,
          value: avgKpi,
          unit: "skor",
          desc: `Pencapaian KPI waktu status ${st}`,
          iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
          valColor: "text-emerald-600",
          icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.488-.415.871-.84.613l-4.72-2.882a.563.563 0 00-.582 0l-4.72 2.882c-.425.258-.956-.125-.84-.613l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"></path></svg>`
        }
      );

      return cards;
    }
  },
  methods: {
    getTodayDateStr() {
      const now = new Date();
      return this.getLogLocalDateStr(now.toISOString());
    },
    getCurrentYearMonthStr() {
      const now = new Date();
      const str = this.getLogLocalDateStr(now.toISOString());
      return str.substring(0, 7);
    },
    resetFilters() {
      this.searchQuery = '';
      this.statusFilter = '';
      this.periodFilter = 'all';
      this.dateFilter = '';
      this.monthFilter = '';
    },
    getStaffName(id) {
      const u = this.users.find(x => x.user_id === id);
      return u ? u.name : id || 'Sistem';
    },
    getStatusColor(status) {
      const cfg = this.statusConfig[status];
      return cfg ? cfg.color : '#E2E8F0';
    },
    formatTime(isoStr) {
      if (!isoStr) return '-';
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return isoStr;
      return date.toLocaleString('id-ID', { hour12: false });
    },
    getLogLocalDateStr(timestamp) {
      if (!timestamp) return "";
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          return String(timestamp).substring(0, 10);
        }
        
        // Format to Asia/Jakarta timezone to align with database
        const formatter = new Intl.DateTimeFormat('en-US', { 
          timeZone: 'Asia/Jakarta', 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find(p => p.type === 'year').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        return `${year}-${month}-${day}`;
      } catch (e) {
        console.error("Timezone standardizing error:", e);
        return String(timestamp).substring(0, 10);
      }
    },
    getAssociatedChecklist(log) {
      if (!log.timestamp) return null;
      
      const logDateStr = this.getLogLocalDateStr(log.timestamp);
      if (!logDateStr) return null;
      
      let found = (this.checklists || []).find(c => 
        String(c.room_number) === String(log.room_number) && 
        c.date === logDateStr
      );

      if (!found) {
        found = {
          checklist_id: "", 
          room_number: String(log.room_number),
          staff_id: log.changed_by || (this.users[0] ? this.users[0].user_id : "USR002"),
          date: logDateStr,
          start_time: "08:00",
          end_time: "08:15",
          duration_minutes: 15,
          tasks_completed: "{}",
          linen_changed: "{}",
          refills: "{}",
          status: "Completed",
          kpi_score: 0
        };
      }
      return found;
    },
    toggleRow(historyId) {
      const idx = this.expandedHistoryIds.indexOf(historyId);
      if (idx !== -1) {
        this.expandedHistoryIds.splice(idx, 1);
      } else {
        this.expandedHistoryIds.push(historyId);
      }
    },
    isRowExpanded(historyId) {
      return this.expandedHistoryIds.includes(historyId);
    },
    triggerEdit(c) {
      this.editingChecklist = c;
      this.showChecklistModal = true;
    },
    submitUpdateChecklist(payload) {
      const isNew = !payload.checklist_id;
      const extraData = {};
      if (isNew && this.editingChecklist) {
        extraData.room_number = this.editingChecklist.room_number;
        extraData.staff_id = this.editingChecklist.staff_id;
        extraData.date = this.editingChecklist.date;
        extraData.start_time = this.editingChecklist.start_time;
        extraData.end_time = this.editingChecklist.end_time;
        extraData.duration_minutes = this.editingChecklist.duration_minutes;
      }

      this.$emit('update-checklist', 
        payload.checklist_id,
        JSON.stringify(payload.tasks_completed),
        JSON.stringify(payload.linen_changed),
        JSON.stringify(payload.refills),
        payload.kpi_score,
        extraData
      );
      this.showChecklistModal = false;
    }
  },
  template: `
    <div class="flex flex-col gap-7 w-full max-w-[1200px] mx-auto py-2">
      
      <!-- Filter Control Bar (Time & Status & Search) -->
      <div class="bg-white p-6 md:p-7 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col gap-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <!-- Search Bar -->
          <div class="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <label class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest ml-0.5">Cari Data</label>
            <div class="relative w-full">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                </svg>
              </span>
              <input type="text" v-model="searchQuery" placeholder="Kamar, status, petugas, tamu..." class="w-full h-[42px] pl-10 pr-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
            </div>
          </div>

          <!-- Filter Status -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest ml-0.5">Filter Status</label>
            <select v-model="statusFilter" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm">
              <option value="">Semua Status Kamar</option>
              <option v-for="(cfg, code) in statusConfig" :key="code" :value="code">
                {{ code }} - {{ cfg.name }}
              </option>
            </select>
          </div>

          <!-- Filter Cepat Waktu -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest ml-0.5">Filter Cepat Waktu</label>
            <select v-model="periodFilter" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm">
              <option value="all">Semua Waktu</option>
              <option value="day">Hari Ini</option>
              <option value="week">7 Hari Terakhir</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>

          <!-- Tanggal Spesifik -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest ml-0.5">Tanggal Spesifik</label>
            <input type="date" v-model="dateFilter" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm">
          </div>

          <!-- Bulan Spesifik -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest ml-0.5">Bulan Spesifik</label>
            <input type="month" v-model="monthFilter" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm">
          </div>
        </div>

        <!-- Filter Active Pills & Reset -->
        <div v-if="statusFilter || periodFilter !== 'all' || dateFilter || monthFilter || searchQuery" class="flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-3">
          <div class="flex items-center gap-2 flex-wrap text-xs">
            <span class="font-extrabold text-slate-400">Filter Aktif:</span>
            <span v-if="statusFilter" class="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-extrabold border border-blue-200">Status: {{ statusFilter }}</span>
            <span v-if="periodFilter !== 'all'" class="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200">Waktu: {{ periodFilter === 'day' ? 'Hari Ini' : periodFilter === 'week' ? '7 Hari Terakhir' : 'Bulan Ini' }}</span>
            <span v-if="dateFilter" class="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 font-extrabold border border-amber-200">Tgl: {{ dateFilter }}</span>
            <span v-if="monthFilter" class="px-3 py-1 rounded-lg bg-purple-50 text-purple-700 font-extrabold border border-purple-200">Bln: {{ monthFilter }}</span>
            <span v-if="searchQuery" class="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-extrabold border border-slate-200">Cari: "{{ searchQuery }}"</span>
          </div>
          <button @click="resetFilters" class="h-8 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11.5px] rounded-xl transition-colors inline-flex items-center gap-1.5 shrink-0 shadow-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            Reset Filter
          </button>
        </div>
      </div>

      <!-- Overview Section -->
      <div class="flex flex-col gap-4 mt-2">
        <!-- Overview Header -->
        <div class="flex items-center justify-between gap-4 py-1">
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-6 bg-blue-600 rounded-full"></div>
            <h3 class="text-base font-extrabold text-slate-900 tracking-tight">
              Overview Transisi Status Kamar
              <span v-if="statusFilter" class="ml-1 text-blue-600 font-black">({{ statusFilter }} - {{ statusConfig[statusFilter] ? statusConfig[statusFilter].name : '' }})</span>
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200/80 shadow-sm">
              {{ filteredHistory.length }} Data Tampil
            </span>
          </div>
        </div>

        <!-- Grid Cards Overview (Dynamic per status & time filter) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5.5 w-full">
          <div 
            v-for="(card, idx) in overviewCards" 
            :key="idx" 
            class="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group min-h-[145px]"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex flex-col">
                <span class="text-[11.5px] font-extrabold text-slate-400 uppercase tracking-wider leading-snug">{{ card.title }}</span>
                <div class="flex items-baseline gap-1.5 mt-2">
                  <span :class="['text-3xl font-black tracking-tight font-sans', card.valColor]">{{ card.value }}</span>
                  <span class="text-xs font-extrabold text-slate-400 font-sans">{{ card.unit }}</span>
                </div>
              </div>
              <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105 p-2.5', card.iconBg]" v-html="card.icon">
              </div>
            </div>
            <div class="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11.5px] font-semibold text-slate-400 leading-normal">
              <span class="truncate">{{ card.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Table Section Header & Container -->
      <div class="flex flex-col gap-4 mt-4">
        <div class="flex items-center justify-between gap-4 py-1">
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-6 bg-slate-800 rounded-full"></div>
            <h3 class="text-base font-extrabold text-slate-900 tracking-tight">
              Daftar Audit Transisi Status Kamar
            </h3>
          </div>
        </div>

        <div class="bg-white rounded-3xl shadow-[0_10px_35px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
          <div class="overflow-x-auto w-full custom-scrollbar">
            <table class="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr>
                <th class="py-4.5 px-5 bg-slate-50/80 border-b-2 border-slate-100 text-[11.5px] font-extrabold text-slate-500 uppercase tracking-wider first:rounded-tl-lg whitespace-nowrap">Waktu Perubahan</th>
                <th class="py-4.5 px-5 bg-slate-50/80 border-b-2 border-slate-100 text-[11.5px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kamar & Guest</th>
                <th class="py-4.5 px-5 bg-slate-50/80 border-b-2 border-slate-100 text-[11.5px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status Lama</th>
                <th class="py-4.5 px-5 bg-slate-50/80 border-b-2 border-slate-100 text-[11.5px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status Baru</th>
                <th class="py-4.5 px-5 bg-slate-50/80 border-b-2 border-slate-100 text-[11.5px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Diubah Oleh</th>
                <th class="py-4.5 px-5 bg-slate-50/80 border-b-2 border-slate-100 text-[11.5px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Durasi Status</th>
                <th class="py-4.5 px-5 bg-slate-50/80 border-b-2 border-slate-100 text-[11.5px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Batas Ideal</th>
                <th class="py-4.5 px-5 bg-slate-50/80 border-b-2 border-slate-100 text-[11.5px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Skor KPI</th>
                <th class="py-4.5 px-5 bg-slate-50/80 border-b-2 border-slate-100 text-[11.5px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center last:rounded-tr-lg" style="width: 130px;">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <template v-for="log in filteredHistory" :key="log.history_id">
                <tr class="transition-colors hover:bg-slate-50/30">
                  <td class="py-4.5 px-5 align-middle"><span class="tracking-tight text-[13.5px] font-semibold text-slate-700">{{ formatTime(log.timestamp) }}</span></td>
                  <td class="py-4.5 px-5 align-middle">
                    <strong class="text-[13.5px] font-bold text-slate-900 block">Kamar {{ log.room_number }}</strong>
                    <div v-if="log.guest_name" class="mt-1 text-[11px] font-semibold text-blue-600">
                      <span>Tamu: {{ log.guest_name }}</span>
                      <span v-if="log.stay_start_date || log.stay_end_date" class="text-slate-400 block text-[10px] mt-0.5">
                        ({{ log.stay_start_date || '-' }} s/d {{ log.stay_end_date || '-' }})
                      </span>
                    </div>
                  </td>
                  <td class="py-4.5 px-5 align-middle">
                    <span class="inline-flex items-center justify-center px-3 py-1 rounded-lg text-[11px] font-extrabold text-white tracking-wide uppercase shadow-sm" :style="{ backgroundColor: getStatusColor(log.old_status) }">
                      {{ log.old_status }}
                    </span>
                  </td>
                  <td class="py-4.5 px-5 align-middle">
                    <span class="inline-flex items-center justify-center px-3 py-1 rounded-lg text-[11px] font-extrabold text-white tracking-wide uppercase shadow-sm" :style="{ backgroundColor: getStatusColor(log.new_status) }">
                      {{ log.new_status }}
                    </span>
                  </td>
                  <td class="py-4.5 px-5 text-[13.5px] font-medium text-slate-700 align-middle">{{ getStaffName(log.changed_by) }}</td>
                  <td class="py-4.5 px-5 align-middle">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[12px] font-bold text-slate-600 shadow-sm" v-if="log.duration_minutes">
                      <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ log.duration_minutes }} menit
                    </span>
                    <span v-else class="text-slate-400">-</span>
                  </td>
                  <td class="py-4.5 px-5 align-middle">
                    <span class="text-[13px] font-semibold text-slate-600" v-if="log.ideal_timer_minutes">
                      {{ log.ideal_timer_minutes }} menit
                    </span>
                    <span v-else class="text-slate-400">-</span>
                  </td>
                  <td class="py-4.5 px-5 align-middle">
                    <span v-if="log.kpi_score !== undefined && log.kpi_score !== null"
                          :class="['px-2.5 py-1 rounded-full text-[11px] font-black shadow-sm border', 
                            Number(log.kpi_score) >= 80 ? 'bg-green-50 text-green-600 border-green-200' :
                            Number(log.kpi_score) >= 50 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-red-50 text-red-600 border-red-200']">
                      {{ log.kpi_score }}
                    </span>
                    <span v-else class="text-slate-400">-</span>
                  </td>
                  <td class="py-4.5 px-5 align-middle whitespace-nowrap text-center">
                    <div class="inline-flex items-center gap-2">
                      <button 
                        v-if="getAssociatedChecklist(log)" 
                        @click="toggleRow(log.history_id)" 
                        class="w-[34px] h-[34px] rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                        :class="{ 'bg-blue-50 text-blue-600 border-blue-200': isRowExpanded(log.history_id) }"
                        :title="isRowExpanded(log.history_id) ? 'Tutup Detail' : 'Buka Detail'"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      
                      <button 
                        v-if="getAssociatedChecklist(log)" 
                        @click="triggerEdit(getAssociatedChecklist(log))" 
                        class="h-[34px] px-3.5 bg-white border border-slate-200 text-slate-600 font-bold text-[12px] rounded-xl hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors inline-flex items-center justify-center shadow-sm gap-1.5"
                      >
                        <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                        Edit
                      </button>
                      <span v-else class="text-slate-300 mx-auto">-</span>
                    </div>
                  </td>
                </tr>

                <!-- Accordion Dropdown Sub-Row -->
                <tr v-if="isRowExpanded(log.history_id) && getAssociatedChecklist(log)">
                  <td colspan="9" class="p-0 bg-slate-50/50 border-b border-slate-200">
                    <div class="p-6 border-l-4 border-l-blue-500">
                      <checklist-detail-viewer
                        :checklist="getAssociatedChecklist(log)"
                        :rooms="rooms"
                        :users="users"
                      ></checklist-detail-viewer>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="filteredHistory.length === 0">
                <td colspan="9" class="py-12 px-4 text-center text-slate-400 text-sm font-medium bg-slate-50/30">
                  Belum ada riwayat perubahan status kamar tercatat.
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <!-- Checklist Editor Modal -->
      <checklist-editor-modal
        :show="showChecklistModal"
        :checklist="editingChecklist"
        :rooms="rooms"
        :users="users"
        @close="showChecklistModal = false"
        @save="submitUpdateChecklist"
      ></checklist-editor-modal>
    </div>
  `
};
