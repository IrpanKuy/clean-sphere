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
    <div class="modal-overlay-v2" v-if="show">
      <div class="modal-box-v2" style="max-width: 600px;">
        <div class="modal-header-v2">
          <h3>Detail & Edit Laporan Pembersihan</h3>
          <button class="btn-close-modal" @click="$emit('close')">
            <svg style="width: 20px; height: 20px; color: var(--text-muted);" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form @submit.prevent="submitUpdate" class="modal-body-v2">
          <div class="checklist-meta-grid">
            <div><strong>Kamar:</strong> Kamar {{ editingChecklist.room_number }}</div>
            <div><strong>Petugas:</strong> {{ getStaffName(editingChecklist.staff_id) }}</div>
            <div><strong>Tanggal:</strong> {{ editingChecklist.date }}</div>
            <div><strong>Durasi:</strong> {{ editingChecklist.start_time }} - {{ editingChecklist.end_time }} ({{ editingChecklist.duration_minutes }}m)</div>
          </div>

          <div class="checklist-items-editor">
            <div v-for="cat in editingUiCategories" :key="cat.name" class="editor-category-card">
              <h5 class="editor-category-title">
                {{ cat.name }} <span class="badge-type">({{ cat.type }})</span>
              </h5>
              
              <div class="editor-items-list">
                <!-- Checklist Checkboxes -->
                <div v-if="cat.type === 'checklist'" v-for="item in cat.items" :key="item.name" class="editor-item-row-checkbox">
                  <label class="checkbox-container">
                    <input type="checkbox" v-model="item.checked">
                    <span class="checkbox-label">{{ item.name }}</span>
                  </label>
                </div>

                <!-- InOut Linen -->
                <div v-if="cat.type === 'inout'" v-for="item in cat.items" :key="item.name" class="editor-item-row-numeric">
                  <span class="item-name-label">{{ item.name }}</span>
                  <div class="inputs-row">
                    <div class="numeric-field-inline">
                      <label>Out (Kotor):</label>
                      <input type="number" v-model.number="item.out" min="0" class="numeric-input-field">
                    </div>
                    <div class="numeric-field-inline">
                      <label>In (Bersih):</label>
                      <input type="number" v-model.number="item.in" min="0" class="numeric-input-field">
                    </div>
                  </div>
                </div>

                <!-- In Refill -->
                <div v-if="cat.type === 'in'" v-for="item in cat.items" :key="item.name" class="editor-item-row-numeric">
                  <span class="item-name-label">{{ item.name }}</span>
                  <div class="inputs-row">
                    <div class="numeric-field-inline">
                      <label>In (Refill):</label>
                      <input type="number" v-model.number="item.in" min="0" class="numeric-input-field">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="editingUiCategories.length === 0" class="no-configs-alert">
              ⚠️ Kamar ini tidak memiliki konfigurasi checklist beranak.
            </div>
          </div>

          <div class="modal-actions-v2">
            <button type="button" class="btn-cancel" @click="$emit('close')">Batal / Tutup</button>
            <button type="submit" class="btn-confirm-save flex items-center gap-1.5" style="display: inline-flex; align-items: center;">
              <svg class="w-4 h-4 mr-1 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width:16px; height:16px;">
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
