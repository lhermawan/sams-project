"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  Users,
  CheckCircle,
  Clock,
  UserX,
  BarChart3,
  Building2,
  User,
  Calendar as CalendarIcon,
  Layers,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Send,
  X,
  Code,
  Table,
  Info,
  Briefcase,
  ClipboardList,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import { id } from "date-fns/locale";

export interface TenantOption {
  id: string;
  name: string;
  subdomain: string;
}

interface Summary {
  total: number;
  valid: number;
  late: number;
  absent: number;
  pending: number;
  totalLateMinutes: number;
  todayLateMinutes?: number;
  weeklyLateMinutes?: number;
  monthlyLateMinutes?: number;
}

interface ReportRow {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  lateMinutes: number;
  status: string;
  adminNotes: string | null;
  employee: { id: string; name: string; nip: string; department: string; position: string };
  shift: { name: string } | null;
  tenant: { id: string; name: string; subdomain: string } | null;
}

interface SimpleEmployee {
  id: string;
  name: string;
  nip: string;
  department: string;
  position?: string;
  tenantId?: string;
}

const STATUS = {
  VALID: { label: "Hadir", class: "bg-green-100 text-green-700" },
  PENDING: { label: "Menunggu", class: "bg-yellow-100 text-yellow-700" },
  LATE: { label: "Terlambat", class: "bg-orange-100 text-orange-700" },
  ABSENT: { label: "Tidak Hadir", class: "bg-red-100 text-red-700" },
  REJECTED: { label: "Ditolak", class: "bg-red-100 text-red-700" },
  CORRECTED: { label: "Dikoreksi", class: "bg-blue-100 text-blue-700" },
} as const;

