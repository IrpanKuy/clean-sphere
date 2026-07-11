// =========================================================================
// VUE COMPONENT: DASHBOARD OVERVIEW
// =========================================================================
const DashboardOverview = {
  props: ['roomsSummary', 'totalRooms', 'staffActiveCount', 'averageKpi', 'criticalStockAlerts', 'recentActivities'],
  template: `
    <div class="overview-container">
      
      <!-- Critical Stock Warning Ticker -->
      <div class="alert-ticker" v-if="criticalStockAlerts.length > 0">
        <span class="ticker-badge">
          <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Pemberitahuan
        </span>
        <span>Ada {{ criticalStockAlerts.length }} barang di bawah stok minimum harian: <strong>{{ criticalStockAlerts.join(', ') }}</strong></span>
      </div>

      <!-- Top Metric Grid -->
      <div class="metrics-grid">
        <!-- Card 1: Total Kamar -->
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Total Kamar</span>
            <div class="metric-value-row">
              <span class="metric-number">{{ totalRooms }}</span>
            </div>
          </div>
          <div class="metric-icon-box bg-blue">
            <svg class="icon-svg-flat" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M2.25 21h19.5M3 10h1.5M3 6.5h1.5M3 13.5h1.5M19.5 6.5h1.5M19.5 10h1.5M19.5 13.5h1.5" />
            </svg>
          </div>
        </div>

        <!-- Card 2: Kamar Bersih -->
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Kamar Bersih (VC)</span>
            <div class="metric-value-row">
              <span class="metric-number">{{ roomsSummary.VC || 0 }}</span>
            </div>
          </div>
          <div class="metric-icon-box bg-emerald">
            <svg class="icon-svg-flat" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
        </div>

        <!-- Card 3: Kamar Kotor -->
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Kamar Kotor (VD)</span>
            <div class="metric-value-row">
              <span class="metric-number">{{ roomsSummary.VD || 0 }}</span>
            </div>
          </div>
          <div class="metric-icon-box bg-red">
            <svg class="icon-svg-flat" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        <!-- Card 4: Staf Aktif -->
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Staf Aktif</span>
            <div class="metric-value-row">
              <span class="metric-number">{{ staffActiveCount }}</span>
            </div>
          </div>
          <div class="metric-icon-box bg-purple">
            <svg class="icon-svg-flat" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A9.342 9.342 0 0112.428 20c-1.808 0-3.5-.507-4.945-1.388m.022-.012A9.384 9.384 0 017.375 19.5a9.384 9.384 0 01-2.625-.372 4.125 4.125 0 01-7.533 2.493M4.5 19.128v-.003c0-1.113.285-2.16.786-3.07M15 7.5a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Donut Chart & General KPI Metrics -->
      <div class="visual-sections">
        <!-- Room Status Cleanliness Trend -->
        <div class="card chart-card">
          <h3 class="card-title">Room Cleanliness Trend</h3>
          
          <div class="chart-content">
            <div class="donut-circle">
              <div class="donut-inner">
                <span class="donut-num">{{ totalCleanedToday }}</span>
                <span class="donut-label">Cleaned Today</span>
              </div>
            </div>

            <div class="legend-list">
              <div class="legend-item">
                <span class="dot bg-clean"></span>
                <span class="legend-name">VC (Vacant Clean)</span>
                <strong class="legend-val">{{ roomsSummary.VC || 0 }} Kamar</strong>
              </div>
              <div class="legend-item">
                <span class="dot bg-dirty"></span>
                <span class="legend-name">VD (Vacant Dirty)</span>
                <strong class="legend-val">{{ roomsSummary.VD || 0 }} Kamar</strong>
              </div>
              <div class="legend-item">
                <span class="dot bg-occupied"></span>
                <span class="legend-name">OC (Occupied Clean)</span>
                <strong class="legend-val">{{ roomsSummary.OC || 0 }} Kamar</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Global KPI Performance Display -->
        <div class="card kpi-card">
          <h3 class="card-title">Housekeeping KPI Score</h3>
          <div class="kpi-value-container">
            <div class="kpi-radial">
              <div class="kpi-radial-text">{{ averageKpi }}%</div>
            </div>
            <div class="kpi-description">
              <p class="desc-main">Rata-rata target harian tercapai.</p>
              <p class="desc-sub">Berdasarkan penyelesaian checklist kebersihan RACS per kamar oleh staf.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity Table -->
      <div class="card table-card">
        <h3 class="card-title">Recent Housekeeping Activities</h3>
        
        <table>
          <thead>
            <tr>
              <th>Staf Karyawan</th>
              <th>Aktivitas Kerja</th>
              <th>Waktu Laporan</th>
              <th>Keterangan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="act in recentActivities" :key="act.id">
              <td>
                <div class="table-user">
                  <div class="avatar-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <strong>{{ act.staff_name }}</strong>
                </div>
              </td>
              <td>{{ act.activity }}</td>
              <td>{{ act.timestamp }}</td>
              <td class="text-muted">{{ act.details }}</td>
              <td>
                <span :class="['badge-status', getStatusClass(act.status)]">
                  {{ act.status }}
                </span>
              </td>
            </tr>
            <tr v-if="recentActivities.length === 0">
              <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
                Belum ada aktivitas terekam hari ini.
              </td>
            </tr>
          </tbody>
        </table>
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
          return 'status-done';
        case 'pending':
        case 'in progress':
          return 'status-process';
        default:
          return 'status-pending';
      }
    }
  }
};
