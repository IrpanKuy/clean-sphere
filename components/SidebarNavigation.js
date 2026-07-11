// =========================================================================
// VUE COMPONENT: SIDEBAR NAVIGATION
// =========================================================================
const SidebarNavigation = {
  props: ['activeMenu', 'activeSubmenu', 'currentUser', 'isSidebarOpen'],
  emits: ['set-menu', 'toggle-menu', 'set-submenu', 'logout', 'close-sidebar'],
  template: `
    <aside :class="['sidebar-v2', { open: isSidebarOpen }]">
      <div class="sidebar-header-v2">
        <div class="brand-logo">
          <svg class="icon-svg-flat text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
          <span class="brand-text">CleanSphere<span class="brand-sub">Pro</span></span>
        </div>
        <button class="btn-close-sidebar-mobile" @click="$emit('close-sidebar')">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="user-profile-summary">
        <div class="profile-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div class="profile-info">
          <div class="profile-name">{{ currentUser?.name || 'Manager' }}</div>
          <div class="profile-role">Administrator</div>
        </div>
      </div>

      <nav class="sidebar-nav-list">
        <!-- Dashboard Overview Link -->
        <a href="#" :class="['nav-link-v2', { active: activeSubmenu === 'overview' }]" @click.prevent="$emit('set-menu', null, 'overview')">
          <svg class="icon-svg-flat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span class="link-label">Dashboard Utama</span>
        </a>

        <!-- Menu Section: Room Control -->
        <div class="nav-section-container">
          <button :class="['nav-section-header', { active: activeMenu === 'room' }]" @click="$emit('toggle-menu', 'room', 'room-grid')">
            <div class="header-left">
              <svg class="icon-svg-flat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M2.25 21h19.5M3 10h1.5M3 6.5h1.5M3 13.5h1.5M19.5 6.5h1.5M19.5 10h1.5M19.5 13.5h1.5M6 6.75h.008v.008H6V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM6 10h.008v.008H6V10zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM6 13.25h.008v.008H6v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 3.25a.375.375 0 11-.75 0 .375.375 0 01.75 0zM6 16.5h.008v.008H6V16.5zm12-9.75h.008v.008H18V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM18 10h.008v.008H18V10zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-11.625 6.5h.008v.008H6.375v-.008zm11.625-3.25h.008v.008H18v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span>Room Control Sheets</span>
            </div>
            <svg class="chevron-arrow" :class="{ rotated: activeMenu === 'room' }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <div class="nav-section-body" v-show="activeMenu === 'room'">
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'room-grid' }]" @click.prevent="$emit('set-submenu', 'room-grid')">Room Grid View</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'room-history' }]" @click.prevent="$emit('set-submenu', 'room-history')">Riwayat Status Kamar</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'room-assignments' }]" @click.prevent="$emit('set-submenu', 'room-assignments')">Tugas Staff</a>
          </div>
        </div>

        <!-- Menu Section: Area Control -->
        <div class="nav-section-container">
          <button :class="['nav-section-header', { active: activeMenu === 'area' }]" @click="$emit('toggle-menu', 'area', 'areas-data')">
            <div class="header-left">
              <svg class="icon-svg-flat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8m.75-12h-7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25z" />
              </svg>
              <span>Area Control Sheets</span>
            </div>
            <svg class="chevron-arrow" :class="{ rotated: activeMenu === 'area' }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <div class="nav-section-body" v-show="activeMenu === 'area'">
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'areas-data' }]" @click.prevent="$emit('set-submenu', 'areas-data')">Data Area</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'area-shifts' }]" @click.prevent="$emit('set-submenu', 'area-shifts')">Konfigurasi Shift Area</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'staff-area-tasks' }]" @click.prevent="$emit('set-submenu', 'staff-area-tasks')">Penugasan Staf Area</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'area-tasks-daily' }]" @click.prevent="$emit('set-submenu', 'area-tasks-daily')">Laporan Harian Area</a>
          </div>
        </div>

        <!-- Menu Section: Inventory -->
        <div class="nav-section-container">
          <button :class="['nav-section-header', { active: activeMenu === 'inventory' }]" @click="$emit('toggle-menu', 'inventory', 'inventory-stock')">
            <div class="header-left">
              <svg class="icon-svg-flat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <span>Manajemen Inventaris</span>
            </div>
            <svg class="chevron-arrow" :class="{ rotated: activeMenu === 'inventory' }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <div class="nav-section-body" v-show="activeMenu === 'inventory'">
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'inventory-stock' }]" @click.prevent="$emit('set-submenu', 'inventory-stock')">Stok Barang</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'inventory-log' }]" @click.prevent="$emit('set-submenu', 'inventory-log')">Mutasi Stok</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'inventory-categories' }]" @click.prevent="$emit('set-submenu', 'inventory-categories')">Konfigurasi Kategori</a>
          </div>
        </div>

        <!-- Menu Section: Projects -->
        <div class="nav-section-container">
          <button :class="['nav-section-header', { active: activeMenu === 'projects' }]" @click="$emit('toggle-menu', 'projects', 'housekeeping-projects')">
            <div class="header-left">
              <svg class="icon-svg-flat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3c.235-.083.487-.128.75-.128H19.5a2.25 2.25 0 012.25 2.25v.878m0 0c-.235-.083-.487-.128-.75-.128H4.5m15 0a2.25 2.25 0 00-2.25 2.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V11.25M3.75 16.5h16.5M12 12v3.75m-3.75-3.75v3.75m7.5-3.75v3.75" />
              </svg>
              <span>HouseKeeping Projects</span>
            </div>
            <svg class="chevron-arrow" :class="{ rotated: activeMenu === 'projects' }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <div class="nav-section-body" v-show="activeMenu === 'projects'">
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'housekeeping-projects' }]" @click.prevent="$emit('set-submenu', 'housekeeping-projects')">HouseKeeping Project</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'staff-work-projects' }]" @click.prevent="$emit('set-submenu', 'staff-work-projects')">Proyek Pekerjaan Staff</a>
          </div>
        </div>

        <!-- Menu Section: Staffing -->
        <div class="nav-section-container">
          <button :class="['nav-section-header', { active: activeMenu === 'staff' }]" @click="$emit('toggle-menu', 'staff', 'staff-accounts')">
            <div class="header-left">
              <svg class="icon-svg-flat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span>Pengaturan Staff & Shift</span>
            </div>
            <svg class="chevron-arrow" :class="{ rotated: activeMenu === 'staff' }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <div class="nav-section-body" v-show="activeMenu === 'staff'">
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'staff-accounts' }]" @click.prevent="$emit('set-submenu', 'staff-accounts')">Data Karyawan & Akun</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'leave-approvals' }]" @click.prevent="$emit('set-submenu', 'leave-approvals')">Persetujuan Izin & Cuti</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'shift-config' }]" @click.prevent="$emit('set-submenu', 'shift-config')">Shift Kerja</a>
            <a href="#" :class="['sub-link', { active: activeSubmenu === 'attendance-kpi-report' }]" @click.prevent="$emit('set-submenu', 'attendance-kpi-report')">Laporan Absensi & KPI</a>
          </div>
        </div>

        <!-- Menu Section: Settings -->
        <a href="#" :class="['nav-link-v2', { active: activeSubmenu === 'app-settings' }]" @click.prevent="$emit('set-menu', null, 'app-settings')">
          <svg class="icon-svg-flat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="link-label">Pengaturan</span>
        </a>
      </nav>

      <div class="sidebar-footer-v2">
        <button class="btn-logout-v2" @click="$emit('logout')">
          <svg class="icon-svg-flat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M19 12H9m10 0l-3-3m3 3l-3 3" />
          </svg>
          <span>Keluar Sesi</span>
        </button>
      </div>
    </aside>
  `
};
