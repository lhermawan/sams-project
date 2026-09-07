"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Download,
  Loader2,
  Users,
  CheckCircle,
  Clock,
  UserX,
  BarChart3,
  Building2,
  User,
  Calendar,
  Layers,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Send,
  X,
  Code,
  Table,
  FileDown,
  Info,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import { id } from "date-fns/locale";

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
}

interface SimpleEmployee {
  id: string;
  name: string;
  nip: string;
  department: string;
  position?: string;
}

const STATUS = {
  VALID: { label: "Hadir", class: "bg-green-100 text-green-700" },
  PENDING: { label: "Menunggu", class: "bg-yellow-100 text-yellow-700" },
  LATE: { label: "Terlambat", class: "bg-orange-100 text-orange-700" },
  ABSENT: { label: "Tidak Hadir", class: "bg-red-100 text-red-700" },
  REJECTED: { label: "Ditolak", class: "bg-red-100 text-red-700" },
  CORRECTED: { label: "Dikoreksi", class: "bg-blue-100 text-blue-700" },
} as const;

export default function ReportsPage() {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().split("T")[0];

  // Filters
  const [reportType, setReportType] = useState<"all" | "department" | "employee">("all");
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [department, setDepartment] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  // Dynamic filter options from admin inputs
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);

  // Report results
  const [records, setRecords] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | "csv" | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
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

  // Initial load: Fetch report and available departments + employees
  useEffect(() => {
    loadReport();
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams({ from, to });
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
      const res = await fetch(`/api/reports?${buildParams()}`);
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
      const res = await fetch(`/api/reports/export?${buildParams()}&type=csv`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let filename = `laporan_absensi_spreadsheet_${from}_${to}.csv`;
      if (reportType === "department" && department) {
        filename = `laporan_bagian_${department}_${from}_${to}.csv`;
      } else if (reportType === "employee" && employeeId) {
        const emp = employees.find((e) => e.id === employeeId);
        if (emp) filename = `laporan_${emp.name.replace(/\s+/g, "_")}_${from}_${to}.csv`;
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export error:", err);
    } finally {
      setExporting(null);
    }
  };

  const copyForSpreadsheet = () => {
    if (!records.length) return;
    const header = [
      "No",
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
      const payload = {
        title: "Laporan Absensi SAMS",
        generatedAt: new Date().toISOString(),
        dateFrom: from,
        dateTo: to,
        department: reportType === "department" ? department : "Semua Bagian",
        totalRecords: records.length,
        records: records.map((r, idx) => ({
          no: idx + 1,
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

  const exportExcel = async () => {
    setExporting("excel");
    try {
      const res = await fetch(`/api/reports/export?${buildParams()}&type=excel`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let filename = `laporan_absensi_${from}_${to}.xlsx`;
      if (reportType === "department" && department) {
        filename = `laporan_bagian_${department}_${from}_${to}.xlsx`;
      } else if (reportType === "employee" && employeeId) {
        const emp = employees.find((e) => e.id === employeeId);
        if (emp) filename = `laporan_${emp.name.replace(/\s+/g, "_")}_${from}_${to}.xlsx`;
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel export error:", err);
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    setExporting("pdf");
    try {
      const res = await fetch(`/api/reports/export?${buildParams()}&type=pdf`);
      const pdfData = await res.json();

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // Title
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(pdfData.title, doc.internal.pageSize.width / 2, 16, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Periode: ${pdfData.period}`, doc.internal.pageSize.width / 2, 23, { align: "center" });
      doc.text(`Bagian: ${pdfData.department}`, doc.internal.pageSize.width / 2, 29, { align: "center" });
      doc.text(`Digenerate: ${pdfData.generatedAt}`, doc.internal.pageSize.width / 2, 35, { align: "center" });

      // Summary Box
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Ringkasan Kehadiran:", 14, 43);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Total: ${pdfData.summary.total} | Hadir: ${pdfData.summary.valid} | Terlambat: ${pdfData.summary.late} | Telat Harian: ${pdfData.summary.todayLateMinutes ?? 0} mnt | Telat Mingguan: ${pdfData.summary.weeklyLateMinutes ?? 0} mnt | Telat Bulanan: ${pdfData.summary.monthlyLateMinutes ?? pdfData.summary.totalLateMinutes} mnt`,
        14,
        48
      );

      // Table
      autoTable(doc, {
        startY: 52,
        head: [["No", "ID Pegawai", "Nama Pegawai", "Bagian", "Tanggal", "Masuk", "Pulang", "Status", "Telat"]],
        body: pdfData.rows,
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell: (data: any) => {
          const statusIdx = 7;
          if (data.section === "body" && data.column.index === statusIdx) {
            const val = String(data.cell.raw ?? "");
            if (val === "Terlambat") data.cell.styles.fillColor = [254, 215, 170];
            if (val === "Tidak Hadir" || val === "Ditolak") data.cell.styles.fillColor = [254, 202, 202];
            if (val === "Hadir") data.cell.styles.fillColor = [187, 247, 208];
          }
        },
        margin: { left: 14, right: 14 },
      });

      let pdfFilename = `laporan_absensi_${from}_${to}.pdf`;
      if (reportType === "department" && department) {
        pdfFilename = `laporan_bagian_${department}_${from}_${to}.pdf`;
      } else if (reportType === "employee" && employeeId) {
        const emp = employees.find((e) => e.id === employeeId);
        if (emp) pdfFilename = `laporan_${emp.name.replace(/\s+/g, "_")}_${from}_${to}.pdf`;
      }
      doc.save(pdfFilename);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(null);
    }
  };

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Laporan Absensi & Kehadiran</h2>
        <p className="text-sm text-gray-500">
          Generate dan ekspor laporan kehadiran per pegawai, per bagian, maupun keseluruhan
        </p>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        {/* 1. Pilih Mode Laporan */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Tipe Laporan / Cakupan
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setReportType("all");
                setDepartment("");
                setEmployeeId("");
              }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border ${
                reportType === "all"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
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
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border ${
                reportType === "department"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
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
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border ${
                reportType === "employee"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <User size={16} />
              Laporan Per Pegawai
            </button>
          </div>
        </div>

        {/* 2. Specific Selectors (Per Bagian / Per Pegawai) */}
        {reportType === "department" && (
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                Pilih Bagian (Departemen)
              </label>
              <span className="text-xs text-blue-600 font-medium">
                {departments.length} Bagian terdaftar dari data pegawai
              </span>
            </div>
            {departments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  >
                    <option value="">-- Pilih Salah Satu Bagian --</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        Bagian: {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-blue-700 flex items-center gap-1.5">
                  <Info size={13} className="text-blue-500 shrink-0" />
                  <span>Pilihan bagian di atas otomatis mengikuti bagian yang pernah Anda ketik saat menginput pegawai.</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic py-2">
                Belum ada data Bagian yang diinput pada data pegawai. Silakan ketik nama bagian di halaman data pegawai terlebih dahulu.
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
              <div>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  <option value="">-- Pilih Pegawai --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (ID: {emp.nip}) - Bagian: {emp.department || "-"}
                    </option>
                  ))}
                </select>
              </div>
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

        {/* 3. Rentang Tanggal & Preset */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Pintasan Cepat</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setDatePreset("thisMonth")}
                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("lastMonth")}
                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("last7")}
                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors"
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("today")}
                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors"
              >
                Hari Ini
              </button>
            </div>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <button
            onClick={loadReport}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
            {loading ? "Memproses..." : "Tampilkan Laporan (Preview)"}
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSpreadsheetModal(true)}
              disabled={!hasLoaded}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              Input ke Spreadsheet
            </button>
            <button
              onClick={exportExcel}
              disabled={!hasLoaded || !!exporting}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-xs"
            >
              {exporting === "excel" ? <Loader2 size={16} className="animate-spin" /> : <Table size={16} />}
              Export Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={!hasLoaded || !!exporting}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-xs"
            >
              {exporting === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Scope Banner */}
      {hasLoaded && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
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
                {reportType === "department"
                  ? `Laporan Bagian: ${department || "Semua Bagian"}`
                  : reportType === "employee"
                  ? `Laporan Pegawai: ${selectedEmployee ? selectedEmployee.name : "Pegawai"}`
                  : "Laporan Seluruh Pegawai & Bagian"}
              </div>
              <div className="text-xs text-blue-100">
                Periode: {format(new Date(from), "dd MMMM yyyy", { locale: id })} – {format(new Date(to), "dd MMMM yyyy", { locale: id })}
              </div>
            </div>
          </div>
          <div className="text-xs bg-white/20 px-3 py-1.5 rounded-lg self-start sm:self-auto font-medium">
            Total {records.length} Baris Data Ditemukan
          </div>
        </div>
      )}

      {/* Summary Cards */}
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

      {/* Rekapitulasi Waktu Keterlambatan (Harian, Mingguan, Bulanan) */}
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

      {/* Preview Table */}
      {hasLoaded && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Preview Data ({records.length} baris)</h3>
          </div>
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
                <tr className="text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">No</th>
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
                    <td colSpan={10} className="text-center py-12 text-gray-400">
                      Tidak ada data kehadiran untuk filter yang dipilih
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
                            : rec.status === "ABSENT"
                            ? "bg-rose-50/40"
                            : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
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
          {/* Modal: Input Laporan ke Spreadsheet */}
      {spreadsheetModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">
                    Input & Sinkronisasi Laporan ke Spreadsheet
                  </h3>
                  <p className="text-xs text-gray-500">
                    Kirim data laporan ({records.length} baris) langsung ke Google Spreadsheet, salin 1-klik, atau unduh berkas CSV
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSpreadsheetModal(false);
                  setSheetSyncStatus(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Opsi 1: Sinkronkan Langsung ke Google Spreadsheet (Live Webhook) */}
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <h4 className="text-sm font-bold text-gray-800">
                      Input / Kirim Langsung ke Google Spreadsheet (Webhook)
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    Otomatisasi Real-Time
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Masukkan URL Webhook Google Apps Script yang terhubung dengan Google Sheet Anda. Data akan terinput otomatis ke lembar kerja.
                </p>

                <div className="space-y-2">
                  <input
                    type="url"
                    value={googleWebhookUrl}
                    onChange={(e) => setGoogleWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3.5 py-2.5 border border-emerald-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-gray-800"
                  />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowScriptGuide(!showScriptGuide)}
                      className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Code size={13} />
                      {showScriptGuide ? "Tutup Petunjuk Skrip" : "Lihat Skrip Google Apps Script (5 Baris)"}
                    </button>
                    <button
                      type="button"
                      onClick={sendToGoogleSheets}
                      disabled={isSendingToSheets || !googleWebhookUrl.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      {isSendingToSheets ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      {isSendingToSheets ? "Mengirim Data..." : "Kirim ke Google Spreadsheet Sekarang"}
                    </button>
                  </div>
                </div>

                {sheetSyncStatus && (
                  <div className="p-3 bg-white border border-emerald-300 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                    <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                    <span>{sheetSyncStatus}</span>
                  </div>
                )}

                {/* Petunjuk Apps Script */}
                {showScriptGuide && (
                  <div className="p-3.5 bg-gray-900 text-gray-100 rounded-xl text-xs space-y-2 font-mono">
                    <div className="flex items-center justify-between text-gray-300 pb-1 border-b border-gray-700 font-sans text-[11px]">
                      <span>Salin skrip ini di: Google Sheets &gt; Extensions &gt; Apps Script</span>
                      <span className="text-emerald-400">Deploy as Web App (Anyone)</span>
                    </div>
                    <pre className="text-[11px] overflow-x-auto p-2 bg-black/40 rounded-lg text-emerald-300">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["No", "Tanggal", "NIP", "Nama Pegawai", "Bagian", "Shift", "Masuk", "Pulang", "Telat (Mnt)", "Status", "Catatan"]);
  }
  data.records.forEach(function(r, i) {
    sheet.appendRow([i + 1, r.date, r.nip, r.name, r.department, r.shift, r.checkIn, r.checkOut, r.lateMinutes, r.status, r.notes]);
  });
  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}`}
                    </pre>
                  </div>
                )}
              </div>

              {/* Opsi 2: Salin 1-Klik untuk Google Sheets / Excel (Clipboard) */}
              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <h4 className="text-sm font-bold text-gray-800">
                      Salin Format Spreadsheet (Siap Paste di Google Sheets / Excel)
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-full">
                    Paling Cepat
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Salin seluruh baris tabel laporan ke clipboard. Cukup buka lembar baru di Google Sheets atau Excel, lalu tekan <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-[11px] font-mono font-bold">Ctrl + V</kbd>. Semua kolom akan otomatis terisi rapi!
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={copyForSpreadsheet}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      copySuccess
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                    {copySuccess
                      ? "Data Berhasil Disalin! Buka Spreadsheet & Tekan Ctrl+V"
                      : `Salin ${records.length} Baris Data ke Clipboard (TSV)`}
                  </button>
                </div>
              </div>

              {/* Opsi 3: Unduh Berkas Spreadsheet Standar (.csv & .xlsx) */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <h4 className="text-sm font-bold text-gray-800">
                    Unduh Berkas Spreadsheet Standar
                  </h4>
                </div>
                <p className="text-xs text-gray-500">
                  Format berkas standar yang dapat diimpor langsung melalui menu File &gt; Import di Google Sheets atau dibuka di Excel.
                </p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={exportCSV}
                    disabled={!!exporting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    {exporting === "csv" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                    Unduh Format CSV (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={exportExcel}
                    disabled={!!exporting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    {exporting === "excel" ? <Loader2 size={13} className="animate-spin" /> : <Table size={13} />}
                    Unduh Format Excel (.xlsx)
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSpreadsheetModal(false)}
                className="px-5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
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
