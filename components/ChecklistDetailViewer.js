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
    <div class="checklist-detail-dropdown-panel">
      <div class="kpi-score-badge-row">
        <span>
          <strong>KPI Nilai Skor:</strong> 
          <span class="badge-status status-process" style="padding: 2px 6px;">{{ checklist.kpi_score }} / 100</span>
        </span>
        <span class="flex items-center gap-1">
          <svg class="w-4 h-4 text-gray-500 inline-block" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Waktu Kerja: {{ checklist.start_time }} - {{ checklist.end_time }} ({{ checklist.duration_minutes }} menit)
        </span>
      </div>
      <div class="details-grid-container">
        <div v-for="cat in parsedDetails" :key="cat.name" class="detail-cat-column" :class="{ 'not-filled-cat': !cat.hasPengerjaan }">
          <div class="detail-cat-header">
            {{ cat.name }} 
            <span class="badge-type">({{ cat.type }})</span>
            <span v-if="!cat.hasPengerjaan" class="badge-empty">- Kosong/Tidak diisi</span>
          </div>
          <ul class="detail-items-list-view">
            <li v-for="item in cat.items" :key="item.name">
              <span class="detail-item-name">{{ item.name }}:</span>
              <span class="detail-item-val flex items-center gap-1">
                <!-- Flat inline SVGs for checklist indicators -->
                <span v-if="cat.type === 'checklist'" class="flex items-center">
                  <svg v-if="item.checked" class="w-4 h-4 text-emerald-600 inline mr-1" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-rose-600 inline mr-1" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {{ item.value }}
                </span>
                <span v-else>
                  {{ item.value }}
                </span>
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div v-if="parsedDetails.length === 0" class="no-details-text">
        ⚠️ Kamar ini tidak memiliki konfigurasi checklist pengerjaan.
      </div>
    </div>
  `
};
