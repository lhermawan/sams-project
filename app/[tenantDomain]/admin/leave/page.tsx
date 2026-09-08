"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  Calendar,
  Building2,
  User,
  Plus,
  X,
  Eye,
  FileText,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Paperclip,
  Upload,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { id } from "date-fns/locale";

interface LeaveRecord {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  attachmentUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    nip: string;
    department: string;
    position?: string;
    phone?: string | null;
  };
}

interface SimpleEmployee {
  id: string;
  name: string;
  nip: string;
  department: string;
}

const LEAVE_TYPES: Record<string, { label: string; badge: string }> = {
  IZIN: { label: "Izin Pribadi", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  CUTI_TAHUNAN: { label: "Cuti Tahunan", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  CUTI_SAKIT: { label: "Cuti Sakit", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  CUTI_MELAHIRKAN: { label: "Cuti Melahirkan", badge: "bg-pink-100 text-pink-700 border-pink-200" },
  CUTI_KHUSUS: { label: "Cuti Khusus", badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  TUGAS_LUAR: { label: "Tugas Luar / Dinas", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function AdminLeavePage() {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterDept, setFilterDept] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Action / Validation State
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    id: string;
    action: "APPROVE" | "REJECT";
    employeeName: string;
    leaveType: string;
    currentNotes?: string;
  } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeId: "",
    leaveType: "IZIN",
    startDate: "",
    endDate: "",
    reason: "",
    attachmentUrl: "",
  });

  // Lightbox Modal for Attachment
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());
      if (filterStatus && filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterType && filterType !== "ALL") params.set("type", filterType);
      if (filterDept) params.set("department", filterDept);
      if (filterEmployeeId) params.set("employeeId", filterEmployeeId);
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);

      const res = await fetch(`/api/leave?${params.toString()}`);
      const data = await res.json();
      if (data.records) setRecords(data.records);
      if (data.total !== undefined) setTotal(data.total);
      if (data.stats) setStats(data.stats);
      if (data.departments) setDepartments(data.departments);
      if (data.employees) setEmployees(data.employees);
    } catch (err) {
      console.error("fetchLeaveRecords error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterStatus, filterType, filterDept, filterEmployeeId, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handle Validation (Setujui / Tolak)
  const handleOpenActionModal = (
    id: string,
    action: "APPROVE" | "REJECT",
    employeeName: string,
    leaveType: string,
    currentNotes?: string
  ) => {
    if (validatingId) return;
    setActionModal({ id, action, employeeName, leaveType, currentNotes });
    setAdminNote(currentNotes || "");
  };

  const handleActionSubmit = async () => {
    if (!actionModal || validatingId) return;
    const { id, action } = actionModal;
    const note = adminNote.trim();
    setActionModal(null);
    setAdminNote("");

    setValidatingId(id);
    // Optimistic update
    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: nextStatus,
              adminNotes: note || null,
              approvedAt: new Date().toISOString(),
            }
          : r
      )
    );

    try {
      const res = await fetch("/api/leave/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId: id, action, adminNotes: note }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Gagal memproses validasi pengajuan");
      }
      fetchRecords();
    } catch (err) {
      console.error("handleActionSubmit error:", err);
      fetchRecords();
    } finally {
      setValidatingId(null);
    }
  };

  // Handle Create Leave Form
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.employeeId || !createForm.startDate || !createForm.endDate || !createForm.reason.trim()) {
      alert("Mohon lengkapi pegawai, jenis izin/cuti, tanggal, dan alasan.");
      return;
    }

    if (new Date(createForm.startDate) > new Date(createForm.endDate)) {
      alert("Tanggal mulai tidak boleh melebihi tanggal selesai.");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal membuat pengajuan");
        return;
      }
      setShowCreateModal(false);
      setCreateForm({
        employeeId: "",
        leaveType: "IZIN",
        startDate: "",
        endDate: "",
        reason: "",
        attachmentUrl: "",
      });
      fetchRecords();
    } catch (err) {
      console.error("handleCreateSubmit error:", err);
      alert("Terjadi kesalahan sistem saat menyimpan pengajuan.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Attachment file upload to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCreateForm((prev) => ({ ...prev, attachmentUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const resetFilters = () => {
    setSearch("");
    setFilterStatus("ALL");
    setFilterType("ALL");
    setFilterDept("");
    setFilterEmployeeId("");
    setFilterStartDate("");
    setFilterEndDate("");
    setPage(1);
  };

  const activeFilterCount = [
    search,
    filterStatus !== "ALL" ? filterStatus : "",
    filterType !== "ALL" ? filterType : "",
    filterDept,
    filterEmployeeId,
    filterStartDate,
    filterEndDate,
  ].filter(Boolean).length;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2.5">
            <ClipboardList className="text-blue-600" size={24} />
            Persetujuan & Monitoring Izin / Cuti
          </h2>
          <p className="text-sm text-gray-500">
            Kelola permohonan izin pribadi, cuti tahunan, cuti sakit, dan tugas luar pegawai secara transparan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            Buat Pengajuan Baru
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Pengajuan</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Menunggu Persetujuan</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Telah Disetujui</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</h3>
            </div>
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Ditolak</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</h3>
            </div>
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
              <XCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
            <Filter size={15} className="text-blue-600" />
            Panel Filter Pengajuan
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="xl:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Search size={14} className="text-blue-500" />
                Cari Pegawai / Alasan
              </label>
              <input
                type="text"
                placeholder="Ketik Nama, NIP, atau Bagian..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-500" />
                Status Persetujuan
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">Menunggu Persetujuan</option>
                <option value="APPROVED">Disetujui</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </div>

            {/* Filter Jenis */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <ClipboardList size={14} className="text-blue-500" />
                Jenis Izin / Cuti
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Jenis</option>
                {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Bagian */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-500" />
                Bagian / Departemen
              </label>
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Semua Bagian</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Pegawai */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-blue-500" />
                Pegawai Spesifik
              </label>
              <select
                value={filterEmployeeId}
                onChange={(e) => {
                  setFilterEmployeeId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Semua Pegawai</option>
                {employees
                  .filter((emp) => !filterDept || emp.department.toLowerCase().includes(filterDept.toLowerCase()))
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.nip})
                    </option>
                  ))}
              </select>
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
                <th className="px-5 py-3.5">Pegawai</th>
                <th className="px-5 py-3.5">Jenis & Periode</th>
                <th className="px-5 py-3.5">Keterangan / Alasan</th>
                <th className="px-5 py-3.5">Bukti / Lampiran</th>
                <th className="px-5 py-3.5">Status & Catatan</th>
                <th className="px-5 py-3.5">Tgl Pengajuan</th>
                <th className="px-5 py-3.5">Aksi Validasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    Memuat data permohonan izin & cuti...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <ClipboardList size={32} className="mx-auto mb-2 opacity-30 text-gray-400" />
                    Belum ada data pengajuan izin atau cuti yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const typeInfo = LEAVE_TYPES[rec.leaveType] || {
                    label: rec.leaveType,
                    badge: "bg-gray-100 text-gray-700 border-gray-200",
                  };
                  const startDate = new Date(rec.startDate);
                  const endDate = new Date(rec.endDate);
                  const days = differenceInCalendarDays(endDate, startDate) + 1;
                  const isRecordValidating = validatingId === rec.id;

                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Pegawai */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100 shrink-0">
                            {rec.employee.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 leading-tight">
                              {rec.employee.name}
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">
                              {rec.employee.nip}
                            </div>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-md font-medium">
                              {rec.employee.department}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Jenis & Periode */}
                      <td className="px-5 py-4">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${typeInfo.badge}`}
                          >
                            {typeInfo.label}
                          </span>
                          <div className="text-xs text-gray-700 font-medium mt-1.5 flex items-center gap-1">
                            <Calendar size={13} className="text-gray-400 shrink-0" />
                            <span>
                              {format(startDate, "dd MMM yyyy", { locale: id })} -{" "}
                              {format(endDate, "dd MMM yyyy", { locale: id })}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Durasi: <strong className="text-gray-800">{days} hari</strong>
                          </div>
                        </div>
                      </td>

                      {/* Keterangan */}
                      <td className="px-5 py-4 max-w-[220px]">
                        <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed" title={rec.reason}>
                          {rec.reason}
                        </p>
                      </td>

                      {/* Lampiran */}
                      <td className="px-5 py-4">
                        {rec.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(rec.attachmentUrl)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border border-blue-200 cursor-pointer"
                          >
                            <Eye size={13} />
                            Lihat Bukti
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Status & Catatan */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            rec.status === "APPROVED"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : rec.status === "REJECTED"
                              ? "bg-red-50 text-red-600 border-red-200 font-semibold"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {rec.status === "APPROVED"
                            ? rec.adminNotes?.trim()
                              ? "Disetujui (dengan catatan)"
                              : "Disetujui"
                            : rec.status === "REJECTED"
                            ? rec.adminNotes?.trim()
                              ? "Ditolak (dengan catatan)"
                              : "Ditolak"
                            : "Menunggu Persetujuan"}
                        </span>
                        {rec.adminNotes && (
                          <div
                            className="text-[11px] text-gray-600 mt-1.5 max-w-[170px] truncate bg-gray-50 px-2 py-1 rounded border border-gray-200 flex items-center gap-1"
                            title={`Catatan Admin: ${rec.adminNotes}`}
                          >
                            <MessageSquare size={11} className="text-gray-400 shrink-0" />
                            <span className="truncate">{rec.adminNotes}</span>
                          </div>
                        )}
                      </td>

                      {/* Tgl Pengajuan */}
                      <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {format(new Date(rec.createdAt), "dd MMM yyyy", { locale: id })}
                        <div className="text-[10px] text-gray-400">
                          {format(new Date(rec.createdAt), "HH:mm", { locale: id })} WIB
                        </div>
                      </td>

                      {/* Aksi Validasi Admin */}
                      <td className="px-5 py-4">
                        {isRecordValidating ? (
                          <div className="flex items-center gap-1.5 text-xs text-blue-600">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Menyimpan...</span>
                          </div>
                        ) : rec.status === "APPROVED" ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 bg-green-100 text-green-800 border border-green-300 font-bold shadow-2xs cursor-not-allowed opacity-90 select-none"
                            title="Pengajuan telah disetujui (tidak dapat diubah kembali)"
                          >
                            <CheckCircle size={14} className="shrink-0 text-green-700" />
                            <span>
                              {rec.adminNotes?.trim() ? "Disetujui (dengan catatan)" : "Disetujui"}
                            </span>
                          </button>
                        ) : rec.status === "REJECTED" ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-300 font-bold shadow-2xs cursor-not-allowed opacity-90 select-none"
                            title="Pengajuan telah ditolak (tidak dapat diubah kembali)"
                          >
                            <XCircle size={14} className="shrink-0 text-red-600" />
                            <span className="text-red-600 font-bold">
                              {rec.adminNotes?.trim() ? "Ditolak (dengan catatan)" : "Ditolak"}
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenActionModal(
                                  rec.id,
                                  "APPROVE",
                                  rec.employee.name,
                                  typeInfo.label,
                                  rec.adminNotes || ""
                                )
                              }
                              className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-xs transition-all cursor-pointer"
                              title="Setujui permohonan izin/cuti ini"
                            >
                              <CheckCircle size={14} className="shrink-0" />
                              <span>Setujui</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleOpenActionModal(
                                  rec.id,
                                  "REJECT",
                                  rec.employee.name,
                                  typeInfo.label,
                                  rec.adminNotes || ""
                                )
                              }
                              className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 font-semibold transition-all cursor-pointer"
                              title="Tolak permohonan izin/cuti ini"
                            >
                              <XCircle size={14} className="shrink-0" />
                              <span className="text-red-600 font-semibold">Tolak</span>
                            </button>
                          </div>
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
              <strong className="text-gray-800">{total}</strong> data
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

      {/* Confirmation & Note Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  {actionModal.action === "APPROVE" ? (
                    <>
                      <CheckCircle size={18} className="text-green-600" />
                      Persetujuan Izin / Cuti
                    </>
                  ) : (
                    <>
                      <XCircle size={18} className="text-red-500" />
                      Penolakan Izin / Cuti
                    </>
                  )}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pegawai: <strong className="text-gray-700">{actionModal.employeeName}</strong> (
                  {actionModal.leaveType})
                </p>
              </div>
              <button
                onClick={() => {
                  setActionModal(null);
                  setAdminNote("");
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Reason Presets for Reject */}
            {actionModal.action === "REJECT" && (
              <div className="mb-3.5 space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Pilih Alasan Penolakan Cepat (Opsional):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Operasional sedang padat",
                    "Surat bukti/lampiran tidak valid",
                    "Melebihi jatah kuota cuti",
                    "Tidak memenuhi syarat pengajuan",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdminNote(preset)}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-medium transition-colors border border-red-100 text-left cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Presets for Approve */}
            {actionModal.action === "APPROVE" && (
              <div className="mb-3.5 space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Pilih Catatan Persetujuan Cepat (Opsional):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Pengajuan sah & disetujui",
                    "Surat bukti lengkap",
                    "Jadwal operasional disesuaikan",
                    "Tugas luar disetujui",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdminNote(preset)}
                      className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-[11px] font-medium transition-colors border border-green-100 text-left cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5 mb-5">
              <label className="block text-xs font-semibold text-gray-700">
                Catatan Admin <span className="text-gray-400 font-normal">(Opsional, tidak harus diisi)</span>:
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder={
                  actionModal.action === "APPROVE"
                    ? "Tuliskan catatan persetujuan untuk pegawai jika ada..."
                    : "Tuliskan alasan penolakan untuk pegawai jika ada..."
                }
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800"
              />
              <p className="text-[11px] text-gray-400">
                Catatan ini akan otomatis masuk ke riwayat dan notifikasi akun pegawai.
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setAdminNote("");
                }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={Boolean(validatingId)}
                onClick={handleActionSubmit}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-colors shadow-xs ${
                  validatingId ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${
                  actionModal.action === "APPROVE"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {validatingId ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" />
                    Menyimpan...
                  </span>
                ) : actionModal.action === "APPROVE" ? (
                  adminNote.trim()
                    ? "Konfirmasi Setujui (Dengan Catatan)"
                    : "Konfirmasi Setujui"
                ) : adminNote.trim() ? (
                  "Konfirmasi Tolak (Dengan Catatan)"
                ) : (
                  "Konfirmasi Tolak"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-xl w-full bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-gray-800 border-b border-gray-700 flex items-center justify-between text-white">
              <div className="font-bold text-sm text-gray-100 flex items-center gap-2">
                <FileText size={16} className="text-blue-400" />
                Bukti Lampiran Pengajuan
              </div>
              <button
                onClick={() => setLightboxUrl(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={lightboxUrl}
                alt="Bukti Lampiran"
                className="w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Modal (Admin buat pengajuan untuk pegawai) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <Plus size={18} className="text-blue-600" />
                  Buat Pengajuan Izin / Cuti
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Inputkan izin atau cuti atas nama pegawai yang bersangkutan
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Pegawai */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Pilih Pegawai <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Pilih Pegawai --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.nip} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis Izin/Cuti */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Jenis Izin / Cuti <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createForm.leaveType}
                  onChange={(e) => setCreateForm({ ...createForm, leaveType: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rentang Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tanggal Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tanggal Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Alasan */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Keterangan / Alasan <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan alasan izin / cuti secara lengkap..."
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Bukti Lampiran */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Lampiran / Surat Bukti (Opsional)</span>
                  <span className="text-gray-400 font-normal">Maks. 5MB</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors">
                    <Upload size={14} className="text-blue-600" />
                    Pilih File Foto / Dokumen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {createForm.attachmentUrl && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle size={14} /> File terpilih
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" />
                      Menyimpan...
                    </span>
                  ) : (
                    "Simpan Pengajuan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
