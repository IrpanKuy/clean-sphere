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
        <div class="p-4 border-b border-slate-100 flex flex-wrap gap-4 bg-slate-50/50">
          <div class="flex flex-col gap-1 w-full sm:w-auto">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filter Bulan</label>
            <input type="month" v-model="filterMonth" class="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:border-primary-royal focus:ring-1 focus:ring-primary-royal">
          </div>
          <div class="flex flex-col gap-1 w-full sm:w-auto">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filter Staf</label>
            <select v-model="filterStaffId" class="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:border-primary-royal focus:ring-1 focus:ring-primary-royal min-w-[180px]">
              <option value="">Semua Staf</option>
              <option v-for="st in staffList" :key="st.user_id" :value="st.user_id">{{ st.name }}</option>
            </select>
          </div>
        </div>
        
        <div class="overflow-y-auto flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-if="filteredProjects.length === 0" class="col-span-full py-12 text-center text-slate-400">
            Tidak ada laporan proyek staf untuk filter ini.
          </div>
          
          <div v-for="proj in filteredProjects" :key="proj.work_project_id" class="border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md bg-white">
            <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-bold text-slate-800 line-clamp-1" :title="proj.title">{{ proj.title }}</h3>
            </div>
            
            <p class="text-xs text-slate-500 mb-4 line-clamp-3 min-h-[48px]">{{ proj.description || '-' }}</p>
            
            <div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-4 grid grid-cols-2 gap-2 border border-slate-100">
              <div>
                <span class="block text-slate-400 mb-0.5">Tanggal:</span>
                <span class="font-medium text-slate-800">{{ proj.date }}</span>
              </div>
              <div>
                <span class="block text-slate-400 mb-0.5">Staf:</span>
                <span class="font-medium text-slate-800">{{ getUserName(proj.staff_id) }}</span>
              </div>
              <div class="col-span-2 mt-1">
                <span class="block text-slate-400 mb-0.5">Periode:</span>
                <span class="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold border border-blue-100">{{ proj.period }}</span>
              </div>
            </div>

            <div class="mt-auto border-t border-slate-100 pt-3 flex flex-col gap-2">
              <div v-if="proj.photo_url" class="mb-1">
                <a :href="proj.photo_url" target="_blank" class="block rounded-lg overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow transition-all bg-slate-50">
                  <img :src="getDisplayPhotoUrl(proj.photo_url)" class="max-w-full max-h-[250px] object-contain rounded-lg mx-auto block bg-slate-100/50" alt="Foto Dokumentasi">
                </a>
                <span class="text-[10px] text-slate-400 mt-1 block text-center">Klik gambar untuk memperbesar</span>
              </div>
              <span v-else class="text-xs text-center text-slate-400 py-2 italic bg-slate-50 rounded-lg border border-slate-100">Tidak ada foto dokumentasi</span>
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
      filterMonth: '',
      filterStaffId: ''
    }
  },
  computed: {
    staffList() {
      return (this.users || []).filter(u => u.role === 'staff' && u.status === 'active');
    },
    filteredProjects() {
      let res = this.projects || [];
      if (this.filterMonth) {
        res = res.filter(p => (p.date || '').startsWith(this.filterMonth));
      }
      if (this.filterStaffId) {
        res = res.filter(p => String(p.staff_id) === String(this.filterStaffId));
      }
      return res.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  },
  methods: {
    getUserName(userId) {
      const u = (this.users || []).find(x => x.user_id === userId);
      return u ? u.name : userId;
    },
    getDisplayPhotoUrl(url) {
      if (!url) return '';
      const match = url.match(/id=([a-zA-Z0-9-_]+)/) || url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
      }
      return url;
    }
  }
};
