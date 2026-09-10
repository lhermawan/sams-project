"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Calendar, Search, Download, AlertCircle, FileText, Activity } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface KinerjaRecord {
  id: string;
  nip: string;
  name: string;
  department: string;
  position: string;
  score: number;
  countValid: number;
  countLate: number;
  countAbsent: number;
  totalLateMinutes: number;
  countPatroli: number;
  countHandover: number;
}

export default function KinerjaPage() {
  const [records, setRecords] = useState<KinerjaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // default to current month
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [dateFrom, setDateFrom] = useState(startOfMonth.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(endOfMonth.toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/performance?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) {
        throw new Error("Gagal memuat data kinerja");
      }
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const filteredRecords = records.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            Kinerja Pegawai
          </h2>
          <p className="text-sm text-gray-500">
            Laporan performa berdasarkan kehadiran, ketepatan waktu, dan penyelesaian tugas.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Pencarian</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama, NIP, atau departemen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Pegawai</th>
                <th className="px-6 py-4 font-medium text-center">Skor Kinerja</th>
                <th className="px-6 py-4 font-medium text-center">Kehadiran (H / T / M)</th>
                <th className="px-6 py-4 font-medium text-center">Total Keterlambatan</th>
                <th className="px-6 py-4 font-medium text-center">Laporan Patroli</th>
                <th className="px-6 py-4 font-medium text-center">Serah Terima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Activity size={24} className="animate-spin mx-auto mb-2" />
                    Memuat data kinerja...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle size={24} className="mx-auto mb-2 text-gray-400" />
                    Tidak ada data kinerja ditemukan.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{record.name}</div>
                      <div className="text-xs text-gray-500">{record.nip} - {record.department}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold ${
                        record.score >= 80 ? 'bg-green-100 text-green-700' :
                        record.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.score}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs font-medium">
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded" title="Hadir (Valid)">{record.countValid}</span>
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded" title="Terlambat">{record.countLate}</span>
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded" title="Tidak Hadir / Ditolak">{record.countAbsent}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-medium ${record.totalLateMinutes > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {record.totalLateMinutes} menit
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">
                      {record.countPatroli}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">
                      {record.countHandover}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
