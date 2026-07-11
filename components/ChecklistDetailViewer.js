// =========================================================================
// VUE COMPONENT: CHECKLIST DETAIL VIEWER (DROPDOWN PANELS)
// =========================================================================
const ChecklistDetailViewer = {
  props: ['checklist', 'rooms', 'users'],
  computed: {
    parsedDetails() {
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

      const categories = [];
      for (let cat in masterConfig) {
        const catCfg = masterConfig[cat];
        const catType = catCfg.type || 'checklist';
        const items = catCfg.items || [];
        let isAnyFilled = false;
        
        const itemDetails = items.map(item => {
          if (catType === 'checklist') {
            const catVal = subTasks[cat] || {};
            const isChecked = catVal[item] === true || catVal[item] === "true";
            if (isChecked) isAnyFilled = true;
            return { 
              name: item, 
              checked: isChecked,
              value: isChecked ? 'Ya / Lengkap' : 'Tidak' 
            };
          } else if (catType === 'inout') {
            const catVal = subLinen[cat] || {};
            const val = catVal[item] || { in: 0, out: 0 };
            if (val.in > 0 || val.out > 0) isAnyFilled = true;
            return { 
              name: item, 
              value: `Kotor: ${val.out} | Bersih: ${val.in}` 
            };
          } else if (catType === 'in') {
            const catVal = subRefill[cat] || {};
            const itemVal = catVal[item] || 0;
            const valIn = typeof itemVal === 'object' ? (itemVal.in || 0) : itemVal;
            if (valIn > 0) isAnyFilled = true;
            return { 
              name: item, 
              value: `Refill: ${valIn}` 
            };
          }
        });

        categories.push({
          name: cat,
          type: catType,
          items: itemDetails,
          hasPengerjaan: isAnyFilled
        });
      }
      return categories;
    }
  },
  template: `
    <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full mt-4 overflow-hidden">
      <div class="bg-slate-50 border-b border-slate-100 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <span class="text-[13.5px] font-medium text-slate-700 flex items-center gap-2">
          <strong class="font-bold text-slate-900">KPI Nilai Skor:</strong> 
          <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
            {{ checklist.kpi_score }} / 100
          </span>
        </span>
        <span class="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
          <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Waktu Kerja: <strong class="text-slate-700">{{ checklist.start_time }} - {{ checklist.end_time }}</strong> ({{ checklist.duration_minutes }} menit)
        </span>
      </div>
      
      <div class="p-5 flex gap-5 overflow-x-auto custom-scrollbar">
        <div v-for="cat in parsedDetails" :key="cat.name" class="flex-1 min-w-[280px] bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex flex-col transition-colors" :class="{ 'opacity-60 bg-slate-50/50': !cat.hasPengerjaan }">
          <div class="px-4 py-3 border-b border-slate-200 bg-slate-100/50 flex flex-col gap-1">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[13.5px] font-bold text-slate-800">{{ cat.name }}</span>
              <span class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600">
                {{ cat.type }}
              </span>
            </div>
            <span v-if="!cat.hasPengerjaan" class="text-[11.5px] font-semibold text-rose-500">- Kosong/Tidak diisi</span>
          </div>
          
          <ul class="flex flex-col p-2 m-0 list-none">
            <li v-for="item in cat.items" :key="item.name" class="flex justify-between items-center py-2 px-3 hover:bg-white rounded-lg transition-colors border-b border-slate-100/50 last:border-0">
              <span class="text-[13px] font-medium text-slate-600">{{ item.name }}:</span>
              <span class="text-[13px] font-bold text-slate-800 flex items-center gap-1.5 text-right">
                <!-- Flat inline SVGs for checklist indicators -->
                <span v-if="cat.type === 'checklist'" class="flex items-center gap-1.5">
                  <svg v-if="item.checked" class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span :class="item.checked ? 'text-emerald-700' : 'text-rose-600'">{{ item.value }}</span>
                </span>
                <span v-else class="text-slate-700">
                  {{ item.value }}
                </span>
              </span>
            </li>
          </ul>
        </div>
      </div>
      
      <div v-if="parsedDetails.length === 0" class="py-10 px-5 text-center flex flex-col items-center justify-center text-slate-500 text-[13.5px] font-medium gap-2">
        <span class="text-2xl">⚠️</span>
        Kamar ini tidak memiliki konfigurasi checklist pengerjaan.
      </div>
    </div>
  `
};
