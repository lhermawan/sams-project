# Rencana Pengembangan 5758 (5758 Attendance System)

## Daftar Tugas (TODO) Selesai
1. [x] **Fitur Pembuatan & Manajemen Pegawai oleh Super Admin (Single & Bulk Import)**
2. [x] **Normalisasi Email Pengguna ke domain `@5758inc.id`**
3. [x] **Validasi (Lock) Absen Pulang berdasarkan jadwal shift**
4. [x] **Ubah Istilah 'Tenant' menjadi 'Mitra' pada seluruh antarmuka UI**
5. [x] **Auto-Redirect Login dari Domain Utama (5758inc.my.id)**
6. [x] **Fitur Edit Profil, Username/Email & Ubah Password Mandiri untuk Pegawai**
7. [x] **Fitur Export Data Pengguna di Panel Super Admin (Filter Mitra & Status Password)**
8. [x] **Sistem Notifikasi Tahap 1: Navigasi Deep-Link, Filter Tab Belum Dibaca, & Alert Admin (Keterlambatan Pegawai & Pengajuan Izin/Cuti)**
9. [x] **Sistem Notifikasi Tahap 2: Notifikasi Khusus Super Admin (Pendaftaran/Update Mitra, Bulk Import, & Alert Impersonasi Akun)**

---

## Daftar Tugas (TODO) Mendatang

### 1. Penataan Alur Routing Domain & Landing Page Company Profile
- [ ] **Landing Page Company Profile 5758 Inc** di domain utama (`https://5758inc.my.id`):
  - Tampilan Company Profile profesional, modern, dan mobile-friendly.
  - Tombol cepat akses **Login Super Admin**.
  - Fitur pencari/pemilih portal login untuk setiap mitra (`[nama-mitra].5758inc.my.id`).
- [ ] **Direct Login Subdomain Mitra**:
  - Akses ke `https://[nama-mitra].5758inc.my.id` langsung mengarah ke halaman login portal mitra terkait (atau dashboard jika sudah terotentikasi).
- [ ] **Penyesuaian `middleware.ts`**:
  - Memisahkan logic domain utama (public route untuk landing page) dan subdomain mitra (portal login mitra).

### 2. Modul CMS Company Profile di Panel Super Admin
- [ ] **Model & Skema Database Prisma**:
  - Pengaturan Hero/Header (Judul, Subjudul, Call-to-Action, Banner Gambar).
  - Manajemen Berita & Artikel (CRUD Berita, Thumbnail, Status Publish/Draft).
  - Manajemen Galeri Foto / Dokumentasi (Upload foto, kategori, keterangan).
  - Informasi Perusahaan & Kontak (Tentang Kami, Alamat, Kontak, Tautan Media Sosial).
- [ ] **Sidebar Navigasi Super Admin**:
  - Menambahkan grup menu CMS Company Profile (*Setting Header*, *Kelola Berita*, *Galeri Foto*, *Pengaturan Profil*).
- [ ] **Halaman CRUD CMS**:
  - Form interaktif dan manajemen media yang terintegrasi untuk memudahkan admin mengupdate konten landing page secara real-time.

### 3. Peningkatan Fitur Profil Pegawai
- [ ] **Dynamic Foto Profil**:
  - Optimasi rendering & cache busting pada file foto profil agar langsung terbaca dan tersinkronisasi secara dinamis tanpa kendala tampilan usang/stale.
