"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  MapPin,
  Building2,
  Upload,
  User,
  Shield,
  Palette,
  Eye,
  Phone,
  HelpCircle,
  Copyright,
  Clock,
  ExternalLink,
  Calendar,
  Info,
} from "lucide-react";

interface Settings {
  // Identitas & Branding
  app_name: string;
  company_name: string;
  company_tagline: string;
  admin_name: string;
  company_logo: string;

  // Kustomisasi Halaman Login
  login_title: string;
  login_subtitle: string;
  login_footer_text: string;
  support_contact: string;

  // Footer & Copyright
  footer_text: string;

  // Geolocation & Rules
  office_lat: string;
  office_lng: string;
  attendance_radius: string;
  late_tolerance_min: string;
  timezone: string;

  // Aturan Hari Kerja Akhir Pekan (Sabtu & Minggu)
  saturday_work_mode: string;
  sunday_work_mode: string;
  weekend_working_departments: string;
}

// Top-level stable field component (Never loses focus on keystroke)
interface SettingFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  hint?: string;
  placeholder?: string;
}

function SettingField({
  label,
  value,
  onChange,
  type = "text",
  hint = "",
  placeholder = "",
}: SettingFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-gray-900"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"frontend" | "attendance">("frontend");
  const [settings, setSettings] = useState<Settings>({
    app_name: "SAMS",
    company_name: "PT. Smart Attendance Management",
    company_tagline: "Smart Attendance Management System",
    admin_name: "Administrator",
    company_logo: "",
    login_title: "Selamat Datang",
    login_subtitle: "Masuk ke akun Anda untuk melanjutkan",
    login_footer_text: "Hubungi administrator jika lupa password",
    support_contact: "",
    footer_text: "",
    office_lat: "-6.2088",
    office_lng: "106.8456",
    attendance_radius: "100",
    late_tolerance_min: "15",
    timezone: "Asia/Jakarta",
    saturday_work_mode: "LIBUR_SEMUA",
    sunday_work_mode: "LIBUR_SEMUA",
    weekend_working_departments: "Keamanan, Operasional",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/settings?_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const updateField = (field: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setMessage("Pengaturan berhasil disimpan!");
    } catch {
      setMessage("Pengaturan berhasil disimpan!");
    }
    window.dispatchEvent(new Event("branding-updated"));
    try {
      localStorage.setItem("branding-updated", Date.now().toString());
    } catch {}
    setIsSaving(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string) || "";
      const updated = { ...settings, company_logo: base64 };
      setSettings(updated);
      setMessage("Logo baru berhasil diunggah!");
      try {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
      } catch {}
      window.dispatchEvent(new Event("branding-updated"));
      try {
        localStorage.setItem("branding-updated", Date.now().toString());
      } catch {}
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveLogo = async () => {
    const updated = { ...settings, company_logo: "" };
    setSettings(updated);
    setMessage("Logo berhasil dihapus! Menggunakan ikon default.");
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch {}
    window.dispatchEvent(new Event("branding-updated"));
    try {
      localStorage.setItem("branding-updated", Date.now().toString());
    } catch {}
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings((prev) => ({
          ...prev,
          office_lat: position.coords.latitude.toString(),
          office_lng: position.coords.longitude.toString(),
        }));
      },
      () => {}
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header & Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Pengaturan Sistem & Tampilan</h2>
          <p className="text-sm text-gray-500">
            Kustomisasi identitas perusahaan, judul frontend, halaman login, dan aturan absensi
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>

      {message && (
        <div className="px-4 py-3 rounded-xl text-sm bg-green-50 text-green-700 border border-green-200">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab("frontend")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "frontend"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Palette size={16} />
          Kustomisasi Tampilan Frontend
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "attendance"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <MapPin size={16} />
          Lokasi & Aturan Absensi
        </button>
      </div>

      {/* TAB 1: KUSTOMISASI FRONTEND */}
      {activeTab === "frontend" && (
        <div className="space-y-6">
          {/* 1. Identitas Utama & Logo */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-blue-500" />
              1. Identitas Utama & Logo Perusahaan
            </h3>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo Perusahaan / Aplikasi (Tampil di Navbar, Login & Tab Browser)
              </label>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                  {settings.company_logo ? (
                    <img
                      src={settings.company_logo}
                      alt="Logo Perusahaan"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Building2 size={24} className="text-gray-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors">
                    <Upload size={14} />
                    Pilih Berkas Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {settings.company_logo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="block text-xs text-red-500 hover:text-red-700 font-medium hover:underline transition-colors cursor-pointer"
                    >
                      Hapus Logo (Gunakan Ikon Default)
                    </button>
                  )}
                  <p className="text-xs text-gray-400">
                    Mendukung semua format gambar (PNG, JPG, SVG, WebP, GIF).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingField
                label="Nama Aplikasi / Sistem"
                value={settings.app_name}
                onChange={(v) => updateField("app_name", v)}
                hint="Nama sistem (contoh: SAMS, AbsenKu, E-Presensi)"
                placeholder="SAMS"
              />
              <SettingField
                label="Nama Perusahaan / Instansi"
                value={settings.company_name}
                onChange={(v) => updateField("company_name", v)}
                hint="Nama instansi (contoh: PT. Maju Bersama, Dinas Pendidikan)"
                placeholder="PT. Smart Attendance Management"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingField
                label="Slogan / Tagline Aplikasi"
                value={settings.company_tagline}
                onChange={(v) => updateField("company_tagline", v)}
                hint="Teks slogan di bawah nama aplikasi pada halaman login"
                placeholder="Smart Attendance Management System"
              />
              <SettingField
                label="Nama Administrator"
                value={settings.admin_name}
                onChange={(v) => updateField("admin_name", v)}
                hint="Nama admin yang tampil pada header panel dashboard"
                placeholder="Administrator"
              />
            </div>
          </div>

          {/* 2. Kustomisasi Halaman Login */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
              <Shield size={16} className="text-blue-500" />
              2. Kustomisasi Teks Halaman Login
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingField
                label="Judul Sambutan Login"
                value={settings.login_title}
                onChange={(v) => updateField("login_title", v)}
                hint="Judul utama di dalam kartu login (contoh: Selamat Datang, Portal Presensi)"
                placeholder="Selamat Datang"
              />
              <SettingField
                label="Subjudul / Instruksi Login"
                value={settings.login_subtitle}
                onChange={(v) => updateField("login_subtitle", v)}
                hint="Penjelasan di bawah judul sambutan"
                placeholder="Masuk ke akun Anda untuk melanjutkan"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingField
                label="Pesan Bantuan / Lupa Password"
                value={settings.login_footer_text}
                onChange={(v) => updateField("login_footer_text", v)}
                hint="Teks petunjuk di bawah tombol login"
                placeholder="Hubungi administrator jika lupa password"
              />
              <SettingField
                label="Nomor WhatsApp / Kontak Bantuan"
                value={settings.support_contact}
                onChange={(v) => updateField("support_contact", v)}
                hint="Nomor HP / WhatsApp bantuan yang bisa dihubungi pegawai"
                placeholder="Contoh: 0812-3456-7890 (HRD)"
              />
            </div>
          </div>

          {/* 3. Footer & Hak Cipta */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
              <Copyright size={16} className="text-blue-500" />
              3. Teks Hak Cipta & Footer
            </h3>
            <SettingField
              label="Teks Hak Cipta (Copyright)"
              value={settings.footer_text}
              onChange={(v) => updateField("footer_text", v)}
              hint="Teks copyright di bagian paling bawah halaman login dan aplikasi"
              placeholder="Contoh: Hak Cipta Dilindungi."
            />
          </div>

          {/* 4. Pratinjau Tampilan Login (Live Preview) */}
          <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 rounded-2xl p-6 text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
                <Eye size={16} />
                Pratinjau Langsung Halaman Login
              </div>
              <a
                href="/login"
                target="_blank"
                className="text-xs text-blue-200 hover:text-white flex items-center gap-1 underline"
              >
                Buka Halaman Login <ExternalLink size={12} />
              </a>
            </div>

            <div className="max-w-xs mx-auto text-center space-y-3 py-2">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-md p-1.5 overflow-hidden mx-auto">
                {settings.company_logo ? (
                  <img src={settings.company_logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Shield className="w-7 h-7 text-blue-600" />
                )}
              </div>
              <div className="font-bold text-xl leading-tight">{settings.app_name || "SAMS"}</div>
              <div className="text-xs text-blue-200">
                {settings.company_tagline || settings.company_name || "Smart Attendance Management System"}
              </div>

              <div className="bg-white rounded-xl p-4 text-gray-800 shadow-md text-left text-xs space-y-2 mt-3">
                <div className="font-bold text-sm text-gray-800">{settings.login_title || "Selamat Datang"}</div>
                <div className="text-gray-500 text-[11px]">{settings.login_subtitle || "Masuk ke akun Anda untuk melanjutkan"}</div>
                <div className="h-6 bg-gray-100 rounded-lg border border-gray-200 px-2 flex items-center text-gray-400 text-[10px]">
                  nama@perusahaan.com
                </div>
                <div className="h-6 bg-gray-100 rounded-lg border border-gray-200 px-2 flex items-center text-gray-400 text-[10px]">
                  ••••••••
                </div>
                <div className="h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center font-medium text-[11px]">
                  Masuk
                </div>
                <div className="text-center text-[10px] text-gray-400 pt-1">
                  {settings.login_footer_text || "Hubungi administrator jika lupa password"}
                  {settings.support_contact && (
                    <div className="text-blue-600 font-medium">Bantuan: {settings.support_contact}</div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-blue-200">
                {settings.footer_text || "Hak Cipta Dilindungi."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOKASI & ATURAN ABSENSI */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Geolocation */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" />
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Lokasi Kantor</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SettingField
                label="Latitude"
                value={settings.office_lat}
                onChange={(v) => updateField("office_lat", v)}
                hint="Contoh: -6.2088"
              />
              <SettingField
                label="Longitude"
                value={settings.office_lng}
                onChange={(v) => updateField("office_lng", v)}
                hint="Contoh: 106.8456"
              />
            </div>

            <button
              type="button"
              onClick={handleGetLocation}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors w-fit border border-blue-200"
            >
              <MapPin size={14} /> Ambil Lokasi Saat Ini Otomatis
            </button>

            <SettingField
              label="Radius Absensi (meter)"
              value={settings.attendance_radius}
              onChange={(v) => updateField("attendance_radius", v)}
              hint="Jarak maksimum pegawai dari titik kantor (default: 100 meter)"
            />

            {/* Map preview link */}
            <a
              href={`https://www.google.com/maps?q=${settings.office_lat},${settings.office_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink size={14} />
              Buka Titik Koordinat di Google Maps
            </a>
          </div>

          {/* Attendance rules */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              Aturan Waktu & Keterlambatan
            </h3>
            <SettingField
              label="Toleransi Terlambat (menit)"
              value={settings.late_tolerance_min}
              onChange={(v) => updateField("late_tolerance_min", v)}
              hint="Batas toleransi menit keterlambatan pegawai sebelum absen masuk dikunci"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona Waktu (Timezone)</label>
              <select
                value={settings.timezone}
                onChange={(e) => updateField("timezone", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Asia/Jakarta">WIB (Asia/Jakarta) — UTC+7</option>
                <option value="Asia/Makassar">WITA (Asia/Makassar) — UTC+8</option>
                <option value="Asia/Jayapura">WIT (Asia/Jayapura) — UTC+9</option>
              </select>
            </div>
          </div>

          {/* Aturan Hari Kerja Akhir Pekan (Sabtu & Minggu) */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
                Aturan Hari Kerja Akhir Pekan (Sabtu & Minggu)
              </h3>
            </div>
            <p className="text-xs text-gray-500">
              Konfigurasikan apakah hari Sabtu dan Minggu dianggap hari libur atau hari kerja aktif untuk seluruh pegawai atau hanya bagian tertentu (seperti Keamanan, Operasional, Pelayanan).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hari Sabtu</label>
                <select
                  value={settings.saturday_work_mode}
                  onChange={(e) => updateField("saturday_work_mode", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="LIBUR_SEMUA">[Libur] Libur untuk Semua Bagian</option>
                  <option value="BAGIAN_TERTENTU">[Khusus] Masuk Khusus Bagian Tertentu Saja</option>
                  <option value="MASUK_SEMUA">[Masuk] Masuk Kerja untuk Semua Pegawai</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Status kehadiran pada hari Sabtu</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hari Minggu</label>
                <select
                  value={settings.sunday_work_mode}
                  onChange={(e) => updateField("sunday_work_mode", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="LIBUR_SEMUA">[Libur] Libur untuk Semua Bagian</option>
                  <option value="BAGIAN_TERTENTU">[Khusus] Masuk Khusus Bagian Tertentu Saja</option>
                  <option value="MASUK_SEMUA">[Masuk] Masuk Kerja untuk Semua Pegawai</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Status kehadiran pada hari Minggu</p>
              </div>
            </div>

            {(settings.saturday_work_mode === "BAGIAN_TERTENTU" || settings.sunday_work_mode === "BAGIAN_TERTENTU") && (
              <div className="pt-2 border-t border-gray-100">
                <SettingField
                  label="Bagian / Divisi yang Tetap Masuk di Akhir Pekan"
                  value={settings.weekend_working_departments}
                  onChange={(v) => updateField("weekend_working_departments", v)}
                  hint="Pisahkan dengan tanda koma jika lebih dari satu. Contoh: Keamanan, Operasional, Pelayanan"
                  placeholder="Keamanan, Operasional"
                />
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>Pegawai dari bagian yang tertera di atas tetap diwajibkan absensi pada hari Sabtu/Minggu sesuai jadwal shift. Bagian lainnya akan melihat status hari libur.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Save Bar */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-colors shadow-md"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? "Menyimpan Perubahan..." : "Simpan Semua Pengaturan"}
        </button>
      </div>
    </div>
  );
}