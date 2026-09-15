# Rencana Pengembangan SAMS (5758 Attendance System)

## Daftar Tugas (TODO) Mendatang

Berikut adalah fitur dan perbaikan yang perlu dikembangkan pada iterasi selanjutnya:

1. **Fitur Export & Import User (Super Admin)**
   - Buat menu khusus di dashboard Super Admin untuk melakukan *Export* dan *Import* data pengguna (User).
   - Fitur *Export* juga berfungsi untuk mengunduh template/contoh format data CSV/Excel yang nantinya digunakan sebagai standar saat melakukan *Import* data secara massal.

2. **Normalisasi Email Pengguna**
   - Lakukan normalisasi pada seluruh akun email pengguna (user) menjadi standar domain `@5758inc.id`.
   - Pastikan proses otentikasi login dan pembuatan akun baru menyesuaikan dengan format email baru ini.

3. **Validasi (Lock) Absen Pulang**
   - Kunci (*lock*) tombol atau fitur Absen Pulang jika belum memasuki jam pulang yang telah dijadwalkan.
   - Fitur ini untuk mencegah pegawai melakukan check-out terlalu awal dari jadwal shift/kerja yang seharusnya.
4. **Ubah Istilah 'Tenant' menjadi 'Mitra'**
   - Lakukan refactor atau perubahan label pada antarmuka pengguna (UI) agar semua kata 'Tenant' diganti menjadi 'Mitra' untuk memberikan kesan yang lebih familiar.
5. **Auto-Redirect Login dari Domain Utama**
   - Jika user (pegawai/admin mitra) melakukan login melalui domain utama (5758inc.my.id), sistem akan otomatis mencari di mana mitra mereka terdaftar dan langsung mengarahkan (redirect) ke subdomain mitra tersebut setelah login sukses (Single Sign-On experience).
