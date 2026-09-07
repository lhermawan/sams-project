# PANDUAN DEPLOYMENT & HOSTING SAMS (Smart Attendance Management System)

Aplikasi ini dibangun menggunakan **Next.js 16 (App Router)**, **Tailwind CSS**, **Prisma ORM**, dan **SQLite**.

---

## ?? 1. Kredensial Akun Bawaan (Default Login)
* **Akun Admin:**
  * **Email:** `admin@sams.id`
  * **Password:** `Admin@123`
* **Akun Pegawai:**
  * **Email:** `ahmad.rizki@sams.id`
  * **Password:** `Pegawai@123`

---

## ?? 2. Cara Menjalankan di Server / VPS (Ubuntu / Debian / CentOS)

### Langkah 1: Persiapan Server
Pastikan server sudah terpasang **Node.js (versi 18 ke atas atau v20 LTS)** dan **npm**.
```bash
# Cek versi Node.js
node -v
npm -v
```

### Langkah 2: Ekstrak dan Masuk ke Folder Project
```bash
unzip sams-project.zip -d sams
cd sams
```

### Langkah 3: Install Dependensi
```bash
npm install
```

### Langkah 4: Sinkronisasi Database Prisma
File database SQLite bawaan sudah ada di `prisma/dev.db`. Jalankan:
```bash
npx prisma generate
```

### Langkah 5: Build Aplikasi
```bash
npm run build
```

### Langkah 6: Jalankan Aplikasi dengan PM2 (Background Daemon)
Agar aplikasi selalu berjalan dan otomatis restart jika server reboot:
```bash
# Install PM2 jika belum ada
npm install -g pm2

# Jalankan aplikasi pada port yang diinginkan (misal port 3001 atau 3000)
pm2 start npm --name "sams" -- start -- -p 3001

# Simpan proses agar otomatis aktif saat restart
pm2 save
pm2 startup
```

---

## ?? 3. Cara Menjalankan Menggunakan Docker

Project ini sudah dilengkapi dengan `Dockerfile` standar produksi:
```bash
# 1. Build Image Docker
docker build -t sams-app .

# 2. Jalankan Container
docker run -d -p 3001:3000 --name sams-container sams-app
```
Aplikasi langsung dapat diakses di `http://ip-server-anda:3001`.

---

## ?? 4. Cara Hosting di Platform Cloud (Vercel / Railway / Render)

### A. Railway (Sangat Direkomendasikan untuk SQLite & Next.js)
1. Unggah project ini ke repository GitHub pribadi Anda.
2. Buka [railway.app](https://railway.app) dan pilih **"New Project"** -> **"Deploy from GitHub repo"**.
3. Tambahkan environment variable pada menu Variables di Railway:
   * `NEXTAUTH_SECRET`: (buat string acak panjang, misal `super-secret-sams-2026`)
   * `NEXTAUTH_URL`: URL domain yang diberikan Railway (contoh: `https://sams-production.up.railway.app`)
4. Deploy selesai!

### B. Netlify (Menggunakan netlify.toml bawaan)
1. Unggah isi folder project ke GitHub.
2. Buka [app.netlify.com](https://app.netlify.com) dan login dengan akun GitHub Anda.
3. Klik **"Add new site"** -> **"Import an existing project"** -> Pilih **GitHub** -> Pilih repositori Anda.
4. Netlify akan otomatis mendeteksi berkas `netlify.toml` yang sudah kami sediakan:
   * Build command: `npx prisma generate && npm run build`
   * Publish directory: `.next`
   * Plugin: `@netlify/plugin-nextjs`
5. Pada menu **Environment variables**, tambahkan:
   * `NEXTAUTH_SECRET`: string rahasia bebas (misal `sams-secret-netlify-2026`)
   * `NEXTAUTH_URL`: domain dari Netlify Anda (misal `https://sams-app.netlify.app`)
6. Klik **"Deploy site"**. Dalam 1-2 menit aplikasi langsung live di internet!

### C. Vercel
1. Unggah folder ke GitHub.
2. Import project ke [vercel.com](https://vercel.com).
3. Catatan Serverless: Baik di Vercel maupun Netlify yang berbasis serverless edge, file database lokal `dev.db` berada di environment stateless. Untuk database persisten jangka panjang di Netlify/Vercel, Anda dapat menghubungkannya ke PostgreSQL gratis (seperti Supabase atau Neon). Untuk SQLite tanpa ubah konfigurasi database, Railway/VPS adalah pilihan paling mulus.

---

## ?? 5. Konfigurasi Variabel Lingkungan (.env)
File `.env` sudah disertakan di dalam project:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3001"
```
*Ganti `NEXTAUTH_URL` dengan domain publik Anda (contoh `https://absensi.perusahaananda.com`) saat naik ke produksi.*
