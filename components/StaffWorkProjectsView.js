const StaffWorkProjectsView = {
  template: `
    <div class="h-full flex flex-col space-y-6">
      
      <!-- HEADER -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Project Pekerjaan Staff</h2>
          <p class="text-sm text-slate-500 mt-1">
            Pantau inisiatif atau proyek khusus yang dikerjakan oleh staf.
          </p>
        </div>
      </div>

      <!-- CONTENT -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div class="p-4 border-b border-slate-100 flex gap-4">
          <input type="month" v-model="filterMonth" class="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary-royal focus:ring-1 focus:ring-primary-royal">
        </div>
        
        <div class="overflow-x-auto flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-if="filteredProjects.length === 0" class="col-span-full py-12 text-center text-slate-400">
            Tidak ada laporan proyek staf untuk filter bulan ini.
          </div>
          
          <div v-for="proj in filteredProjects" :key="proj.work_project_id" class="border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
            <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-bold text-slate-800 line-clamp-1" :title="proj.title">{{ proj.title }}</h3>
            </div>
            
            <p class="text-xs text-slate-500 mb-4 line-clamp-3 min-h-[48px]">{{ proj.description || '-' }}</p>
            
            <div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-4 grid grid-cols-2 gap-2">
              <div>
                <span class="block text-slate-400 mb-0.5">Tanggal:</span>
                <span class="font-medium">{{ proj.date }}</span>
              </div>
              <div>
                <span class="block text-slate-400 mb-0.5">Staf:</span>
                <span class="font-medium">{{ getUserName(proj.staff_id) }}</span>
              </div>
              <div class="col-span-2 mt-1">
                <span class="block text-slate-400 mb-0.5">Periode:</span>
                <span class="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">{{ proj.period }}</span>
              </div>
            </div>

            <div class="mt-auto border-t border-slate-100 pt-3 flex flex-col gap-2">
              <a v-if="proj.photo_url" :href="proj.photo_url" target="_blank" class="w-full text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1.5 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                Lihat Foto Dokumentasi
              </a>
              <span v-else class="text-xs text-center text-slate-400 py-2 italic">Tidak ada foto</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  props: ['projects', 'users'],
  emits: ['add-project', 'update-project'],
  data() {
    return {
      filterMonth: ''
    }
  },
  computed: {
    filteredProjects() {
      let res = this.projects || [];
      if (this.filterMonth) {
        res = res.filter(p => (p.date || '').startsWith(this.filterMonth));
      }
      return res.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  },
  methods: {
    getUserName(userId) {
      const u = (this.users || []).find(x => x.user_id === userId);
      return u ? u.name : userId;
    }
  }
};
