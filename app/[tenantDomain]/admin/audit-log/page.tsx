"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Clock,
  User,
  Calendar,
  Filter,
  Search,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileText,
  Terminal,
  Activity,
  CheckCircle,
  XCircle,
  Laptop,
  Globe,
  Settings,
  CalendarCheck,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface AuditRecord {
  id: string;
  userId: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  oldData: string | null;
  newData: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    employee: {
      name: string;
      department: string;
      nip: string;
    } | null;
  } | null;
}

interface AdminUser {
  id: string;
  email: string;
  role: string;
  employee: { name: string } | null;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [stats, setStats] = useState({ total: 0, today: 0, attendance: 0, management: 0 });

  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterEntity, setFilterEntity] = useState("ALL");
  const [filterUserId, setFilterUserId] = useState("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Diff Modal State
  const [selectedLog, setSelectedLog] = useState<AuditRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Export Loading
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());
      if (filterAction && filterAction !== "ALL") params.set("action", filterAction);
      if (filterEntity && filterEntity !== "ALL") params.set("entity", filterEntity);
      if (filterUserId && filterUserId !== "ALL") params.set("userId", filterUserId);
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);

      const res = await fetch(`/api/audit-log?${params.toString()}`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
      if (data.total !== undefined) setTotal(data.total);
      if (data.stats) setStats(data.stats);
      if (data.actions) setActions(data.actions);
      if (data.entities) setEntities(data.entities);
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error("fetchAuditLogs error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterAction, filterEntity, filterUserId, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ export: "csv" });
      if (search.trim()) params.set("search", search.trim());
      if (filterAction && filterAction !== "ALL") params.set("action", filterAction);
      if (filterEntity && filterEntity !== "ALL") params.set("entity", filterEntity);
      if (filterUserId && filterUserId !== "ALL") params.set("userId", filterUserId);
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);

      window.open(`/api/audit-log?${params.toString()}`, "_blank");
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFilterAction("ALL");
    setFilterEntity("ALL");
    setFilterUserId("ALL");
    setFilterStartDate("");
    setFilterEndDate("");
    setPage(1);
  };

  const activeFilterCount = [
    search,
    filterAction !== "ALL" ? filterAction : "",
    filterEntity !== "ALL" ? filterEntity : "",
    filterUserId !== "ALL" ? filterUserId : "",
    filterStartDate,
    filterEndDate,
  ].filter(Boolean).length;

  const totalPages = Math.ceil(total / limit);

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("APPROVE") || act === "CHECKIN" || act.includes("SUCCESS")) {
      return "bg-green-100 text-green-700 border-green-200";
    }
    if (act.includes("REJECT") || act.includes("DELETE")) {
      return "bg-red-100 text-red-700 border-red-200";
    }
    if (act.includes("CREATE") || act === "LOGIN" || act.includes("REGISTER")) {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    if (act.includes("UPDATE") || act.includes("RESET") || act === "CHECKOUT") {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    if (act.includes("IMPORT")) {
      return "bg-purple-100 text-purple-700 border-purple-200";
    }
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const formatJsonPretty = (raw: string | null) => {
    if (!raw) return "-";
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  const handleCopyJson = () => {
    if (!selectedLog) return;
    const textToCopy = JSON.stringify(
      {
        id: selectedLog.id,
        action: selectedLog.action,
        entity: selectedLog.entity,
        entityId: selectedLog.entityId,
        user: selectedLog.user?.email,
        oldData: selectedLog.oldData ? JSON.parse(selectedLog.oldData) : null,
        newData: selectedLog.newData ? JSON.parse(selectedLog.newData) : null,
        createdAt: selectedLog.createdAt,
      },
      null,
      2
    );
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2.5">
            <Shield className="text-blue-600" size={24} />
            Audit Log & Jejak Aktivitas Sistem
          </h2>
          <p className="text-sm text-gray-500">
            Rekam jejak setiap aksi admin dan pegawai untuk keamanan, akuntabilitas, dan integritas data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} className="text-blue-600" />}
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Log Aktivitas</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Shield size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Aktivitas Hari Ini</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.today}</h3>
            </div>
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Absensi & Validasi</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">{stats.attendance}</h3>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <CalendarCheck size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Manajemen & Sistem</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.management}</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Settings size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
            <Filter size={15} className="text-blue-600" />
            Panel Filter Audit Log
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                {activeFilterCount} Aktif
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={13} /> Reset Filter
            </button>
          )}
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="xl:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Search size={14} className="text-blue-500" />
                Cari Kata Kunci
              </label>
              <input
                type="text"
                placeholder="Email, nama, IP, ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Action */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Activity size={14} className="text-blue-500" />
                Jenis Aksi
              </label>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Aksi</option>
                {actions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Entity */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Terminal size={14} className="text-blue-500" />
                Entitas Terkait
              </label>
              <select
                value={filterEntity}
                onChange={(e) => {
                  setFilterEntity(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Entitas</option>
                {entities.map((ent) => (
                  <option key={ent} value={ent}>
                    {ent}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter User */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-blue-500" />
                Pelaku / Pengguna
              </label>
              <select
                value={filterUserId}
                onChange={(e) => {
                  setFilterUserId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Pengguna</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.employee?.name ? `${u.employee.name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tanggal */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={13} className="text-blue-500" />
                  Mulai
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={13} className="text-blue-500" />
                  Sampai
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-xs font-semibold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Waktu (WIB)</th>
                <th className="px-5 py-3.5">Pelaku / Pengguna</th>
                <th className="px-5 py-3.5">Aksi</th>
                <th className="px-5 py-3.5">Entitas & Target</th>
                <th className="px-5 py-3.5">Alamat IP</th>
                <th className="px-5 py-3.5">Data Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    Memuat data jejak audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <Shield size={32} className="mx-auto mb-2 opacity-30 text-gray-400" />
                    Belum ada catatan aktivitas yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const createdAt = new Date(log.createdAt);
                  const userName = log.user?.employee?.name || log.user?.email || "Sistem";
                  const userDept = log.user?.employee?.department;
                  const hasData = Boolean(log.oldData || log.newData);

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Waktu */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-gray-800">
                          {format(createdAt, "dd MMM yyyy", { locale: id })}
                        </div>
                        <div className="font-mono text-[11px] text-gray-400 mt-0.5">
                          {format(createdAt, "HH:mm:ss", { locale: id })} WIB
                        </div>
                      </td>

                      {/* Pelaku */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs shrink-0 border border-gray-200">
                            {userName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-xs leading-tight">
                              {userName}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {log.user?.email}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  log.user?.role === "ADMIN"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-gray-100 text-gray-600 border-gray-200"
                                }`}
                              >
                                {log.user?.role || "USER"}
                              </span>
                              {userDept && (
                                <span className="text-[10px] text-gray-500 font-medium">
                                  • {userDept}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Entitas & Target */}
                      <td className="px-5 py-4">
                        {log.entity ? (
                          <div>
                            <span className="font-semibold text-xs text-gray-800">
                              {log.entity}
                            </span>
                            {log.entityId && (
                              <div
                                className="font-mono text-[10px] text-gray-400 truncate max-w-[140px] mt-0.5"
                                title={log.entityId}
                              >
                                ID: {log.entityId}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="px-5 py-4 text-xs font-mono text-gray-600">
                        <div className="flex items-center gap-1">
                          <Globe size={12} className="text-gray-400 shrink-0" />
                          <span>{log.ipAddress || "unknown"}</span>
                        </div>
                      </td>

                      {/* Data Perubahan */}
                      <td className="px-5 py-4">
                        {hasData ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border border-blue-200 cursor-pointer"
                          >
                            <Eye size={13} />
                            Lihat Snapshot
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs font-mono">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Menampilkan <strong className="text-gray-800">{(page - 1) * limit + 1}</strong> -{" "}
              <strong className="text-gray-800">{Math.min(page * limit, total)}</strong> dari{" "}
              <strong className="text-gray-800">{total}</strong> log aktivitas
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white text-xs font-medium text-gray-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} /> Sebelumnya
              </button>
              <div className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg">
                {page} / {totalPages}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white text-xs font-medium text-gray-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                Berikutnya <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Snapshot / Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <Shield size={18} className="text-blue-600" />
                  Detail Snapshot Audit Log
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ID: <span className="font-mono text-gray-700">{selectedLog.id}</span> • Aksi:{" "}
                  <strong className="text-blue-700">{selectedLog.action}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Meta information summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-400 block text-[10px]">Waktu</span>
                  <span className="font-medium text-gray-800">
                    {format(new Date(selectedLog.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: id })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Pengguna</span>
                  <span className="font-medium text-gray-800 truncate block" title={selectedLog.user?.email}>
                    {selectedLog.user?.email || "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Entitas</span>
                  <span className="font-medium text-gray-800">
                    {selectedLog.entity || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">IP Address</span>
                  <span className="font-mono text-gray-800">
                    {selectedLog.ipAddress || "unknown"}
                  </span>
                </div>
              </div>

              {/* Data Sebelum vs Data Sesudah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                    <span>Data Sebelum (oldData):</span>
                    {selectedLog.oldData && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Sebelum Diubah
                      </span>
                    )}
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-gray-800">
                    {formatJsonPretty(selectedLog.oldData)}
                  </pre>
                </div>

                <div>
                  <div className="font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                    <span>Data Sesudah (newData):</span>
                    {selectedLog.newData && (
                      <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                        Sesudah Diubah / Baru
                      </span>
                    )}
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-gray-800">
                    {formatJsonPretty(selectedLog.newData)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span>{copied ? "Berhasil Disalin!" : "Salin JSON"}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
