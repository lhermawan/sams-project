"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Edit3,
  Eye,
  X,
  Filter,
  Clock,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  Calendar,
  RotateCcw,
  Check,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  FileCheck,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  workplacePhoto: string | null;
  checkOutPhoto: string | null;
  checkInDistance: number | null;
  lateMinutes: number;
  status: string;
  adminNotes: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  employee: { id: string; name: string; department: string; nip: string };
  shift: { name: string } | null;
  handover?: any;
  periodicReports?: any[];
}

interface SimpleEmployee {
  id: string;
  name: string;
  nip: string;
  department: string;
}

const STATUS = {
  VALID: { label: "Disetujui", class: "bg-green-100 text-green-700 border-green-200" },
  PENDING: { label: "Menunggu", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  LATE: { label: "Terlambat", class: "bg-orange-100 text-orange-700 border-orange-200" },
  ABSENT: { label: "Tidak Hadir", class: "bg-red-100 text-red-700 border-red-200" },
  REJECTED: { label: "Ditolak", class: "bg-red-100 text-red-700 border-red-200" },
  CORRECTED: { label: "Dikoreksi", class: "bg-blue-100 text-blue-700 border-blue-200" },
} as const;

function getEffectiveLate(rec: AttendanceRecord): number {
  return typeof rec.lateMinutes === "number" ? rec.lateMinutes : 0;
}

export default function AttendanceAdminPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lightboxInfo, setLightboxInfo] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [validating, setValidating] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ id: string; action: string; employeeName: string; currentNotes?: string } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [reportModal, setReportModal] = useState<AttendanceRecord | null>(null);

  // Dynamic Options from DB
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);

  // Filters
  const todayStr = new Date().toISOString().split("T")[0];
  const [filterDate, setFilterDate] = useState(todayStr);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");

  const limit = 20;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(filterDate && { date: filterDate }),
      ...(filterStatus && { status: filterStatus }),
      ...(filterDept && { department: filterDept }),
      ...(filterEmployeeId && { employeeId: filterEmployeeId }),
    });
    try {
      const res = await fetch(`/api/attendance/list?${params}`);
      const data = await res.json();
      setRecords(data.records ?? []);
      setTotal(data.total ?? 0);
      if (data.departments && Array.isArray(data.departments)) {
        setDepartments(data.departments);
      }
      if (data.employees && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error("fetchRecords error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filterDate, filterStatus, filterDept, filterEmployeeId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const validate = async (attendanceId: string, action: string, notes?: string) => {
    setValidating(attendanceId);
    const cleanedNotes = notes && notes.trim() ? notes.trim() : null;
    const nextStatus = action === "APPROVE" ? "VALID" : action === "REJECT" ? "REJECTED" : "CORRECTED";
    // Optimistic UI update agar tombol langsung berubah status dan terkunci
    setRecords((prev) =>
      prev.map((r) =>
        r.id === attendanceId
          ? {
              ...r,
              status: nextStatus,
              adminNotes: cleanedNotes,
              validatedAt: new Date().toISOString(),
            }
          : r
      )
    );
    try {
      const res = await fetch("/api/attendance/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, action, adminNotes: cleanedNotes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Gagal memvalidasi absensi");
      }
      fetchRecords();
    } catch (err) {
      console.error("Validation error:", err);
      fetchRecords();
    } finally {
      setValidating(null);
    }
  };

  const handleOpenNoteModal = (id: string, action: string, employeeName: string, currentNotes?: string) => {
    if (validating) return;
    setNoteModal({ id, action, employeeName, currentNotes });
    setAdminNote(currentNotes || "");
  };

  const handleNoteSubmit = async () => {
    if (!noteModal || validating) return;
    const { id, action } = noteModal;
    const note = adminNote;
    setNoteModal(null);
    setAdminNote("");
    await validate(id, action, note);
  };

  const resetFilters = () => {
    setFilterDate("");
    setFilterStatus("");
    setFilterDept("");
    setFilterEmployeeId("");
    setPage(1);
  };

  const setQuickDate = (type: "today" | "yesterday" | "all") => {
    const d = new Date();
    if (type === "today") {
      setFilterDate(d.toISOString().split("T")[0]);
    } else if (type === "yesterday") {
      setFilterDate(subDays(d, 1).toISOString().split("T")[0]);
    } else if (type === "all") {
      setFilterDate("");
    }
    setPage(1);
  };

  const activeFilterCount = [
    filterDate,
    filterStatus,
    filterDept,
    filterEmployeeId,
  ].filter(Boolean).length;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Monitoring Absensi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau kehadiran pegawai secara real-time dan verifikasi foto lokasi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            {total} Data Ditemukan
          </span>
        </div>
      </div>

      {/* Filter Box with Structured Divider */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filter Section Header */}
        <div className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
            <Filter size={15} className="text-blue-600" />
            Panel Filter Lengkap
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                {activeFilterCount} Aktif
              </span>
            )}
          </div>
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-gray-400 mr-1 text-[11px]">Pintasan:</span>
            <button
              onClick={() => setQuickDate("today")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterDate === todayStr
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setQuickDate("yesterday")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterDate === subDays(new Date(), 1).toISOString().split("T")[0]
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Kemarin
            </button>
            <button
              onClick={() => setQuickDate("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                !filterDate
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Semua Tanggal
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filter 1: Tanggal */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-500" />
                Tanggal Absensi
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white shadow-xs"
              />
            </div>

            {/* Filter 2: Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-blue-500" />
                Status Absensi
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white shadow-xs"
              >
                <option value="">Semua Status</option>
                <option value="VALID">Hadir (Benar)</option>
                <option value="LATE">Terlambat</option>
                <option value="PENDING">Menunggu Verifikasi</option>
                <option value="REJECTED">Ditolak</option>
                <option value="CORRECTED">Dikoreksi</option>
                <option value="ABSENT">Tidak Hadir</option>
              </select>
            </div>

            {/* Filter 3: Bagian / Departemen (Dari DB) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-500" />
                Pilih Bagian / Departemen
              </label>
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white shadow-xs"
              >
                <option value="">Semua Bagian ({departments.length})</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 4: Pegawai (Dari DB) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-blue-500" />
                Pilih Pegawai
              </label>
              <select
                value={filterEmployeeId}
                onChange={(e) => {
                  setFilterEmployeeId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white shadow-xs"
              >
                <option value="">Semua Pegawai ({employees.length})</option>
                {employees
                  .filter((emp) => !filterDept || emp.department.toLowerCase().includes(filterDept.toLowerCase()))
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.nip}) - {emp.department}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Structured Divider */}
          <div className="border-t border-gray-100 mt-4 pt-3 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-gray-500">
              <span>Menampilkan:</span>
              <strong className="text-gray-800">{records.length} data</strong>
              <span>pada halaman ini (total {total} data)</span>
              {filterDept && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-100 font-medium">
                  Bagian: {filterDept}
                </span>
              )}
              {filterEmployeeId && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 font-medium">
                  Pegawai: {employees.find((e) => e.id === filterEmployeeId)?.name || filterEmployeeId}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset Filter
                </button>
              )}
              <button
                onClick={fetchRecords}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Filter size={12} />
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Data Absensi */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Mobile Scroll Cue */}
        <div className="md:hidden px-4 py-2 bg-blue-50/90 border-b border-blue-100 text-xs text-blue-700 flex items-center justify-between font-medium">
          <span>👉 Geser tabel ke samping untuk melihat kolom validasi</span>
          <span className="text-[10px] bg-blue-200/70 text-blue-800 px-2 py-0.5 rounded-md font-bold">Geser</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/90 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-5 py-3.5 text-left font-semibold">Pegawai</th>
                <th className="px-5 py-3.5 text-left font-semibold">Tanggal & Shift</th>
                <th className="px-5 py-3.5 text-left font-semibold">Masuk</th>
                <th className="px-5 py-3.5 text-left font-semibold">Pulang</th>
                <th className="px-5 py-3.5 text-left font-semibold">Jarak / Keterlambatan</th>
                <th className="px-5 py-3.5 text-left font-semibold">Foto Bukti</th>
                <th className="px-5 py-3.5 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" size={32} />
                    <p className="text-xs text-gray-400">Memuat data absensi...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <AlertCircle className="mx-auto text-gray-300" size={36} />
                      <p className="font-medium text-gray-600 text-sm">Tidak ada data absensi yang cocok</p>
                      <p className="text-xs text-gray-400">Coba ubah tanggal atau bersihkan filter di atas.</p>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={resetFilters}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700"
                        >
                          <RotateCcw size={12} /> Bersihkan Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const effectiveLate = getEffectiveLate(rec);
                  const st =
                    STATUS[rec.status as keyof typeof STATUS] ?? {
                      label: rec.status,
                      class: "bg-gray-100 text-gray-700 border-gray-200",
                    };
                  const isRecordValidating = validating === rec.id;

                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Pegawai */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 text-sm">{rec.employee.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-gray-400">{rec.employee.nip}</span>
                          <span className="text-gray-300">•</span>
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] text-gray-600 font-medium">
                            {rec.employee.department}
                          </span>
                        </div>
                      </td>

                      {/* Tanggal & Shift */}
                      <td className="px-5 py-4 text-sm text-gray-700">
                        <div className="font-medium">
                          {format(new Date(rec.date), "dd MMM yyyy", { locale: id })}
                        </div>
                        {rec.shift ? (
                          <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                            <Clock size={11} /> {rec.shift.name}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-0.5">Shift Reguler</div>
                        )}
                      </td>

                      {/* Check In */}
                      <td className="px-5 py-4">
                        {rec.checkInTime ? (
                          <span className="font-mono font-bold text-gray-800 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            {format(new Date(rec.checkInTime), "HH:mm")} WIB
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Check Out */}
                      <td className="px-5 py-4">
                        {rec.checkOutTime ? (
                          <span className="font-mono font-bold text-gray-800 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            {format(new Date(rec.checkOutTime), "HH:mm")} WIB
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Jarak / Telat */}
                      <td className="px-5 py-4">
                        {rec.checkInDistance != null && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                            <MapPin size={12} className="text-blue-500" /> {rec.checkInDistance} meter
                          </div>
                        )}
                        {effectiveLate > 0 ? (
                          <div className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-1 font-semibold">
                            <Clock size={11} /> Telat {effectiveLate} mnt
                          </div>
                        ) : (
                          <div className="text-[11px] text-green-600 mt-0.5 font-medium">Tepat Waktu</div>
                        )}
                      </td>

                      {/* Foto Bukti */}
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {rec.checkInPhoto && (
                            <button
                              onClick={() =>
                                setLightboxInfo({
                                  url: rec.checkInPhoto!,
                                  title: `Foto Wajah (Selfie) - ${rec.employee.name}`,
                                  subtitle: `Absen Masuk: ${
                                    rec.checkInTime ? format(new Date(rec.checkInTime), "HH:mm") : "-"
                                  } WIB | NIP: ${rec.employee.nip}`,
                                })
                              }
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors shadow-2xs"
                              title="Lihat Foto Wajah"
                            >
                              <User size={12} /> Muka
                            </button>
                          )}
                          {rec.workplacePhoto && (
                            <button
                              onClick={() =>
                                setLightboxInfo({
                                  url: rec.workplacePhoto!,
                                  title: `Foto Lokasi Kerja (Anti-Fake GPS) - ${rec.employee.name}`,
                                  subtitle: `Bagian: ${rec.employee.department} | NIP: ${rec.employee.nip}`,
                                })
                              }
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-purple-200 transition-colors shadow-2xs"
                              title="Lihat Foto Lokasi Kerja Nyata (Anti Fake GPS)"
                            >
                              <Building2 size={12} /> Lokasi
                            </button>
                          )}
                          {rec.checkOutPhoto && (
                            <button
                              onClick={() =>
                                setLightboxInfo({
                                  url: rec.checkOutPhoto!,
                                  title: `Foto Pulang - ${rec.employee.name}`,
                                  subtitle: `Absen Pulang: ${
                                    rec.checkOutTime ? format(new Date(rec.checkOutTime), "HH:mm") : "-"
                                  } WIB`,
                                })
                              }
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200 transition-colors shadow-2xs"
                              title="Lihat Foto Pulang"
                            >
                              <Eye size={12} /> Pulang
                            </button>
                          )}
                          {!rec.checkInPhoto && !rec.workplacePhoto && !rec.checkOutPhoto && (
                            <span className="text-gray-300 text-xs font-mono">-</span>
                          )}
                          {(rec.handover || (rec.periodicReports && rec.periodicReports.length > 0)) && (
                            <button
                              onClick={() => setReportModal(rec)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-amber-200 transition-colors shadow-2xs mt-1"
                              title="Lihat Laporan Serah Terima & Patroli"
                            >
                              <FileCheck size={12} /> Laporan
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            rec.status === "VALID"
                              ? effectiveLate > 0
                                ? "bg-amber-50 text-amber-800 border-amber-300 font-semibold"
                                : "bg-green-100 text-green-800 border-green-200"
                              : rec.status === "REJECTED"
                              ? "bg-red-50 text-red-600 border-red-200 font-semibold"
                              : st.class
                          }`}
                        >
                          {rec.status === "VALID"
                            ? effectiveLate > 0
                              ? `Disetujui (Terlambat ${effectiveLate} mnt)`
                              : rec.adminNotes?.trim()
                              ? "Disetujui (dengan catatan)"
                              : "Disetujui (Tepat Waktu)"
                            : rec.status === "REJECTED"
                            ? rec.adminNotes?.trim()
                              ? "Ditolak (dengan catatan)"
                              : "Ditolak"
                            : st.label}
                        </span>
                        {rec.adminNotes && (
                          <div
                            className="text-[11px] text-gray-600 mt-1 max-w-[150px] truncate bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 flex items-center gap-1"
                            title={`Catatan Admin: ${rec.adminNotes}`}
                          >
                            <MessageSquare size={11} className="text-gray-400 shrink-0" />
                            <span className="truncate">{rec.adminNotes}</span>
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
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white text-xs font-medium text-gray-700 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft size={14} /> Sebelumnya
              </button>
              <div className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg">
                {page} / {totalPages}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white text-xs font-medium text-gray-700 flex items-center gap-1 transition-colors"
              >
                Berikutnya <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Photo Lightbox */}
      {lightboxInfo && (
        <div
          className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setLightboxInfo(null)}
        >
          <div
            className="relative max-w-xl w-full bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-gray-800 border-b border-gray-700 flex items-center justify-between text-white">
              <div>
                <div className="font-bold text-sm text-gray-100">{lightboxInfo.title}</div>
                {lightboxInfo.subtitle && (
                  <div className="text-xs text-gray-400 mt-0.5">{lightboxInfo.subtitle}</div>
                )}
              </div>
              <button
                onClick={() => setLightboxInfo(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="aspect-[4/3] bg-black">
              <img
                src={lightboxInfo.url}
                alt="Enlarged view"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Validasi Catatan / Tolak Modal */}
      {/* REPORT MODAL (Serah Terima & Patroli) */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FileCheck className="text-amber-600" size={24} />
                Laporan Pegawai - {reportModal.employee.name}
              </h3>
              <button
                onClick={() => setReportModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 space-y-6 flex-1">
              {/* Serah Terima */}
              {reportModal.handover && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-gray-800 bg-gray-50 p-2 rounded-lg border">
                    Serah Terima Tugas (Handover)
                  </h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    {(reportModal.handover as any).handoverNotes}
                  </div>
                  {reportModal.handover.photos && reportModal.handover.photos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {reportModal.handover.photos.map((p: any, i: number) => (
                        <div key={i} className="relative rounded-lg overflow-hidden aspect-[4/3] border shadow-sm cursor-pointer hover:opacity-90"
                             onClick={() => setLightboxInfo({ url: p.photoUrl, title: "Foto Serah Terima" })}>
                          <img src={p.photoUrl} alt="Handover" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Patroli */}
              {reportModal.periodicReports && reportModal.periodicReports.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-gray-800 bg-gray-50 p-2 rounded-lg border flex justify-between">
                    <span>Laporan Patroli Berkala</span>
                    <span className="text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {reportModal.periodicReports.length} Checkpoint
                    </span>
                  </h4>
                  <div className="space-y-4">
                    {reportModal.periodicReports.map((report: any, idx: number) => (
                      <div key={report.id} className="border border-gray-200 rounded-xl p-4 space-y-3 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${report.status === 'SUBMITTED' ? 'bg-green-500' : report.status === 'LATE' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-sm">Checkpoint Ke-{report.checkpointSequence}</div>
                            <div className="text-xs text-gray-500">
                              Jadwal: {format(new Date(report.scheduledAt), "HH:mm")} WIB
                              {report.submittedAt && ` • Dilaporkan: ${format(new Date(report.submittedAt), "HH:mm")} WIB`}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                            report.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' :
                            report.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        {report.reportNotes && (
                          <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border">
                            {report.reportNotes}
                          </div>
                        )}
                        {report.photos && report.photos.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {report.photos.map((p: any, i: number) => (
                              <div key={i} className="flex-shrink-0 w-24 h-24 relative rounded-lg overflow-hidden border shadow-sm cursor-pointer hover:opacity-90"
                                   onClick={() => setLightboxInfo({ url: p.photoUrl, title: `Foto Patroli Ke-${report.checkpointSequence}` })}>
                                <img src={p.photoUrl} alt="Patrol" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">Tidak ada foto</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}