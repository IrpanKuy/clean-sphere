// =========================================================================
// VUE COMPONENT: FLOATING CHATBOT OVERVIEW
// =========================================================================
const ChatbotOverview = {
  props: ['appState'],
  data() {
    return {
      isOpen: false,
      activeTab: 'chat', // 'chat' or 'history'
      userInput: '',
      messages: [
        {
          sender: 'ai',
          text: 'Halo Manager! Saya adalah asisten AI CleanSphere Pro. Anda dapat menginstruksikan saya untuk melakukan perubahan data, bulk create, atau pengeditan apa pun pada basis data. Silakan upload file PDF, Excel, atau foto jika diperlukan.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ],
      historyLogs: [], // Array of changes executed
      loading: false,
      
      // File upload state
      attachedFile: null,
      attachedFileBase64: '',
      attachedFileMime: ''
    };
  },
  mounted() {
    // Load local storage history logs if any
    const savedLogs = localStorage.getItem('cs_chatbot_history');
    if (savedLogs) {
      try {
        this.historyLogs = JSON.parse(savedLogs);
      } catch(e) {}
    }
  },
  methods: {
    toggleOpen() {
      this.isOpen = !this.isOpen;
    },
    triggerFileSelect() {
      this.$refs.fileInput.click();
    },
    handleFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        this.attachedFile = file;
        this.attachedFileBase64 = reader.result.split(',')[1];
        this.attachedFileMime = file.type;
      };
      reader.onerror = () => {
        Swal.fire("Gagal", "Gagal membaca file.", "error");
      };
      reader.readAsDataURL(file);
    },
    removeAttachedFile() {
      this.attachedFile = null;
      this.attachedFileBase64 = '';
      this.attachedFileMime = '';
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
    },
    async sendMessage() {
      if (!this.userInput.trim() && !this.attachedFile) return;

      const userText = this.userInput;
      const fileObj = this.attachedFile;
      
      // 1. Add User Message
      this.messages.push({
        sender: 'user',
        text: userText || `[Upload file: ${fileObj.name}]`,
        fileName: fileObj ? fileObj.name : null,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      });

      this.userInput = '';
      this.removeAttachedFile();
      this.loading = true;
      this.scrollToBottom();

      // 2. Call Gemini
      const reply = await this.queryGeminiAI(userText, fileObj);
      this.loading = false;

      if (reply) {
        // 3. Add AI Message
        this.messages.push({
          sender: 'ai',
          text: reply.reply,
          actions: reply.actions || [],
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        });
        
        // 4. Process database actions if present
        if (reply.actions && reply.actions.length > 0) {
          await this.confirmAndExecuteActions(reply.actions, userText || 'File Upload Analysis');
        }
      } else {
        this.messages.push({
          sender: 'ai',
          text: 'Maaf, saya mengalami kegagalan saat menghubungi server Gemini. Pastikan API Key di Pengaturan sudah terpasang dengan benar.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        });
      }
      this.scrollToBottom();
    },
    async queryGeminiAI(prompt, fileObj) {
      const apiKey = this.appState.settings[0]?.api_key;
      if (!apiKey) {
        Swal.fire("API Key Kosong", "Harap konfigurasikan API Key Gemini di Pengaturan Sistem terlebih dahulu.", "warning");
        return null;
      }

      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=" + apiKey;
      const dbContext = getCurrentStateContext();

      // Build Gemini Prompt
      const systemInstructions = `You are CleanSphere Pro AI Assistant. You have direct database control. 
Your task is to analyze user requests, context state, and optional files, and reply back to the user AND output JSON containing a list of database actions to perform (create, update, delete) on Google Sheets database tables.

The available tables and schema structure:
1. tb_users: ["user_id", "username", "password", "name", "role", "shift_id", "status"]
2. tb_shifts: ["shift_id", "shift_name", "check_in_time", "check_out_time", "pre_check_in_minutes", "pre_check_out_minutes", "is_active"]
3. tb_rooms: ["room_number", "room_status", "last_cleaned_at", "last_cleaned_by", "last_updated", "checklist_config", "remarks", "ideal_timer_minutes", "room_inventory"]
4. tb_areas: ["area_id", "area_name", "id_number", "shift_ids", "checklist_config"]
5. tb_area_shifts: ["area_shift_id", "shift_name", "start_time", "end_time"]
6. tb_staff_area_tasks: ["task_id", "area_id", "area_shift_id", "staff_id"]
7. tb_area_tasks_daily: ["task_daily_id", "area_id", "area_shift_id", "staff_id", "date", "status", "remarks", "updated_by", "updated_at", "tasks_completed", "linen_changed", "refills"]
8. tb_inventory_categories: ["category_id", "category_name", "description", "default_attributes", "is_active"]
9. tb_inventory: ["item_id", "item_code", "category_id", "item_name", "location_room", "stock_initial", "stock_in", "stock_out", "stock_current", "min_stock", "detail_spesifik", "remarks"]
10. tb_room_assignments: ["assignment_id", "date", "room_number", "staff_id", "target_status_from", "target_status_to", "remarks", "status"]
11. tb_room_checklist: ["checklist_id", "room_number", "staff_id", "date", "start_time", "end_time", "duration_minutes", "tasks_completed", "linen_changed", "refills", "status", "kpi_score"]
12. tb_housekeeping_project_master: ["master_id", "title", "description", "period_type", "staff_ids", "start_date", "last_generated_date", "ideal_time", "is_active"]
13. tb_housekeeping_projects: ["project_id", "master_id", "title", "description", "type", "staff_ids", "date", "ideal_time", "status"]
14. tb_housekeeping_submissions: ["submission_id", "project_id", "staff_id", "description", "photo_url", "submitted_at", "status", "kpi_score", "approved_by", "approved_at"]

Rules:
- For "create": generate a unique ID for the key column (e.g. USR010 for user, CHK023 for checklist, etc.) if not provided.
- For "update": specify "keyCol", "keyValue", and "updates".
- For "delete": specify "keyCol", "keyValue".
- Generate proper config strings like 'checklist_config' in rooms/areas as valid JSON strings.
- Return output in EXACTLY the required JSON format:
{
  "reply": "Explaining text for the user...",
  "actions": [
    {
      "action": "create" | "update" | "delete",
      "sheetName": "tb_rooms" | "tb_users" | etc.,
      "keyCol": "primary_key_column_name_here",
      "keyValue": "primary_key_value_here",
      "record": { ...fields... },
      "updates": { ...fields... }
    }
  ]
}

Database Current Context:
${dbContext}`;

      const contents = [];
      const parts = [{ text: systemInstructions + "\n\nUser request: " + prompt }];

      if (fileObj && this.attachedFileBase64) {
        parts.push({
          inlineData: {
            mimeType: this.attachedFileMime,
            data: this.attachedFileBase64
          }
        });
      }

      contents.push({ parts });

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        const resJson = await response.json();
        console.log("Gemini API Full Response:", resJson);
        if (resJson.candidates && resJson.candidates[0]?.content?.parts[0]?.text) {
          const text = resJson.candidates[0].content.parts[0].text;
          console.log("Gemini Generated Text:", text);
          
          let cleanedText = text.trim();
          if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
          }
          
          try {
            return JSON.parse(cleanedText);
          } catch (jsonErr) {
            // Regex fallback to find first JSON object { ... }
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                return JSON.parse(jsonMatch[0]);
              } catch (secondErr) {
                console.error("Regex extracted JSON parsing failed:", jsonMatch[0], secondErr);
              }
            }
            console.error("JSON parsing failed for text:", cleanedText, jsonErr);
            throw jsonErr;
          }
        }
        return null;
      } catch (error) {
        console.error("queryGeminiAI failed:", error);
        return null;
      }
    },
    async confirmAndExecuteActions(actions, originalPrompt) {
      // 1. Build details text for Swal Alert
      let detailHtml = '<div class="text-left text-xs font-semibold bg-slate-50 p-4 border border-slate-200 rounded-xl max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2.5">';
      actions.forEach((act, idx) => {
        detailHtml += `
          <div class="border-b border-slate-200 pb-2 last:border-0">
            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
              act.action === 'create' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              act.action === 'update' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              'bg-rose-50 text-rose-700 border border-rose-200'
            }">${act.action}</span>
            <span class="font-bold text-slate-800 ml-1.5">${act.sheetName}</span>
            <pre class="bg-slate-100 p-2 rounded-lg text-[10px] text-slate-600 mt-1 font-mono">${JSON.stringify(act.action === 'create' ? act.record : act.action === 'update' ? act.updates : { key: act.keyCol, value: act.keyValue }, null, 2)}</pre>
          </div>
        `;
      });
      detailHtml += '</div>';

      // 2. Alert Confirm
      const confirm = await Swal.fire({
        title: "Konfirmasi Perubahan Data",
        html: `Chatbot Gemini ingin melakukan perubahan database berikut:<br/><br/>${detailHtml}<br/>Apakah Anda menyetujui semua aksi ini?`,
        icon: "info",
        showCancelButton: true,
        confirmButtonColor: "#2563EB",
        confirmButtonText: "Ya, Setujui Semua",
        cancelButtonText: "Tolak"
      });

      if (confirm.isConfirmed) {
        let successCount = 0;
        let failCount = 0;
        const results = [];

        for (let act of actions) {
          const res = await executeGenericCUDLocal(act.action, act.sheetName, act.keyCol, act.keyValue, act.action === 'create' ? act.record : act.updates);
          if (res.success) {
            successCount++;
            results.push({ action: act.action, table: act.sheetName, status: 'Success' });
          } else {
            failCount++;
            results.push({ action: act.action, table: act.sheetName, status: 'Failed: ' + res.message });
          }
        }

        // 3. Log to History tab
        const newLog = {
          timestamp: new Date().toLocaleString('id-ID'),
          prompt: originalPrompt,
          changes: actions.map(act => `${act.action.toUpperCase()} di ${act.sheetName}`),
          results: results
        };
        this.historyLogs.unshift(newLog);
        localStorage.setItem('cs_chatbot_history', JSON.stringify(this.historyLogs));

        Swal.fire({
          title: "Eksekusi Selesai",
          text: `Berhasil mengeksekusi ${successCount} aksi.${failCount > 0 ? ` Gagal ${failCount} aksi.` : ''}`,
          icon: failCount > 0 ? "warning" : "success"
        });
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const chatContainer = this.$refs.messagesContainer;
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      });
    },
    clearHistory() {
      Swal.fire({
        title: "Hapus Riwayat?",
        text: "Semua riwayat perubahan chatbot lokal akan dibersihkan.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#EF4444",
        confirmButtonText: "Hapus"
      }).then(res => {
        if (res.isConfirmed) {
          this.historyLogs = [];
          localStorage.removeItem('cs_chatbot_history');
        }
      });
    }
  },
  template: `
    <div class="fixed bottom-6 right-6 z-[99999] flex flex-col items-end">
      
      <!-- CHAT WINDOW -->
      <div v-show="isOpen" class="bg-white w-[360px] sm:w-[420px] h-[520px] rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden mb-4 animate-[slideUp_0.25s_ease-out]">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-primary-navy to-primary-royal px-5 py-4 flex items-center justify-between text-white shrink-0 shadow-lg shadow-blue-900/10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg shadow-inner">🤖</div>
            <div>
              <h3 class="font-extrabold text-[14.5px] leading-tight">Asisten AI Gemini</h3>
              <span class="text-[10px] text-blue-100 font-semibold uppercase tracking-wider">CleanSphere Pro Database Controller</span>
            </div>
          </div>
          <button @click="isOpen = false" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all border-none text-white cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Navigation Tabs inside Chat -->
        <div class="bg-slate-50 border-b border-slate-100 px-4 py-2 flex gap-1.5 shrink-0">
          <button @click="activeTab = 'chat'" :class="['px-4 py-1.5 text-xs font-bold rounded-lg border-none transition-all cursor-pointer', activeTab === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200/50']">
            Asisten Chat
          </button>
          <button @click="activeTab = 'history'" :class="['px-4 py-1.5 text-xs font-bold rounded-lg border-none transition-all cursor-pointer', activeTab === 'history' ? 'bg-blue-600 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200/50']">
            Riwayat Perubahan ({{ historyLogs.length }})
          </button>
        </div>

        <!-- TAB CONTENT: CHAT -->
        <div v-show="activeTab === 'chat'" class="flex-1 flex flex-col min-h-0 bg-slate-50/50">
          <!-- Messages -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
            <div v-for="(msg, idx) in messages" :key="idx" :class="['flex flex-col max-w-[85%] rounded-2xl p-3 text-[13px] leading-relaxed shadow-sm border', 
              msg.sender === 'user' ? 'self-end bg-blue-600 text-white border-blue-500/50 rounded-tr-none' : 'self-start bg-white text-slate-800 border-slate-200/60 rounded-tl-none']">
              
              <span v-if="msg.fileName" class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-700/50 text-white rounded text-[10px] font-bold mb-1.5 max-w-full truncate">
                📄 {{ msg.fileName }}
              </span>

              <p class="whitespace-pre-wrap font-medium">{{ msg.text }}</p>
              
              <!-- Indicator of DB changes proposed -->
              <div v-if="msg.actions && msg.actions.length > 0" class="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>⚡ Proposal Perubahan:</span>
                <span class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">{{ msg.actions.length }} Aksi</span>
              </div>
              
              <span class="text-[9px] text-slate-400 self-end mt-1.5 font-semibold">{{ msg.timestamp }}</span>
            </div>

            <!-- Loading Indicator -->
            <div v-if="loading" class="self-start bg-white border border-slate-200/60 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>

          <!-- Attached file display -->
          <div v-if="attachedFile" class="mx-4 mb-2 p-2 bg-blue-50 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs font-semibold text-blue-700">
            <span class="truncate pr-4">📎 {{ attachedFile.name }} ({{ (attachedFile.size / 1024).toFixed(1) }} KB)</span>
            <button @click="removeAttachedFile" class="text-rose-500 border-none bg-transparent cursor-pointer font-bold">Batal</button>
          </div>

          <!-- Input Bar -->
          <div class="px-4 py-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <!-- File selector trigger -->
            <button @click="triggerFileSelect" class="w-[38px] h-[38px] rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200/60 transition-colors cursor-pointer shrink-0" title="Upload File">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png">

            <input type="text" v-model="userInput" @keyup.enter="sendMessage" placeholder="Ketik perintah perubahan data database..." class="flex-1 h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-colors">
            
            <button @click="sendMessage" class="w-[38px] h-[38px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center pl-0.5 border-none shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer shrink-0" title="Kirim">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>

        <!-- TAB CONTENT: HISTORY LOGS -->
        <div v-show="activeTab === 'history'" class="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50 min-h-0 custom-scrollbar">
          <div class="flex justify-between items-center mb-1 shrink-0">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daftar Modifikasi</span>
            <button @click="clearHistory" class="px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer bg-transparent">
              Bersihkan Log
            </button>
          </div>

          <div v-for="(log, idx) in historyLogs" :key="idx" class="bg-white p-3.5 border border-slate-200/60 rounded-2xl shadow-sm flex flex-col gap-2.5">
            <div class="flex justify-between items-center text-[10px] text-slate-400 font-semibold border-b border-slate-50 pb-1.5">
              <span>⏰ {{ log.timestamp }}</span>
              <span class="text-indigo-600">Gemini Executed</span>
            </div>
            
            <div class="text-[12px] font-bold text-slate-700 italic">
              "{{ log.prompt }}"
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Modifikasi:</span>
              <div class="flex flex-wrap gap-1">
                <span v-for="chg in log.changes" :key="chg" class="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/50 rounded text-[10.5px] font-bold">
                  {{ chg }}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Aksi:</span>
              <div v-for="res in log.results" :key="res.table" class="text-[10px] font-semibold flex items-center justify-between">
                <span class="text-slate-600 font-medium">{{ res.action }} di {{ res.table }}:</span>
                <span :class="res.status.startsWith('Success') ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'">{{ res.status }}</span>
              </div>
            </div>
          </div>

          <div v-if="historyLogs.length === 0" class="text-center py-16 text-slate-400 text-xs font-semibold italic">
            Belum ada riwayat pengerjaan / modifikasi oleh chatbot.
          </div>
        </div>

      </div>

      <!-- CHATBOT FLOATING BUTTON -->
      <button @click="toggleOpen" class="w-[56px] h-[56px] rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 transition-transform active:scale-90 cursor-pointer relative border-none group">
        <span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 group-hover:animate-ping"></span>
        <svg v-if="!isOpen" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 18a5.969 5.969 0 01-.474-2.88C4.03 13.88 4 12.954 4 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

    </div>
  `
};
