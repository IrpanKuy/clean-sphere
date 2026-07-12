// =========================================================================
// VUE COMPONENT: CHECKLIST EDITOR MODAL
// =========================================================================
const ChecklistEditorModal = {
  props: ['checklist', 'rooms', 'users', 'show'],
  emits: ['close', 'save'],
  data() {
    return {
      editingUiCategories: [],
      editingChecklist: {}
    };
  },
  watch: {
    show: {
      immediate: true,
      handler(newVal) {
        if (newVal && this.checklist) {
          this.initializeEditor();
        }
      }
    }
  },
  methods: {
    getStaffName(id) {
      const u = this.users.find(x => x.user_id === id);
      return u ? u.name : id || 'Staff';
    },
    initializeEditor() {
      this.editingChecklist = JSON.parse(JSON.stringify(this.checklist));
      
      const roomObj = this.rooms.find(r => String(r.room_number) === String(this.checklist.room_number));
      let masterConfig = {};
      if (roomObj && roomObj.checklist_config) {
        try {
          masterConfig = JSON.parse(roomObj.checklist_config);
        } catch (e) {
          console.warn(e);
        }
      }

      let subTasks = {};
      try { subTasks = JSON.parse(this.checklist.tasks_completed || "{}"); } catch(e){}
      let subLinen = {};
      try { subLinen = JSON.parse(this.checklist.linen_changed || "{}"); } catch(e){}
      let subRefill = {};
      try { subRefill = JSON.parse(this.checklist.refills || "{}"); } catch(e){}

      const uiCategories = [];
      for (let cat in masterConfig) {
        const catCfg = masterConfig[cat];
        const catType = catCfg.type || 'checklist';
        const items = catCfg.items || [];
        
        const uiItems = items.map(item => {
          if (catType === 'checklist') {
            const catVal = subTasks[cat] || {};
            const isChecked = catVal[item] === true || catVal[item] === "true";
            return { name: item, checked: isChecked };
          } else if (catType === 'inout') {
            const catVal = subLinen[cat] || {};
            const itemVal = catVal[item] || {};
            return { 
              name: item, 
              in: parseInt(itemVal.in, 10) || 0, 
              out: parseInt(itemVal.out, 10) || 0 
            };
          } else if (catType === 'in') {
            const catVal = subRefill[cat] || {};
            const itemVal = catVal[item] || {};
            let valIn = 0;
            if (typeof itemVal === 'object') {
              valIn = parseInt(itemVal.in, 10) || 0;
            } else {
              valIn = parseInt(itemVal, 10) || 0;
            }
            return { 
              name: item, 
              in: valIn
            };
          }
        });

        uiCategories.push({
          name: cat,
          type: catType,
          items: uiItems
        });
      }
      this.editingUiCategories = uiCategories;
    },
    submitUpdate() {
      const tasksObj = {};
      const linenObj = {};
      const refillObj = {};

      this.editingUiCategories.forEach(cat => {
        if (cat.type === 'checklist') {
          tasksObj[cat.name] = {};
          cat.items.forEach(item => {
            tasksObj[cat.name][item.name] = item.checked;
          });
        } else if (cat.type === 'inout') {
          linenObj[cat.name] = {};
          cat.items.forEach(item => {
            linenObj[cat.name][item.name] = {
              in: parseInt(item.in, 10) || 0,
              out: parseInt(item.out, 10) || 0
            };
          });
        } else if (cat.type === 'in') {
          refillObj[cat.name] = {};
          cat.items.forEach(item => {
            refillObj[cat.name][item.name] = {
              in: parseInt(item.in, 10) || 0
            };
          });
        }
      });

      // Recalculate KPI score
      let totalTasks = 0;
      let completedCount = 0;

      this.editingUiCategories.forEach(cat => {
        if (cat.type === 'checklist') {
          cat.items.forEach(item => {
            totalTasks++;
            if (item.checked) completedCount++;
          });
        } else if (cat.type === 'inout') {
          cat.items.forEach(item => {
            totalTasks++;
            if (item.in > 0 || item.out > 0) completedCount++;
          });
        } else if (cat.type === 'in') {
          cat.items.forEach(item => {
            totalTasks++;
            if (item.in > 0) completedCount++;
          });
        }
      });

      if (totalTasks === 0) totalTasks = 1;
      const completionScore = (completedCount / totalTasks) * 70;

      let efficiencyScore = 30;
      const duration = this.editingChecklist.duration_minutes || 0;
      const targetMins = 15;
      if (duration > targetMins) {
        efficiencyScore = Math.max(0, 30 - (duration - targetMins) * 2);
      }
      const kpiScore = Number((completionScore + efficiencyScore).toFixed(2));

      this.$emit('save', {
        checklist_id: this.editingChecklist.checklist_id,
        tasks_completed: tasksObj,
        linen_changed: linenObj,
        refills: refillObj,
        kpi_score: kpiScore
      });
    }
  },
  template: `
    <div class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" v-if="show">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] flex flex-col relative">
        <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 class="text-lg font-extrabold text-slate-900">Detail & Edit Laporan Pembersihan</h3>
          <button class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500" @click="$emit('close')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form @submit.prevent="submitUpdate" class="flex flex-col gap-6 p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-[13.5px] font-medium text-slate-700">
            <div><strong class="text-slate-900 font-bold">Kamar:</strong> {{ editingChecklist.room_number }}</div>
            <div><strong class="text-slate-900 font-bold">Petugas:</strong> {{ getStaffName(editingChecklist.staff_id) }}</div>
            <div><strong class="text-slate-900 font-bold">Tanggal:</strong> {{ editingChecklist.date }}</div>
            <div><strong class="text-slate-900 font-bold">Durasi:</strong> {{ editingChecklist.start_time }} - {{ editingChecklist.end_time }} ({{ editingChecklist.duration_minutes }}m)</div>
          </div>

          <div class="flex flex-col gap-5">
            <div v-for="cat in editingUiCategories" :key="cat.name" class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                <h5 class="text-[14.5px] font-bold text-slate-900 m-0">
                  {{ cat.name }} 
                  <span class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 ml-1">
                    {{ cat.type }}
                  </span>
                </h5>
              </div>
              
              <div class="flex flex-col p-2">
                <!-- Checklist Checkboxes -->
                <div v-if="cat.type === 'checklist'" v-for="item in cat.items" :key="item.name" class="flex items-center px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 rounded-lg transition-colors">
                  <label class="flex items-center gap-3 cursor-pointer select-none w-full">
                    <div class="relative flex items-center justify-center">
                      <input type="checkbox" v-model="item.checked" class="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded focus:ring-4 focus:ring-blue-500/20 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer">
                      <svg class="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                      </svg>
                    </div>
                    <span class="text-[14px] font-medium text-slate-700 peer-checked:text-slate-900">{{ item.name }}</span>
                  </label>
                </div>

                <!-- InOut Linen -->
                <div v-if="cat.type === 'inout'" v-for="item in cat.items" :key="item.name" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 rounded-lg transition-colors">
                  <span class="text-[14px] font-medium text-slate-700">{{ item.name }}</span>
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                      <label class="text-[12px] font-bold text-slate-500 uppercase">Out (Kotor):</label>
                      <input type="number" v-model.number="item.out" min="0" class="w-[60px] h-[36px] px-2 text-center bg-white border border-slate-200 rounded-lg text-[13.5px] font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
                    </div>
                    <div class="flex items-center gap-2">
                      <label class="text-[12px] font-bold text-slate-500 uppercase">In (Bersih):</label>
                      <input type="number" v-model.number="item.in" min="0" class="w-[60px] h-[36px] px-2 text-center bg-white border border-slate-200 rounded-lg text-[13.5px] font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
                    </div>
                  </div>
                </div>

                <!-- In Refill -->
                <div v-if="cat.type === 'in'" v-for="item in cat.items" :key="item.name" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 rounded-lg transition-colors">
                  <span class="text-[14px] font-medium text-slate-700">{{ item.name }}</span>
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                      <label class="text-[12px] font-bold text-slate-500 uppercase">In (Refill):</label>
                      <input type="number" v-model.number="item.in" min="0" class="w-[60px] h-[36px] px-2 text-center bg-white border border-slate-200 rounded-lg text-[13.5px] font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="editingUiCategories.length === 0" class="py-10 px-5 text-center flex flex-col items-center justify-center text-slate-500 text-[13.5px] font-medium bg-slate-50 rounded-xl border border-slate-100">
              <span class="text-2xl mb-2">⚠️</span>
              Kamar ini tidak memiliki konfigurasi checklist beranak.
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" class="h-[42px] px-5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-colors" @click="$emit('close')">Batal / Tutup</button>
            <button type="submit" class="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 mr-1.5 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  `
};
