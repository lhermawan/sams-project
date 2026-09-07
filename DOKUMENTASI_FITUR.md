# BUKU PANDUAN & DOKUMENTASI LENGKAP FITUR SAMS
## SMART ATTENDANCE MANAGEMENT SYSTEM (SAMS)
*Versi: 2.0.0 — Terakhir Diperbarui: September 2026*

---

## DAFTAR ISI
1. [Tentang Sistem & Arsitektur Teknologi](#1-tentang-sistem--arsitektur-teknologi)
2. [Akses Pengguna & Hak Akses (Role-Based Access Control)](#2-akses-pengguna--hak-akses-role-based-access-control)
3. [Fitur Manajemen Absensi Pegawai (Sisi Pegawai)](#3-fitur-manajemen-absensi-pegawai-sisi-pegawai)
4. [Fitur Monitoring & Validasi Absensi (Sisi Admin)](#4-fitur-monitoring--validasi-absensi-sisi-admin)
5. [Fitur Manajemen Izin & Cuti](#5-fitur-manajemen-izin--cuti)
6. [Fitur Manajemen Data Pegawai & Impor CSV Massal](#6-fitur-manajemen-data-pegawai--impor-csv-massal)
7. [Fitur Laporan, Analisis Keterlambatan, & Ekspor Spreadsheet](#7-fitur-laporan-analisis-keterlambatan--ekspor-spreadsheet)
8. [Fitur Jadwal Kerja, Shift, & Hari Libur](#8-fitur-jadwal-kerja-shift--hari-libur)
9. [Fitur Audit Log & Jejak Keamanan Sistem](#9-fitur-audit-log--jejak-keamanan-sistem)
10. [Fitur Pengaturan Sistem & Personalisasi Branding](#10-fitur-pengaturan-sistem--personalisasi-branding)
11. [Daftar Endpoint API Sistem](#11-daftar-endpoint-api-sistem)
12. [Panduan Operasional, Hosting, & Pemeliharaan](#12-panduan-operasional-hosting--pemeliharaan)

---

## 1. TENTANG SISTEM & ARSITEKTUR TEKNOLOGI

**SAMS (Smart Attendance Management System)** adalah aplikasi presensi dan manajemen kehadiran pegawai modern berbasis web yang dirancang khusus untuk menjamin keaslian data kehadiran, mencegah kecurangan (seperti *Fake GPS* dan manipulasi foto), serta mempermudah tata kelola SDM, izin/cuti, dan pelaporan absensi bagi instansi maupun perusahaan.

### Spesifikasi Teknologi:
- **Framework Utama:** Next.js 16 (App Router, Turbopack, Server Actions, Dynamic API Routes).
- **Bahasa Pemrograman:** TypeScript (Strict Type Safety).
- **Basis Data:** SQLite melalui Prisma ORM (database mandiri, performa tinggi, nol konfigurasi database eksternal).
- **Autentikasi:** NextAuth.js v5 dengan enkripsi kata sandi menggunakan `bcryptjs`.
- **Desain & UI:** Tailwind CSS, Lucide Icons, Date-fns (lokalisasi Bahasa Indonesia `id-ID`).
- **Infrastruktur Siap Pakai:** Standalone server build, script otomasi `start.bat`, dan tunneling Cloudflare untuk akses publik daring.

---

## 2. AKSES PENGGUNA & HAK AKSES (ROLE-BASED ACCESS CONTROL)

SAMS membagi akses ke dalam 2 tingkatan hak akses (role):

| Hak Akses | Sasaran Pengguna | Fitur & Batasan |
|---|---|---|
| **ADMIN** | HRD, Tim Personalia, Pimpinan, Tim IT | Akses ke seluruh panel admin (`/admin/*`), monitoring absensi real-time, validasi/penolakan absensi, impor pegawai CSV, manajemen shift & jadwal, persetujuan izin/cuti, ekspor laporan spreadsheet, audit log keamanan, dan pengaturan branding instansi. |
| **EMPLOYEE** | Seluruh Pegawai / Staf Instansi | Akses tampilan mobile/desktop ramah pengguna (`/dashboard`), melakukan absen masuk (foto ganda: wajah & lokasi kerja), absen pulang tepat waktu, pengajuan izin/cuti mandiri (`/leave`), serta melihat riwayat absensi & catatan verifikasi dari admin. |

---

## 3. FITUR MANAJEMEN ABSENSI PEGAWAI (SISI PEGAWAI)

Halaman utama pegawai (`/dashboard` & `/attendance`) dirancang dengan antarmuka mobile-first yang bersih dan mudah digunakan:

### A. Dashboard Utama Pegawai (`/dashboard`)
1. **Kartu Sapaan Dinamis:** Menampilkan salam berdasarkan waktu (*Selamat Pagi, Siang, Sore, Malam*), nama lengkap, NIP, serta bagian/departemen pegawai.
2. **Kartu Status Hari Ini:**
   - Status Absen Masuk (jam masuk atau status "Belum").
   - Status Absen Pulang (jam pulang atau status "Belum").
   - Jadwal Kerja Aktif (menampilkan jam shift aktif atau jadwal reguler kantor).
3. **Kartu Tombol Pintas Tindakan:**
   - Tombol pintar: Berubah otomatis antara *"Absen Masuk"*, *"Absen Pulang"*, atau *"Absensi Selesai"*.
   - Kartu Pintasan *"Pengajuan Izin & Cuti"*: Akses cepat 1-klik untuk mengajukan permohonan.
4. **Riwayat Absensi Terakhir:** Menampilkan 5 kehadiran terakhir lengkap dengan indikator status dan waktu.

### B. Alur Absen Masuk 2 Tahap (Anti Fake GPS & Verifikasi Muka)
Untuk menjamin pegawai benar-benar hadir secara fisik di tempat kerja dan mengantisipasi kecurangan aplikasi *Fake GPS*, sistem menerapkan **pengambilan foto 2 tahap otomatis**:
1. **Verifikasi Geofencing (GPS):**
   - Sistem membaca koordinat GPS perangkat pegawai dan menghitung jarak radius (meter) terhadap titik lokasi kantor.
   - Jika pegawai berada di luar batas radius yang ditentukan, tombol absensi memberikan peringatan jarak.
2. **Kondisi Hari Libur & Sabtu-Minggu:**
   - Sistem memeriksa kondisi kalender hari libur dan jadwal kerja bagian pegawai untuk memastikan apakah jadwal masuk aktif.
3. **Peringatan Keterlambatan Otomatis:**
   - Jika pegawai absen melewati batas jam masuk ditambah toleransi, sistem memunculkan peringatan:  
     `"Anda terlambat X menit"`.
   - Pegawai tetap dapat melakukan absensi masuk, namun status otomatis ditandai sebagai *Terlambat* dan tercatat durasi keterlambatannya.
4. **Tahap 1: Foto Selfie Wajah (Kamera Depan):**
   - Kamera otomatis aktif mengambil potret wajah asli pegawai untuk memastikan orang yang bersangkutan hadir.
5. **Tahap 2: Foto Lokasi Kerja Fisik (Kamera Otomatis Kedua):**
   - Segera setelah foto wajah diambil, sistem secara otomatis membuka pengambilan gambar tahap kedua untuk memfoto lingkungan/lokasi kerja fisik tempat pegawai bertugas.
   - Kedua foto tersimpan rapi pada data absensi pegawai dan langsung dapat diperiksa oleh admin.

### C. Proteksi Absen Pulang
- **Kunci Pulang Sebelum Waktunya:** Tombol absen pulang tidak dapat diakses / dikunci jika belum memasuki waktu jam pulang kerja yang ditetapkan.
- Mengambil foto konfirmasi kepulangan dan mencatat jarak lokasi pulang.

### D. Riwayat & Detail Kehadiran Mandiri (`/history`)
- Pegawai dapat mengecek seluruh riwayat kehadirannya.
- Saat salah satu baris absensi diklik, muncul **Modal Detail Absensi Interaktif**:
  - Foto selfie muka dan foto lokasi kerja fisik anti Fake GPS.
  - Jam masuk, jam pulang, jarak check-in, dan total menit keterlambatan.
  - Status validasi admin: *Disetujui*, *Disetujui (dengan catatan)*, *Ditolak*, atau *Ditolak (dengan catatan)*.
  - Catatan verifikasi dari admin (jika ada catatan khusus).

---

## 4. FITUR MONITORING & VALIDASI ABSENSI (SISI ADMIN)

Halaman Monitoring Absensi (`/admin/attendance`) adalah pusat kendali bagi HRD untuk memverifikasi kehadiran seluruh pegawai:

### A. Panel Filter Multi-Dimensi dengan Pembatas Terstruktur
- **Pintasan Tanggal Cepat:** Tombol *Hari Ini*, *Kemarin*, dan *Semua Tanggal* untuk navigasi cepat 1-klik.
- **Filter Bagian Dinamis:** Dropdown yang memuat daftar nama bagian yang pernah diinputkan admin ke sistem secara dinamis.
- **Filter Pegawai Spesifik:** Dropdown nama pegawai (beserta NIP) yang otomatis menyesuaikan dengan bagian yang dipilih.
- **Filter Status Kehadiran:** Opsi memfilter status *Disetujui*, *Menunggu*, *Terlambat*, *Ditolak*, atau *Dikoreksi*.
- **Pencarian Bebas:** Mencari berdasarkan NIP, nama, atau catatan.
- **Tombol Reset Filter:** Menghapus seluruh filter dalam satu klik.

### B. Pratinjau Foto Ganda (Lightbox Modal)
- Kolom tabel menampilkan thumbnail foto muka, foto lokasi kerja fisik, dan foto pulang.
- Mengklik foto membuka modal pratinjau resolusi tinggi (Lightbox) untuk memverifikasi kebenaran fisik lingkungan kerja pegawai.

### C. Sistem Aksi Validasi Terkunci Otomatis (Anti Validasi Ganda)
Untuk menjamin integritas data dan mencegah duplikasi notifikasi ke pegawai:
1. **Kondisi Belum Divalidasi (`PENDING`):**
   - Menampilkan dua tombol aktif: **`[Setujui]`** (hijau) dan **`[Tolak]`** (merah).
   - Mengklik salah satu tombol membuka popup konfirmasi catatan admin opsional.
2. **Modal Konfirmasi & Catatan Opsional:**
   - Admin dapat memilih alasan cepat 1-klik (misal: *"Foto lokasi tidak sesuai tempat kerja"*, *"Terdeteksi fake GPS"*, *"Absensi sah & diverifikasi"*).
   - Disediakan textarea catatan bebas untuk pegawai. Catatan ini bersifat opsional (jika dikosongkan absensi tetap diproses).
3. **Penguncian Tombol Otomatis Permanen:**
   - Setelah tombol konfirmasi ditekan, tombol di baris tabel **otomatis terkunci permanen** (`disabled={true}`, `cursor-not-allowed`, event klik dimatikan).
   - Tombol pilihan kedua otomatis **dihilangkan**, sehingga hanya tampil **1 tombol status terkunci**:
     - *Disetujui tanpa catatan:* Tombol hijau **`Disetujui`**
     - *Disetujui dengan catatan:* Tombol hijau **`Disetujui (dengan catatan)`**
     - *Ditolak tanpa catatan:* Tombol merah **`Ditolak`** (tulisan merah tebal)
     - *Ditolak dengan catatan:* Tombol merah **`Ditolak (dengan catatan)`** (tulisan merah tebal)
4. **Proteksi Idempotensi Backend (`/api/attendance/validate`):**
   - Server menolak permintaan kedua pada data yang telah divalidasi (`status: 400`), menjamin tidak ada notifikasi ganda atau log audit berulang.

---

## 5. FITUR MANAJEMEN IZIN & CUTI

Modul Izin & Cuti menghubungkan pegawai dan pimpinan/admin dalam pengelolaan cuti kerja:

### A. Tipe Pengajuan yang Didukung
1. **IZIN:** Izin keperluan pribadi / mendadak.
2. **CUTI_TAHUNAN:** Cuti tahunan reguler pegawai.
3. **CUTI_SAKIT:** Cuti sakit (wajib melampirkan surat keterangan dokter).
4. **CUTI_MELAHIRKAN:** Cuti bersalin / melahirkan.
5. **CUTI_KHUSUS:** Cuti keperluan khusus (pernikahan, duka cita, ibadah).
6. **TUGAS_LUAR:** Perjalanan dinas / penugasan luar kota.

### B. Pengajuan Mandiri oleh Pegawai (`/leave`)
- Formulir pengajuan: Pemilihan jenis izin/cuti, tanggal mulai dan selesai (otomatis kalkulasi jumlah hari kerja), serta penjelasan alasan.
- Fitur unggah bukti lampiran (foto surat dokter, surat dinas, berkas pendukung).
- Tab status pengajuan: *Semua, Menunggu, Disetujui, Ditolak*.
- Tampilan detail catatan persetujuan atau alasan penolakan dari admin.

### C. Panel Validasi Admin (`/admin/leave`)
- **Kartu Ringkasan:** Menampilkan total pengajuan, menunggu persetujuan, disetujui, dan ditolak.
- **Panel Filter Lengkap:** Filter status, jenis izin/cuti, bagian, pegawai, dan rentang tanggal.
- **Tombol `+ Buat Pengajuan Baru` (Admin):** Admin dapat membuatkan izin/cuti atas nama pegawai jika pengajuan diajukan secara lisan/offline.
- **Pratinjau Surat Lampiran (Lightbox):** Klik tombol *"Lihat Bukti"* untuk membuka tampilan surat dokter/dokumen secara langsung.
- **Sistem Penguncian Aksi:**
  - Tombol **`[Setujui]`** dan **`[Tolak]`** terkunci otomatis setelah dipilih.
  - Notifikasi otomatis terkirim ke akun pegawai saat permohonan disetujui atau ditolak.

---

## 6. FITUR MANAJEMEN DATA PEGAWAI & IMPOR CSV MASSAL

Halaman Pegawai (`/admin/employees`) mengelola seluruh data master pegawai dan akun login mereka:

### A. Penambahan Pegawai Manual (`/admin/employees/new`)
- Form isian lengkap: NIP, Nama Lengkap, Email, Password Akun, Bagian / Departemen, Jabatan, Nomor Telepon, dan Alamat.
- Seluruh isian textbox telah dioptimasi agar responsif, tidak lag, dan mudah diisi.
- Dropdown bagian menyajikan bagian yang sudah ada atau dapat mengetikkan bagian baru secara dinamis.

### B. Tambah Pegawai Massal via Upload File CSV / Excel
Fitur unggulan untuk mempermudah pendaftaran puluhan, ratusan, hingga ribuan pegawai dan bagian dalam hitungan detik:
1. **Template Format CSV Resmi:**
   - Tombol **"Unduh Format CSV"** mengunduhkan berkas `template_data_pegawai_sams.csv`.
   - Susunan kolom standar:  
     `NIP, Nama Lengkap, Email, Password, Bagian, Jabatan, Nomor Telepon, Alamat`
2. **Modal Impor Interaktif:**
   - Mendukung drag & drop berkas `.csv`, `.tsv`, atau `.txt`.
   - **Parser Cerdas:** Mendeteksi pemisah koma maupun titik-koma, tanda kutip, dan variasi penamaan header kolom secara otomatis.
   - **Pratinjau Langsung (Live Preview):** Menampilkan jumlah pegawai yang terdeteksi dan cuplikan 5 baris pertama (NIP, Nama, Bagian, Jabatan, Email) sebelum dieksekusi.
   - **Eksekusi Cepat & Skalabel:** Memproses dalam *chunk batching* dengan enkripsi password efisien.
   - **Registrasi Bagian Otomatis:** Nama bagian yang tercantum dalam file CSV langsung otomatis tercatat di database dan menjadi pilihan filter pada menu Monitoring dan Laporan.
3. **Reset Password & Kelola Akun:**
   - Fitur reset password 1-klik ke sandi standar.
   - Opsi mengaktifkan / menonaktifkan status pegawai tanpa menghapus riwayat kehadiran mereka.

---

## 7. FITUR LAPORAN, ANALISIS KETERLAMBATAN, & EKSPOR SPREADSHEET

Halaman Laporan (`/admin/reports`) menyediakan rekapitulasi kehadiran komprehensif untuk penggajian (payroll) dan penilaian kinerja:

### A. Generator Laporan Fleksibel
- **Laporan Harian, Mingguan, dan Bulanan:** Dihasilkan sesuai rentang tanggal yang dipilih admin.
- **Laporan Per Bagian / Departemen:** Menampilkan daftar bagian berdasarkan data yang pernah diinputkan oleh admin.
- **Laporan Per Pegawai Spesifik:** Rekapitulasi absensi individu untuk evaluasi pegawai.
- **Kartu Statistik Ringkas:** Total Kehadiran, Hadir Tepat Waktu, Terlambat, Rata-rata Jarak Lokasi, dan **Akumulasi Menit Keterlambatan**.

### B. Perhitungan Waktu Keterlambatan
- Laporan memuat rincian keterlambatan per hari.
- Kolom ringkasan akumulasi total waktu keterlambatan pegawai dalam skala harian, mingguan, dan bulanan yang siap dijadikan acuan pemotongan tunjangan kehadiran.

### C. Integrasi Spreadsheet Lengkap (4 Pilihan Ekspor)
Tombol **"Input ke Spreadsheet"** menyediakan 4 cara transfer data yang fleksibel:
1. **Sinkronisasi Langsung ke Google Spreadsheet (Live Webhook):**
   - Admin memasukkan URL Webhook Google Apps Script (tersimpan otomatis di browser).
   - Menekan tombol **"Kirim ke Google Spreadsheet Sekarang"** mentransfer data seluruh baris laporan yang sedang difilter langsung ke Google Sheets secara real-time.
   - Disediakan panduan dan template Google Apps Script 5 baris siap salin di dalam modal.
2. **Salin Format Spreadsheet (Clipboard TSV 1-Klik):**
   - Menekan tombol **"Salin Data ke Clipboard"** menyalin data dalam format Tab-Separated Values (TSV).
   - Cukup buka lembar baru di Google Sheets atau Microsoft Excel lalu tekan `Ctrl + V`; seluruh kolom otomatis terisi rapi.
3. **Unduh Berkas CSV (.csv):**
   - Menghasilkan file CSV dengan encoding UTF-8 BOM yang langsung terbaca rapi oleh Excel tanpa karakter rusak.
4. **Unduh Berkas Excel (.xlsx):**
   - Format spreadsheet Microsoft Excel resmi.
5. **Cetak / Simpan PDF:**
   - Tampilan ramah cetak (print-friendly) untuk arsip berkas fisik bertanda tangan.

---

## 8. FITUR JADWAL KERJA, SHIFT, & HARI LIBUR

Sistem mendukung fleksibilitas waktu kerja untuk berbagai tipe organisasi:

### A. Jam Kerja Reguler Kantor (`/admin/schedule`)
- Pengaturan jam masuk standar, jam pulang standar, dan toleransi keterlambatan (dalam menit).
- Pengaturan tanggal berlaku jadwal kerja.

### B. Manajemen Shift Fleksibel (`/admin/shifts`)
- Pembuatan kode shift, nama shift, jam mulai, dan jam selesai.
- **Dukungan Shift Lintas Hari (Cross-Day):** Untuk bagian yang bekerja pada malam hari (misal shift malam: 22:00 - 06:00).
- Penugasan shift kerja ke pegawai tertentu atau per departemen.

### C. Kalender Hari Libur (`/admin/schedule/holidays`)
- Pendaftaran hari libur nasional dan cuti bersama instansi.
- Memastikan sistem tidak menandai pegawai alpa pada hari-hari libur resmi.

---

## 9. FITUR AUDIT LOG & JEJAK KEAMANAN SISTEM

Halaman Audit Log (`/admin/audit-log`) mencatat setiap aksi penting di sistem demi transparansi, akuntabilitas, dan keamanan:

### A. Perekaman Aktivitas Menyeluruh
Sistem mencatat otomatis setiap peristiwa penting:
- `LOGIN` & Autentikasi Pengguna
- `CHECKIN` & `CHECKOUT` Absensi Pegawai
- `APPROVE_ATTENDANCE` & `REJECT_ATTENDANCE` oleh Admin
- `CREATE_LEAVE_REQUEST`, `APPROVE_LEAVE_REQUEST`, & `REJECT_LEAVE_REQUEST`
- `CREATE_EMPLOYEE`, `UPDATE_EMPLOYEE`, `DELETE_EMPLOYEE`, & `RESET_PASSWORD`
- `IMPORT_EMPLOYEES` (Impor Pegawai Massal via CSV)
- `UPDATE_SETTINGS` (Perubahan Pengaturan Lokasi / Branding)

### B. Filter & Penelusuran Log
- Pencarian kata kunci (email, nama pengguna, alamat IP, atau target ID).
- Filter berdasarkan Jenis Aksi, Entitas terkait, dan Pengguna pelaku.
- Filter berdasarkan rentang tanggal.

### C. Viewer Snapshot Perubahan Data (Diff Viewer)
- Tombol **"Lihat Snapshot"** menampilkan modal perbandingan yang memperlihatkan `Data Sebelum (oldData)` dan `Data Sesudah (newData)` dalam format JSON rapi berwarna.
- Tombol **"Salin JSON"** untuk kemudahan investigasi keamanan.

### D. Ekspor Audit Log ke CSV
- Tombol **"Ekspor CSV"** mengunduh seluruh catatan riwayat audit ke berkas spreadsheet untuk kebutuhan audit kepatuhan eksternal.

---

## 10. FITUR PENGATURAN SISTEM & PERSONALISASI BRANDING

Halaman Pengaturan (`/admin/settings`) memberikan kendali penuh pada identitas instansi:

### A. Identitas Instansi & Logo Real-Time
- Pengaturan **Nama Aplikasi** (default: SAMS) dan **Nama Instansi / Perusahaan**.
- **Upload Logo Instansi:** Mendukung file gambar (PNG/JPEG/SVG).
- **Hapus Logo:** Tombol hapus logo langsung menghapus logo dari sistem secara real-time tanpa perlu me-refresh halaman; navbar dan sidebar otomatis langsung terbarui seketika.

### B. Titik Lokasi Kantor & Geofencing
- Input koordinat Latitude dan Longitude kantor utama.
- Pengaturan radius toleransi absensi (dalam meter, misal 100m, 200m, atau 500m).
- Pengaturan ini menjadi dasar validasi jarak fisik saat pegawai melakukan absensi masuk dan pulang.

---

## 11. DAFTAR ENDPOINT API SISTEM

Seluruh fungsionalitas SAMS didukung oleh REST API Next.js modern:

| Endpoint | Method | Peran Akses | Fungsi / Deskripsi |
|---|---|---|---|
| `/api/auth/[...nextauth]` | ALL | Publik | Menangani login, sesi token JWT, dan logout pengguna. |
| `/api/attendance/checkin` | POST | Pegawai | Memproses absen masuk (foto selfie, foto lokasi fisik, koordinat GPS). |
| `/api/attendance/checkout` | POST | Pegawai | Memproses absen pulang dengan validasi jam pulang. |
| `/api/attendance/today` | GET | Pegawai | Mengambil status absensi hari ini bagi pegawai yang login. |
| `/api/attendance/list` | GET | Admin | Mengambil daftar absensi dengan filter tanggal, bagian, dan status. |
| `/api/attendance/validate` | POST | Admin | Memvalidasi/menolak absensi dengan catatan & proteksi kunci ganda. |
| `/api/leave` | GET, POST | Pegawai / Admin | Mengambil daftar izin/cuti dan membuat pengajuan baru. |
| `/api/leave/action` | POST | Admin | Menyetujui atau menolak permohonan izin/cuti. |
| `/api/employees` | GET, POST | Admin | Mengambil daftar pegawai dan menambahkan pegawai manual. |
| `/api/employees/[id]` | GET, PUT, DELETE | Admin | Mengambil detail, memperbarui profil, atau menonaktifkan pegawai. |
| `/api/employees/[id]/reset-password` | POST | Admin | Mereset password akun pegawai. |
| `/api/employees/template` | GET | Admin | Mengunduh template resmi file CSV data pegawai. |
| `/api/employees/import` | POST | Admin | Mengimpor data pegawai dan bagian massal dari file CSV. |
| `/api/reports` | GET | Admin | Menghasilkan rekapitulasi data absensi dan keterlambatan. |
| `/api/reports/export` | POST | Admin | Menangani ekspor data laporan ke spreadsheet / webhook. |
| `/api/schedule` | GET, POST | Admin | Mengatur jam kerja reguler dan toleransi keterlambatan. |
| `/api/schedule/holidays` | GET, POST | Admin | Mengelola kalender hari libur instansi. |
| `/api/shifts` | GET, POST | Admin | Mengelola master data shift kerja. |
| `/api/shifts/assign` | POST | Admin | Menugaskan shift kerja ke pegawai tertentu. |
| `/api/audit-log` | GET | Admin | Mengambil catatan jejak audit dan ekspor CSV. |
| `/api/settings` | GET, POST | Admin | Mengambil dan memperbarui branding instansi & logo. |
| `/api/settings/office` | GET, POST | Admin | Mengatur koordinat lokasi kantor dan radius geofencing. |
| `/api/notifications` | GET, PATCH | Pegawai / Admin | Mengambil notifikasi lonceng dan menandai telah dibaca. |

---

## 12. PANDUAN OPERASIONAL, HOSTING, & PEMELIHARAAN

### A. Menjalankan Server Lokal / Jaringan Kantor
1. Ekstrak file arsip `sams-siap-hosting.zip` ke direktori pilihan di server/komputer.
2. Klik dua kali pada berkas `start.bat`.
3. Server otomatis aktif di alamat:  
   `http://localhost:3001` (atau `http://<IP-Lokal-Komputer>:3001` untuk diakses seluruh komputer & smartphone yang satu jaringan Wi-Fi).

### B. Menjalankan Akses Daring (Online) via Cloudflare Tunnel
Untuk memungkinkan pegawai di luar kantor mengakses aplikasi tanpa perlu IP publik atau sewa VPS mahal:
```powershell
cloudflared.exe tunnel --url http://localhost:3001
```
URL aman beralamat HTTPS (misal: `https://xxxx.trycloudflare.com`) akan otomatis dibuat dan langsung dapat diakses dari seluruh Indonesia.

### C. Akun Masuk Bawaan (Default Credentials)
- **Akun Admin:**
  - Email: `admin@sams.com`
  - Password: `Password@123`
- **Akun Pegawai Contoh:**
  - Email: `budi.santoso@perusahaan.com`
  - Password: `Pegawai@123`

---
*Dokumentasi ini disusun secara lengkap dan akurat mencakup seluruh arsitektur dan fitur SAMS v2.0.*
