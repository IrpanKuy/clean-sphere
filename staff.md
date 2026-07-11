### 📱 Antarmuka Staf (Mobile-First)
Didesain khusus untuk perangkat mobile guna memudahkan operasional staf di lapangan:
*   **Sistem Absensi Cepat & Validasi**: Melakukan *Clock-In* dan *Clock-Out* harian sesuai shift. Sistem secara otomatis mencatat dan menghitung keterlambatan absen/pulang jika waktu *Clock-Out* melebihi jam selesai shift yang ditentukan.
*   **Pengajuan Izin**: Formulir digital untuk mengajukan cuti dan izin sakit (disertai unggah foto bukti/surat dokter).
*   **Room Control Sheets**: tempat staff untuk mengerjakan tugas room 
*   **Pembersihan Area Publik**: sementara berikan ui dalam pengerjaan.
*   **Housekeeping Project**
*   **Laporan Proyek Berkala**: Pelaporan tugas khusus harian, mingguan, atau bulanan lengkap dengan unggah foto dokumentasi hasil kerja.
*   **Pencatatan Inventaris**: Input pemakaian linen, bahan kimia, atau peralatan kebersihan beserta riwayat pemakaian staf hari ini.

Beriku Alurnya:
1. Staff login dengan akun yang disediakan.
2. Staff melakukan absensi dengan klik tombol absensi masuk, dengan logic absensi detail berikut:
-staff hanya dapat melakukan absensi masuk jika shift yang terhubung dengan staff check_in_time nya dikurangi pre_check_in_minutes waktunya lebih kecil dari waktu sekarang, Contoh: shift check_in_time 08:00 dan pre_check_in_minutes 10, maka staff dapat melakukan absensi dari jam 07:50 sampai 08:00.
3. setelah staff absensi baru menu room controll shets bisa diakses dengan detail menampilkan Room apa saja yang ditugaskan oleh admin pada hari ini. lalu akan menampilan list room dengan waktunya dari mana sampai mana.
jika salah 1 list room tersebut di klik maka akan menampilkan ui dengan tombol start timer dan stop timer di atas dan di bawahnya ada daftar Checklist, data number in, in out, setelah staff klik stop timer maka data itu akan disimpan ke tb_room_status_history dan tb_room_checklist untuk data data checklistnya untuk skor kpi sementara langsung atur flat ke 90 saja, keterlambatan timer mulai dengan dan mengubah status dari tb_room_assignments menjadi completed untuk room tersebut. 