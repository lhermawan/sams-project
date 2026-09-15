# Rencana Pengembangan 5758 (5758 Attendance System)

## Daftar Tugas (TODO) Mendatang

Berikut adalah fitur dan perbaikan yang perlu dikembangkan pada iterasi selanjutnya:

1. **[SELESAI] Fitur Pembuatan & Manajemen Pegawai oleh Super Admin (Single & Bulk Import)**
   - Buat antarmuka dan API di dashboard Super Admin untuk membuat akun Pegawai (`EMPLOYEE`) lengkap beserta profilnya (Nama Lengkap, NIP, Bagian, Jabatan, dan Jenis Pegawai) ke mitra/tenant yang dipilih.
   - Dukung pembuatan **Username login** yang praktis (otomatis disugesti dari nama pegawai, terstandarisasi dengan domain `@5758inc.id`, dan password default yang fleksibel).
   - Sediakan fitur **Import Massal (Excel/CSV)** khusus Super Admin agar onboarding pegawai untuk mitra baru bisa dilakukan secara instan lengkap dengan template unduhan.
   - Tampilkan informasi akun dan kredensial login pegawai di panel Super Admin untuk memudahkan audit akun mitra.

2. **[SELESAI] Normalisasi Email Pengguna**
   - Lakukan normalisasi pada seluruh akun email pengguna (user) menjadi standar domain `@5758inc.id`.
   - Pastikan proses otentikasi login dan pembuatan akun baru menyesuaikan dengan format email baru ini.

3. **Validasi (Lock) Absen Pulang**
   - Kunci (*lock*) tombol atau fitur Absen Pulang jika belum memasuki jam pulang yang telah dijadwalkan.
   - Fitur ini untuk mencegah pegawai melakukan check-out terlalu awal dari jadwal shift/kerja yang seharusnya.
4. **Ubah Istilah 'Tenant' menjadi 'Mitra'**
   - Lakukan refactor atau perubahan label pada antarmuka pengguna (UI) agar semua kata 'Tenant' diganti menjadi 'Mitra' untuk memberikan kesan yang lebih familiar.
5. **Auto-Redirect Login dari Domain Utama**
   - Jika user (pegawai/admin mitra) melakukan login melalui domain utama (5758inc.my.id), sistem akan otomatis mencari di mana mitra mereka terdaftar dan langsung mengarahkan (redirect) ke subdomain mitra tersebut setelah login sukses (Single Sign-On experience).
