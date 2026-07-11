// =========================================================================
// VUE COMPONENT: DASHBOARD OVERVIEW
// =========================================================================
const DashboardOverview = {
  props: ['roomsSummary', 'totalRooms', 'staffActiveCount', 'averageKpi', 'criticalStockAlerts', 'recentActivities'],
  template: `
    <div class="flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
      
      <!-- Critical Stock Warning Ticker -->
      <div class="flex items-center gap-3 bg-amber-50 border border-amber-200 p-3 rounded-xl" v-if="criticalStockAlerts.length > 0">
        <span class="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-md whitespace-nowrap shadow-sm">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Peringatan
        </span>
        <span class="text-[13.5px] font-medium text-amber-900 leading-snug">Ada {{ criticalStockAlerts.length }} barang di bawah stok minimum harian: <strong class="font-bold">{{ criticalStockAlerts.join(', ') }}</strong></span>
      </div>

      <!-- Top Metric Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        <!-- Card 1: Total Kamar -->
        <div class="bg-white p-5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex justify-between items-center transition-transform hover:-translate-y-1">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Kamar</span>
            <div class="flex items-baseline gap-2">
              <span class="text-[28px] font-extrabold text-slate-900 leading-none">{{ totalRooms }}</span>
            </div>
          </div>
          <div class="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0 bg-blue-100 text-blue-600 shadow-sm">
            <svg class="w-[26px] h-[26px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M2.25 21h19.5M3 10h1.5M3 6.5h1.5M3 13.5h1.5M19.5 6.5h1.5M19.5 10h1.5M19.5 13.5h1.5" />
            </svg>
          </div>
        </div>

        <!-- Card 2: Kamar Bersih -->
        <div class="bg-white p-5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex justify-between items-center transition-transform hover:-translate-y-1">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Kamar Bersih (VC)</span>
            <div class="flex items-baseline gap-2">
              <span class="text-[28px] font-extrabold text-slate-900 leading-none">{{ roomsSummary.VC || 0 }}</span>
            </div>
          </div>
          <div class="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600 shadow-sm">
            <svg class="w-[26px] h-[26px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
        </div>

        <!-- Card 3: Kamar Kotor -->
        <div class="bg-white p-5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex justify-between items-center transition-transform hover:-translate-y-1">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Kamar Kotor (VD)</span>
            <div class="flex items-baseline gap-2">
              <span class="text-[28px] font-extrabold text-slate-900 leading-none">{{ roomsSummary.VD || 0 }}</span>
            </div>
          </div>
          <div class="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0 bg-red-100 text-red-600 shadow-sm">
            <svg class="w-[26px] h-[26px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        <!-- Card 4: Staf Aktif -->
        <div class="bg-white p-5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex justify-between items-center transition-transform hover:-translate-y-1">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Staf Aktif</span>
            <div class="flex items-baseline gap-2">
              <span class="text-[28px] font-extrabold text-slate-900 leading-none">{{ staffActiveCount }}</span>
            </div>
          </div>
          <div class="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0 bg-purple-100 text-purple-600 shadow-sm">
            <svg class="w-[26px] h-[26px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A9.342 9.342 0 0112.428 20c-1.808 0-3.5-.507-4.945-1.388m.022-.012A9.384 9.384 0 017.375 19.5a9.384 9.384 0 01-2.625-.372 4.125 4.125 0 01-7.533 2.493M4.5 19.128v-.003c0-1.113.285-2.16.786-3.07M15 7.5a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Donut Chart & General KPI Metrics -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full">
        <!-- Room Status Cleanliness Trend -->
        <div class="bg-white p-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col">
          <h3 class="text-[17px] font-extrabold text-slate-900 mb-6 tracking-tight">Room Cleanliness Trend</h3>
          
          <div class="flex flex-col sm:flex-row items-center gap-8 justify-center h-full">
            <div class="w-[160px] h-[160px] rounded-full flex items-center justify-center shrink-0 border-[16px] border-emerald-500 border-r-emerald-500 border-b-blue-500 border-l-red-500 bg-white">
              <div class="flex flex-col items-center justify-center text-center">
                <span class="text-3xl font-black text-slate-900 leading-none">{{ totalCleanedToday }}</span>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cleaned Today</span>
              </div>
            </div>

            <div class="flex flex-col gap-4">
              <div class="flex flex-col">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span class="text-[13px] font-semibold text-slate-500">VC (Vacant Clean)</span>
                </div>
                <strong class="text-[15px] font-bold text-slate-900 ml-4.5">{{ roomsSummary.VC || 0 }} Kamar</strong>
              </div>
              <div class="flex flex-col">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                  <span class="text-[13px] font-semibold text-slate-500">VD (Vacant Dirty)</span>
                </div>
                <strong class="text-[15px] font-bold text-slate-900 ml-4.5">{{ roomsSummary.VD || 0 }} Kamar</strong>
              </div>
              <div class="flex flex-col">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span class="text-[13px] font-semibold text-slate-500">OC (Occupied Clean)</span>
                </div>
                <strong class="text-[15px] font-bold text-slate-900 ml-4.5">{{ roomsSummary.OC || 0 }} Kamar</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Global KPI Performance Display -->
        <div class="bg-gradient-to-br from-primary-navy to-primary-royal p-7 rounded-2xl shadow-[0_10px_25px_-5px_rgba(37,99,235,0.2)] text-white flex flex-col justify-between">
          <h3 class="text-[17px] font-extrabold text-white mb-6 tracking-tight">Housekeeping KPI Score</h3>
          <div class="flex items-center gap-6 pb-2">
            <div class="w-[100px] h-[100px] rounded-full border-8 border-white/20 border-t-white flex items-center justify-center shrink-0">
              <div class="text-[28px] font-black tracking-tighter">{{ averageKpi }}<span class="text-base">%</span></div>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-lg font-bold leading-tight">Rata-rata target harian tercapai.</p>
              <p class="text-[13px] text-blue-100 leading-relaxed font-medium">Berdasarkan penyelesaian checklist kebersihan RACS per kamar oleh staf secara real-time.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity Table -->
      <div class="bg-white p-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full overflow-hidden">
        <h3 class="text-[17px] font-extrabold text-slate-900 mb-6 tracking-tight">Recent Housekeeping Activities</h3>
        
        <div class="overflow-x-auto w-full custom-scrollbar">
          <table class="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr>
              <th class="py-3 px-4 bg-slate-50 border-b-2 border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider first:rounded-tl-lg">Staf Karyawan</th>
              <th class="py-3 px-4 bg-slate-50 border-b-2 border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">Aktivitas Kerja</th>
              <th class="py-3 px-4 bg-slate-50 border-b-2 border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu Laporan</th>
              <th class="py-3 px-4 bg-slate-50 border-b-2 border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">Keterangan</th>
              <th class="py-3 px-4 bg-slate-50 border-b-2 border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider last:rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="act in recentActivities" :key="act.id" class="transition-colors hover:bg-slate-50/50">
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <strong class="text-[13.5px] font-bold text-slate-900">{{ act.staff_name }}</strong>
                </div>
              </td>
              <td class="py-3.5 px-4 text-[13.5px] font-semibold text-slate-800">{{ act.activity }}</td>
              <td class="py-3.5 px-4 text-[13.5px] font-medium text-slate-600">{{ act.timestamp }}</td>
              <td class="py-3.5 px-4 text-[13px] font-medium text-slate-500 max-w-[200px] truncate" :title="act.details">{{ act.details }}</td>
              <td class="py-3.5 px-4">
                <span :class="['inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border', getStatusClass(act.status)]">
                  {{ act.status }}
                </span>
              </td>
            </tr>
            <tr v-if="recentActivities.length === 0">
              <td colspan="5" class="py-10 px-4 text-center text-slate-400 text-sm font-medium">
                Belum ada aktivitas terekam hari ini.
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

    </div>
  `,
  computed: {
    totalCleanedToday() {
      return (this.roomsSummary.VC || 0) + (this.roomsSummary.OC || 0);
    }
  },
  methods: {
    getStatusClass(status) {
      switch (String(status).toLowerCase()) {
        case 'completed':
        case 'approved':
        case 'done':
          return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'pending':
        case 'in progress':
          return 'bg-amber-50 text-amber-700 border-amber-200';
        default:
          return 'bg-slate-100 text-slate-600 border-slate-200';
      }
    }
  }
};