export default function SuperAdminReportForm({ tenants }: { tenants: TenantOption[] }) {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().split("T")[0];

  // 1. Selector Tenant Utama
  const [tenantId, setTenantId] = useState("ALL");

  // 2. Kategori & Mode Laporan
  const [category, setCategory] = useState<"absensi" | "kinerja">("absensi");
  const [reportType, setReportType] = useState<"all" | "department" | "employee">("all");
  const [department, setDepartment] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  // 3. Rentang Tanggal
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);

  // Dynamic filter options based on tenant selection
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);

  // Report results
  const [records, setRecords] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | "csv" | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Spreadsheet integration modal state
  const [spreadsheetModal, setSpreadsheetModal] = useState(false);
  const [googleWebhookUrl, setGoogleWebhookUrl] = useState("");
  const [isSendingToSheets, setIsSendingToSheets] = useState(false);
  const [sheetSyncStatus, setSheetSyncStatus] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sams_google_webhook");
      if (saved) setGoogleWebhookUrl(saved);
    } catch {}
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams({ from, to, tenantId, category });
    if (reportType === "department" && department) {
      p.set("department", department);
    } else if (reportType === "employee" && employeeId) {
      p.set("employeeId", employeeId);
    }
    return p;
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/reports?${buildParams().toString()}`);
      const data = await res.json();
      setRecords(data.records ?? []);
      setSummary(data.summary ?? null);
      if (data.departments && Array.isArray(data.departments)) {
        setDepartments(data.departments);
      }
      if (data.employees && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
      setHasLoaded(true);
    } catch (err) {
      console.error("Load report error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Otomatis muat data awal dan saat tenant berubah
  useEffect(() => {
    setDepartment("");
    setEmployeeId("");
    loadReport();
  }, [tenantId]);

  const setDatePreset = (preset: "today" | "last7" | "thisMonth" | "lastMonth") => {
    const d = new Date();
    if (preset === "today") {
      const t = d.toISOString().split("T")[0];
      setFrom(t);
      setTo(t);
    } else if (preset === "last7") {
      setFrom(subDays(d, 7).toISOString().split("T")[0]);
      setTo(d.toISOString().split("T")[0]);
    } else if (preset === "thisMonth") {
      setFrom(startOfMonth(d).toISOString().split("T")[0]);
      setTo(endOfMonth(d).toISOString().split("T")[0]);
    } else if (preset === "lastMonth") {
      const prev = subMonths(d, 1);
      setFrom(startOfMonth(prev).toISOString().split("T")[0]);
      setTo(endOfMonth(prev).toISOString().split("T")[0]);
    }
  };

  const exportCSV = async () => {
    setExporting("csv");
    try {
      const p = buildParams();
      p.set("type", "csv");
      const res = await fetch(`/api/super-admin/reports/export?${p.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const tName = tenantId === "ALL" ? "Semua_Perusahaan" : (tenants.find((t) => t.id === tenantId)?.subdomain || tenantId);
      a.download = `SAMS_${category === "kinerja" ? "Kinerja" : "Absensi"}_${tName}_${from}_${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export error:", err);
      alert("Gagal mengunduh CSV");
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = async () => {
    setExporting("excel");
    try {
      const p = buildParams();
      p.set("type", "excel");
      const res = await fetch(`/api/super-admin/reports/export?${p.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const tName = tenantId === "ALL" ? "Semua_Perusahaan" : (tenants.find((t) => t.id === tenantId)?.subdomain || tenantId);
      a.download = `SAMS_${category === "kinerja" ? "Kinerja" : "Absensi"}_${tName}_${from}_${to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Gagal mengunduh Excel");
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    setExporting("pdf");
    try {
      const p = buildParams();
      p.set("type", "pdf");
      const res = await fetch(`/api/super-admin/reports/export?${p.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const tName = tenantId === "ALL" ? "All_Tenants" : (tenants.find((t) => t.id === tenantId)?.subdomain || tenantId);
      const ext = tenantId === "ALL" ? "zip" : "pdf";
      a.download = `SAMS_${category === "kinerja" ? "Kinerja" : "Absensi"}_${tName}_${from}_${to}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Gagal mengunduh PDF");
    } finally {
      setExporting(null);
    }
  };

  const copyForSpreadsheet = () => {
    if (!records.length) return;
    const header = [
      "No",
      "Perusahaan",
      "NIP",
      "Nama Pegawai",
      "Bagian",
      "Jabatan",
      "Tanggal",
      "Shift",
      "Jam Masuk",
      "Jam Pulang",
      "Status",
      "Keterlambatan (Menit)",
      "Catatan Admin",
    ].join("\t");

    const rows = records.map((r, i) =>
      [
        i + 1,
        r.tenant?.name || "-",
        r.employee.nip,
        r.employee.name,
        r.employee.department,
        r.employee.position || "-",
        format(new Date(r.date), "yyyy-MM-dd"),
        r.shift?.name || "Reguler",
        r.checkInTime ? format(new Date(r.checkInTime), "HH:mm") : "-",
        r.checkOutTime ? format(new Date(r.checkOutTime), "HH:mm") : "-",
        STATUS[r.status as keyof typeof STATUS]?.label || r.status,
        r.lateMinutes || 0,
        r.adminNotes || "-",
      ].join("\t")
    );

    const tsv = [header, ...rows].join("\n");
    navigator.clipboard.writeText(tsv);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const sendToGoogleSheets = async () => {
    if (!googleWebhookUrl.trim()) return;
    setIsSendingToSheets(true);
    setSheetSyncStatus(null);
    try {
      localStorage.setItem("sams_google_webhook", googleWebhookUrl.trim());
      const selectedTenantObj = tenants.find((t) => t.id === tenantId);
      const payload = {
        title: "Laporan Absensi SAMS Super Admin",
        generatedAt: new Date().toISOString(),
        tenant: tenantId === "ALL" ? "Semua Perusahaan" : (selectedTenantObj?.name || tenantId),
        dateFrom: from,
        dateTo: to,
        department: reportType === "department" ? department : "Semua Bagian",
        totalRecords: records.length,
        records: records.map((r, idx) => ({
          no: idx + 1,
          tenant: r.tenant?.name || "-",
          date: format(new Date(r.date), "yyyy-MM-dd"),
          nip: r.employee.nip,
          name: r.employee.name,
          department: r.employee.department,
          position: r.employee.position || "-",
          shift: r.shift?.name || "Reguler",
          checkIn: r.checkInTime ? format(new Date(r.checkInTime), "HH:mm") : "-",
          checkOut: r.checkOutTime ? format(new Date(r.checkOutTime), "HH:mm") : "-",
          lateMinutes: r.lateMinutes || 0,
          status: STATUS[r.status as keyof typeof STATUS]?.label || r.status,
          notes: r.adminNotes || "",
        })),
      };

      await fetch(googleWebhookUrl.trim(), {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setSheetSyncStatus(`Berhasil mengirim ${records.length} data ke Google Spreadsheet!`);
    } catch (err: any) {
      setSheetSyncStatus(`Gagal mengirim: ${err.message || "Periksa kembali URL Webhook"}`);
    } finally {
      setIsSendingToSheets(false);
    }
  };

  const selectedTenantObj = tenants.find((t) => t.id === tenantId);
  const selectedEmployee = employees.find((e) => e.id === employeeId);

  return (
    <div className="space-y-6">
      {/* ── CARD FILTER UTAMA ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-5">
        {/* 1. Selector Tenant Utama */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4.5 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={16} className="text-indigo-600" />
              Pilih Perusahaan (Tenant)
            </label>
            <span className="text-xs text-indigo-700 font-medium bg-white px-2.5 py-1 rounded-full border border-indigo-200 w-fit">
              {tenantId === "ALL"
                ? `Total ${tenants.length} Perusahaan Terdaftar`
                : `${selectedTenantObj?.name || ""} (${selectedTenantObj?.subdomain}.niskala.id)`}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="sm:col-span-2">
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
              >
                <option value="ALL">-- Semua Perusahaan (Gabungan Seluruh Tenant) --</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subdomain}.niskala.id)
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-indigo-800 flex items-center gap-1.5 bg-white/60 p-2.5 rounded-xl border border-indigo-100">
              <Info size={14} className="text-indigo-600 shrink-0" />
              <span>Memilih perusahaan spesifik akan memuat daftar bagian & pegawai tenant tersebut.</span>
            </div>
          </div>
        </div>

        {/* 2. Jenis Kategori Laporan */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Jenis Laporan
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCategory("absensi")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                category === "absensi"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <ClipboardList size={16} />
              Presensi & Kehadiran Pegawai
            </button>

            <button
              type="button"
              onClick={() => setCategory("kinerja")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                category === "kinerja"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <Briefcase size={16} />
              Rekap Kinerja / Tugas (Patroli & Handover)
            </button>
          </div>
        </div>

        {/* 3. Tipe Cakupan Laporan */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Cakupan Laporan
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setReportType("all");
                setDepartment("");
                setEmployeeId("");
              }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                reportType === "all"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <Building2 size={16} />
              Semua Pegawai & Bagian
            </button>

            <button
              type="button"
              onClick={() => {
                setReportType("department");
                setEmployeeId("");
                if (!department && departments.length > 0) {
                  setDepartment(departments[0]);
                }
              }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                reportType === "department"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <Layers size={16} />
              Laporan Per Bagian
            </button>

            <button
              type="button"
              onClick={() => {
                setReportType("employee");
                setDepartment("");
                if (!employeeId && employees.length > 0) {
                  setEmployeeId(employees[0].id);
                }
              }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                reportType === "employee"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <User size={16} />
              Laporan Per Pegawai
            </button>
          </div>
        </div>

        {/* 4. Selector Dinamis (Per Bagian / Per Pegawai) */}
        {reportType === "department" && (
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                Pilih Bagian (Departemen)
              </label>
              <span className="text-xs text-blue-600 font-medium">
                {departments.length} Bagian terdaftar
              </span>
            </div>
            {departments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
                >
                  <option value="">-- Semua Bagian di Tenant Ini --</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      Bagian: {d}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-blue-700 flex items-center gap-1.5">
                  <Info size={13} className="text-blue-500 shrink-0" />
                  <span>Daftar bagian otomatis terfilter sesuai tenant yang dipilih di atas.</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic py-2">
                Belum ada data Bagian pada perusahaan terpilih.
              </div>
            )}
          </div>
        )}

        {reportType === "employee" && (
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                Pilih Pegawai
              </label>
              <span className="text-xs text-blue-600 font-medium">
                {employees.length} Pegawai tersedia
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
              >
                <option value="">-- Pilih Pegawai --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} (ID: {emp.nip}) - Bagian: {emp.department || "-"}
                  </option>
                ))}
              </select>
              {selectedEmployee && (
                <div className="text-xs text-blue-800 bg-white p-2.5 rounded-lg border border-blue-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">
                    {selectedEmployee.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold">{selectedEmployee.name}</div>
                    <div className="text-[11px] text-gray-500">
                      ID Pegawai: {selectedEmployee.nip} · Bagian: {selectedEmployee.department}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Rentang Tanggal & Pintasan Cepat */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Pintasan Cepat</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setDatePreset("thisMonth")}
                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("lastMonth")}
                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors cursor-pointer"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("last7")}
                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors cursor-pointer"
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("today")}
                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
            </div>
          </div>
        </div>

        {/* 6. Tombol Aksi & Ekspor */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
            {loading ? "Memproses Data..." : "Tampilkan Laporan (Preview)"}
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSpreadsheetModal(true)}
              disabled={!hasLoaded}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              Input ke Spreadsheet
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={!hasLoaded || !!exporting}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-xs cursor-pointer"
            >
              {exporting === "excel" ? <Loader2 size={16} className="animate-spin" /> : <Table size={16} />}
              Export Excel
            </button>
            <button
              type="button"
              onClick={exportPDF}
              disabled={!hasLoaded || !!exporting}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-xs cursor-pointer"
            >
              {exporting === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Export PDF
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={!hasLoaded || !!exporting}
              className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-xs cursor-pointer"
            >
              {exporting === "csv" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── SCOPE BANNER ───────────────────────────────────────────────────── */}
      {hasLoaded && (
        <div className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white rounded-2xl p-4.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              {reportType === "department" ? (
                <Layers size={20} />
              ) : reportType === "employee" ? (
                <User size={20} />
              ) : (
                <Building2 size={20} />
              )}
            </div>
            <div>
              <div className="font-bold text-base">
                {tenantId === "ALL" ? "Semua Perusahaan (Gabungan)" : selectedTenantObj?.name || "Perusahaan"}
                {" · "}
                {reportType === "department"
                  ? `Bagian: ${department || "Semua Bagian"}`
                  : reportType === "employee"
                  ? `Pegawai: ${selectedEmployee ? selectedEmployee.name : "Pegawai"}`
                  : "Seluruh Pegawai"}
              </div>
              <div className="text-xs text-indigo-100 mt-0.5">
                Kategori: {category === "kinerja" ? "Rekap Kinerja Pegawai" : "Presensi & Kehadiran"} · Periode:{" "}
                {format(new Date(from), "dd MMMM yyyy", { locale: id })} –{" "}
                {format(new Date(to), "dd MMMM yyyy", { locale: id })}
              </div>
            </div>
          </div>
          <div className="text-xs bg-white/20 px-3.5 py-1.5 rounded-lg self-start sm:self-auto font-semibold">
            Total {records.length} Baris Data
          </div>
        </div>
      )}

      {/* ── SUMMARY CARDS ──────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Absensi", value: summary.total, icon: Users, color: "bg-blue-50 text-blue-700 border-blue-100" },
            { label: "Hadir Tepat Waktu", value: summary.valid, icon: CheckCircle, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
            { label: "Terlambat", value: summary.late, icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-100" },
            { label: "Tidak Hadir", value: summary.absent, icon: UserX, color: "bg-rose-50 text-rose-700 border-rose-100" },
            { label: "Total Menit Telat", value: `${summary.totalLateMinutes} mnt`, icon: Clock, color: "bg-purple-50 text-purple-700 border-purple-100" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-4.5 ${s.color} border shadow-2xs`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                <s.icon size={18} className="opacity-80" />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── REKAPITULASI WAKTU KETERLAMBATAN (HARIAN, MINGGUAN, BULANAN) ───── */}
      {summary && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 rounded-2xl p-5 border border-amber-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Clock size={18} className="text-amber-600" />
              <span>Rekapitulasi Total Waktu Keterlambatan (Harian, Mingguan, Bulanan)</span>
            </div>
            <span className="text-xs text-amber-800 bg-amber-100/90 px-3 py-1 rounded-full font-semibold border border-amber-200 self-start sm:self-auto">
              Total Periode Terpilih: {summary.totalLateMinutes} Menit
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Harian */}
            <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <span>Keterlambatan Harian</span>
                <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">Hari Ini</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-900">
                {summary.todayLateMinutes ?? 0} <span className="text-sm font-semibold text-gray-500">menit</span>
              </div>
              <p className="text-[11px] text-gray-400">Total akumulasi menit terlambat pegawai pada hari ini</p>
            </div>

            {/* Mingguan */}
            <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <span>Keterlambatan Mingguan</span>
                <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">Minggu Ini</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-900">
                {summary.weeklyLateMinutes ?? 0} <span className="text-sm font-semibold text-gray-500">menit</span>
              </div>
              <p className="text-[11px] text-gray-400">Akumulasi menit terlambat minggu ini (Senin – Minggu)</p>
            </div>

            {/* Bulanan */}
            <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <span>Keterlambatan Bulanan</span>
                <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">Bulan Ini</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-900">
                {summary.monthlyLateMinutes ?? summary.totalLateMinutes} <span className="text-sm font-semibold text-gray-500">menit</span>
              </div>
              <p className="text-[11px] text-gray-400">Akumulasi menit keterlambatan pada bulan berjalan</p>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW TABLE DATA ──────────────────────────────────────────────── */}
      {hasLoaded && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-sm">Preview Data ({records.length} baris)</h3>
          </div>
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">No</th>
                  {tenantId === "ALL" && <th className="px-4 py-3 text-left">Perusahaan</th>}
                  <th className="px-4 py-3 text-left">ID Pegawai</th>
                  <th className="px-4 py-3 text-left">Nama Pegawai</th>
                  <th className="px-4 py-3 text-left">Bagian</th>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Jam Masuk</th>
                  <th className="px-4 py-3 text-left">Jam Pulang</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Keterlambatan</th>
                  <th className="px-4 py-3 text-left">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={tenantId === "ALL" ? 11 : 10} className="text-center py-12 text-gray-400">
                      Tidak ada data kehadiran untuk filter dan perusahaan yang dipilih.
                    </td>
                  </tr>
                ) : (
                  records.map((rec, i) => {
                    const st = STATUS[rec.status as keyof typeof STATUS] ?? { label: rec.status, class: "bg-gray-100 text-gray-700" };
                    return (
                      <tr
                        key={rec.id}
                        className={`${
                          rec.status === "LATE"
                            ? "bg-amber-50/40"
                            : rec.status === "ABSENT" || rec.status === "REJECTED"
                            ? "bg-rose-50/40"
                            : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        {tenantId === "ALL" && (
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-medium">
                              {rec.tenant?.name || "-"}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{rec.employee.nip}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{rec.employee.name}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            {rec.employee.department || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {format(new Date(rec.date), "dd MMM yyyy", { locale: id })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {rec.checkInTime ? format(new Date(rec.checkInTime), "HH:mm") : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {rec.checkOutTime ? format(new Date(rec.checkOutTime), "HH:mm") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.class}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {rec.lateMinutes > 0 ? (
                            <span className="text-amber-700 font-bold text-xs">{rec.lateMinutes} menit</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {rec.adminNotes || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL INPUT KE SPREADSHEET (GOOGLE SHEETS INTEGRATION) ─────────── */}
      {spreadsheetModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">Input ke Google Spreadsheet / Excel</h3>
                  <p className="text-xs text-gray-500">Pilih metode integrasi data yang paling mudah untuk Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSpreadsheetModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* OPSI 1: Salin Instan (Copy & Paste) */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Copy size={14} className="text-blue-600" />
                  Metode 1: Salin Langsung (Copy & Paste)
                </span>
                <span className="text-[11px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                  Paling Cepat
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Salin seluruh data yang sedang ditampilkan ke clipboard dalam format tab-separated (TSV), lalu buka Google Spreadsheet atau Microsoft Excel dan tekan <kbd className="px-1.5 py-0.5 bg-gray-200 rounded font-mono text-[11px]">Ctrl + V</kbd>.
              </p>
              <button
                type="button"
                onClick={copyForSpreadsheet}
                className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
              >
                {copySuccess ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copySuccess ? "Data Berhasil Disalin ke Clipboard!" : `Salin ${records.length} Baris Data ke Clipboard`}
              </button>
            </div>

            {/* OPSI 2: Google Apps Script Webhook */}
            <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600" />
                  Metode 2: Webhook Otomatis Google Apps Script
                </span>
                <span className="text-[11px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Otomatis
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Kirim data langsung ke Spreadsheet melalui URL Webhook Google Apps Script yang sudah Anda deploy.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  URL Webhook Google Apps Script (Web App URL)
                </label>
                <input
                  type="url"
                  value={googleWebhookUrl}
                  onChange={(e) => setGoogleWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                />
              </div>

              {sheetSyncStatus && (
                <div className={`p-2.5 rounded-lg text-xs font-medium ${sheetSyncStatus.includes("Berhasil") ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                  {sheetSyncStatus}
                </div>
              )}

              <button
                type="button"
                onClick={sendToGoogleSheets}
                disabled={isSendingToSheets || !googleWebhookUrl.trim() || records.length === 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                {isSendingToSheets ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {isSendingToSheets ? "Mengirim Data..." : "Kirim Data ke Google Spreadsheet"}
              </button>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowScriptGuide(!showScriptGuide)}
                  className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Code size={13} />
                  {showScriptGuide ? "Sembunyikan Kode Apps Script" : "Lihat Contoh Kode Google Apps Script"}
                </button>
              </div>

              {showScriptGuide && (
                <div className="bg-gray-900 text-gray-100 rounded-xl p-3 text-[11px] font-mono space-y-2 overflow-x-auto">
                  <div className="flex justify-between items-center text-gray-400 pb-1 border-b border-gray-700">
                    <span>Code.gs</span>
                    <button
                      type="button"
                      onClick={() => {
                        const script = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["No", "Perusahaan", "Tanggal", "NIP", "Nama Pegawai", "Bagian", "Jabatan", "Shift", "Jam Masuk", "Jam Pulang", "Keterlambatan (Menit)", "Status", "Catatan"]);
    }
    data.records.forEach(function(r) {
      sheet.appendRow([r.no, r.tenant, r.date, r.nip, r.name, r.department, r.position, r.shift, r.checkIn, r.checkOut, r.lateMinutes, r.status, r.notes]);
    });
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
                        navigator.clipboard.writeText(script);
                        alert("Kode Apps Script berhasil disalin!");
                      }}
                      className="text-xs text-blue-400 hover:underline cursor-pointer"
                    >
                      Salin Kode
                    </button>
                  </div>
                  <pre className="text-gray-300 leading-relaxed">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["No", "Perusahaan", "Tanggal", "NIP", "Nama Pegawai", "Bagian", "Jabatan", "Shift", "Jam Masuk", "Jam Pulang", "Keterlambatan", "Status", "Catatan"]);
  }
  data.records.forEach(function(r) {
    sheet.appendRow([r.no, r.tenant, r.date, r.nip, r.name, r.department, r.position, r.shift, r.checkIn, r.checkOut, r.lateMinutes, r.status, r.notes]);
  });
  return ContentService.createTextOutput(JSON.stringify({status: "success"}));
}`}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSpreadsheetModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}