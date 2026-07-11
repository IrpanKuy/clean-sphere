// =========================================================================
// VUE COMPONENT: APP SETTINGS & CONFIGURATION VIEW
// =========================================================================
const AppSettingsView = {
  props: ['settings', 'currentUser'],
  emits: ['update-settings', 'update-admin'],
  data() {
    return {
      formSettings: {
        api_key: '',
        folder_url: ''
      },
      formAdmin: {
        username: '',
        name: '',
        password: ''
      },
      isSavingSettings: false,
      isSavingAdmin: false
    };
  },
  watch: {
    settings: {
      immediate: true,
      handler(newVal) {
        if (newVal && newVal.length > 0) {
          this.formSettings.api_key = newVal[0].api_key || '';
          this.formSettings.folder_url = newVal[0].folder_url || '';
        }
      }
    },
    currentUser: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.formAdmin.username = newVal.username || '';
          this.formAdmin.name = newVal.name || '';
        }
      }
    }
  },
  template: `
    <div class="flex flex-col gap-6 w-full max-w-[1200px] mx-auto">
      <div class="mb-4">
        <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">Konfigurasi Sistem</h2>
        <p class="text-[13.5px] font-medium text-slate-500 mt-1">Kelola pengaturan aplikasi, integrasi, dan kredensial admin.</p>
      </div>

      <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full max-w-[600px]">
        <div class="border-b border-slate-100 px-6 py-5">
          <h3 class="text-[15px] font-bold text-slate-900 m-0">Pengaturan Integrasi & Chatbot</h3>
        </div>
        <div class="p-6 flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <label class="text-[13px] font-bold text-slate-700">Google Drive Folder URL (Untuk Kirim Foto)</label>
            <input type="text" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" v-model="formSettings.folder_url" placeholder="https://drive.google.com/drive/folders/..." />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[13px] font-bold text-slate-700">API Key (Untuk Fitur Chatbot)</label>
            <input type="text" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" v-model="formSettings.api_key" placeholder="AIzaSy..." />
          </div>
          <button class="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center shrink-0 disabled:opacity-70 disabled:cursor-not-allowed mt-2" @click="saveSettings" :disabled="isSavingSettings">
            <span v-if="isSavingSettings">Menyimpan...</span>
            <span v-else>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.04)] border border-slate-100 flex flex-col w-full max-w-[600px]">
        <div class="border-b border-slate-100 px-6 py-5">
          <h3 class="text-[15px] font-bold text-slate-900 m-0">Kredensial Admin</h3>
        </div>
        <div class="p-6 flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <label class="text-[13px] font-bold text-slate-700">Nama Lengkap Admin</label>
            <input type="text" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" v-model="formAdmin.name" />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[13px] font-bold text-slate-700">Username Admin</label>
            <input type="text" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" v-model="formAdmin.username" />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[13px] font-bold text-slate-700">Password Baru (Kosongkan jika tidak ingin mengubah)</label>
            <input type="password" class="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" v-model="formAdmin.password" placeholder="***" />
          </div>
          <button class="h-[42px] px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[13px] rounded-xl shadow-[0_4px_10px_rgba(15,23,42,0.2)] transition-all flex items-center justify-center shrink-0 disabled:opacity-70 disabled:cursor-not-allowed mt-2" @click="saveAdmin" :disabled="isSavingAdmin">
            <span v-if="isSavingAdmin">Menyimpan...</span>
            <span v-else>Update Kredensial</span>
          </button>
        </div>
      </div>
    </div>
  `,
  methods: {
    saveSettings() {
      this.isSavingSettings = true;
      this.$emit('update-settings', {
        api_key: this.formSettings.api_key,
        folder_url: this.formSettings.folder_url
      }, () => {
        this.isSavingSettings = false;
      });
    },
    saveAdmin() {
      this.isSavingAdmin = true;
      this.$emit('update-admin', {
        username: this.formAdmin.username,
        name: this.formAdmin.name,
        password: this.formAdmin.password
      }, () => {
        this.isSavingAdmin = false;
        this.formAdmin.password = ''; // reset password field after saving
      });
    }
  }
};
