"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, File as FileIcon, Calendar as CalendarIcon, Briefcase, ClipboardList } from "lucide-react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from "date-fns";

export default function SuperAdminReportForm({ tenants }: { tenants: any[] }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tenantId: "ALL",
    from: "",
    to: "",
    type: "excel",
    category: "absensi" // "absensi" | "kinerja"
  });

  const setDateRange = (range: string) => {
    const now = new Date();
    let start, end;
    switch (range) {
      case "today":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "this_week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "this_month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "this_semester":
        start = startOfMonth(subMonths(now, 5));
        end = endOfMonth(now);
        break;
      case "this_year":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        return;
    }
    setForm({ ...form, from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") });
  };

  const handleExport = async () => {
    if (!form.from || !form.to) {
      alert("Pilih tanggal awal dan akhir terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({
        tenantId: form.tenantId,
        from: form.from,
        to: form.to,
        type: form.type,
        category: form.category
      });

      const res = await fetch(`/api/super-admin/reports/export?${query.toString()}`);
      if (!res.ok) throw new Error("Gagal mengexport laporan");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      let extension = form.type;
      if (form.type === "excel") extension = "xlsx";
      if (form.type === "pdf" && form.tenantId === "ALL") {
        extension = "zip";
      }
      
      a.download = `SAMS_${form.category === 'kinerja' ? 'Kinerja' : 'Absensi'}_${form.tenantId === "ALL" ? "All_Tenants" : form.tenantId}_${form.from}_to_${form.to}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Terjadi kesalahan saat mengunduh laporan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pilih Perusahaan (Tenant)
          </label>
          <select
            value={form.tenantId}
            onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">-- Semua Perusahaan (Gabungan) --</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.subdomain})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Laporan</label>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${form.category === 'absensi' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <input type="radio" name="category" value="absensi" checked={form.category === 'absensi'} onChange={(e) => setForm({ ...form, category: e.target.value })} className="sr-only" />
              <ClipboardList className="w-5 h-5" />
              <span className="font-medium text-sm">Absensi Pegawai</span>
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${form.category === 'kinerja' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <input type="radio" name="category" value="kinerja" checked={form.category === 'kinerja'} onChange={(e) => setForm({ ...form, category: e.target.value })} className="sr-only" />
              <Briefcase className="w-5 h-5" />
              <span className="font-medium text-sm">Kinerja / Kerjaan</span>
            </label>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-medium text-gray-700">Rentang Waktu</label>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setDateRange('today')} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition-colors">Hari Ini</button>
              <button onClick={() => setDateRange('this_week')} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition-colors">Minggu Ini</button>
              <button onClick={() => setDateRange('this_month')} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition-colors">Bulan Ini</button>
              <button onClick={() => setDateRange('this_semester')} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition-colors">Semester</button>
              <button onClick={() => setDateRange('this_year')} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition-colors">Tahun Ini</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={form.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Format Ekspor</label>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${form.type === 'excel' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <input type="radio" name="format" value="excel" checked={form.type === 'excel'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="sr-only" />
              <FileSpreadsheet className="w-5 h-5" />
              <span className="font-medium text-sm">Excel (.xlsx)</span>
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${form.type === 'csv' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <input type="radio" name="format" value="csv" checked={form.type === 'csv'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="sr-only" />
              <FileText className="w-5 h-5" />
              <span className="font-medium text-sm">CSV</span>
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${form.type === 'pdf' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <input type="radio" name="format" value="pdf" checked={form.type === 'pdf'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="sr-only" />
              <FileIcon className="w-5 h-5" />
              <span className="font-medium text-sm">PDF (.zip)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={handleExport}
          disabled={loading || !form.from || !form.to}
          className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download className="w-5 h-5" />
          )}
          <span>{loading ? "Memproses Data..." : "Unduh Laporan"}</span>
        </button>
      </div>
    </div>
  );
}