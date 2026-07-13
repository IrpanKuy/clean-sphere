

Rombak Konsep, Fitur, dan ERD dari Inventaris manager karna ada perubahan besar:

Karna data atribut inventaris Berubah Ubah maka akan pakai konsep "Context-Aware Dynamic CRUD":

A. STRUKTUR GOOGLE SHEETS (ERD KONSEP):
1. Sheet `Master_Kategori`: Kolom [ID_Kategori, Nama_Kategori, Atribut_Default] -> Atribut_Default berisi array string JSON untuk field wajib awal (misal: ["Brand", "Kondisi"]).
2. Sheet `Master_Barang`: Kolom [Item_Code, Lokasi_Kamar, Nama_Barang, Kategori, Detail_Spesifik] -> Kolom Detail_Spesifik akan menyimpan semua atribut (baik atribut default maupun atribut custom baru) dalam bentuk JSON string tunggal, contoh: {"Brand":"LG", "Watt":"80W", "Custom_Color": "Hitam"}.

B. FITUR UTAMA WEBAPP (FLOW UTAMA):
1. Filter Utama: User memilih "Nomor Kamar" (Lokasi_Kamar) dan "Kategori". Halaman utama menampilkan tabel barang yang ada di kamar & kategori tersebut.
2. Fitur Dynamic Attribute saat CREATE/EDIT:
   - Ketika tombol "Tambah Barang" diklik, user memilih Kategori.
   - JavaScript secara dinamis me-render input field berdasarkan 'Atribut_Default' dari kategori tersebut.
   - Sediakan tombol "+ Tambah Atribut Custom". Jika diklik, akan muncul 2 input field baru: (1) Untuk mengisi Nama Atribut User bisa menambah atribut custom ini tanpa batas dan inputnya pakai string.
3. Proses Simpan (CRUD): Saat disubmit, JavaScript akan melakukan looping untuk mengambil SEMUA field (baik yang default maupun yang custom tambahan), menyatukannya menjadi satu objek JSON, lalu dikirim ke GAS untuk di-stringify dan disimpan ke kolom `Detail_Spesifik`.
4. Proses Edit (Update): Ketika tombol Edit diklik, form dynamic field harus otomatis ter-generate dan terisi kembali sesuai dengan key-value yang ada di dalam JSON `Detail_Spesifik` barang tersebut.

Tolong buatkan kode yang modular, bersih, disertai komentar penjelasan logikanya, dan handle error jika JSON kosong.