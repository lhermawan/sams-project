"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Eye,
  X,
  Upload,
  Loader2,
  FileText,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { id } from "date-fns/locale";

interface LeaveRecord {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  attachmentUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  createdAt: string;
}

const LEAVE_TYPES: Record<string, { label: string; badge: string }> = {
  IZIN: { label: "Izin Pribadi", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  CUTI_TAHUNAN: { label: "Cuti Tahunan", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  CUTI_SAKIT: { label: "Cuti Sakit", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  CUTI_MELAHIRKAN: { label: "Cuti Melahirkan", badge: "bg-pink-100 text-pink-700 border-pink-200" },
  CUTI_KHUSUS: { label: "Cuti Khusus", badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  TUGAS_LUAR: { label: "Tugas Luar / Dinas", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function EmployeeLeavePage() {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leaveType: "IZIN",
    startDate: "",
    endDate: "",
    reason: "",
    attachmentUrl: "",
  });

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave?limit=50");
      const data = await res.json();
      if (data.records) setRecords(data.records);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("fetchEmployeeLeave error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, attachmentUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      alert("Mohon lengkapi jenis cuti, tanggal, dan alasan pengajuan.");
      return;
    }

    if (new Date(form.startDate) > new Date(form.endDate)) {
      alert("Tanggal mulai tidak boleh melebihi tanggal selesai.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal mengajukan izin/cuti");
        return;
      }
      setShowModal(false);
      setForm({
        leaveType: "IZIN",
        startDate: "",
        endDate: "",
        reason: "",
        attachmentUrl: "",
      });
      fetchRecords();
    } catch (err) {
      console.error("handleSubmit error:", err);
      alert("Terjadi kesalahan sistem saat menyimpan pengajuan.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (activeTab === "ALL") return true;
    return r.status === activeTab;
  });

  return (
    <div className="space-y-4 px-4 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-600" />
            Pengajuan Izin & Cuti
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Ajukan izin kerja, cuti tahunan, atau tugas dinas luar
          </p>
        </div>
      </div>

      {/* Action Card Button */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl shadow-sm flex items-center justify-between transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Plus size={22} className="text-white" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">Ajukan Izin / Cuti Baru</div>
            <div className="text-xs text-blue-100">Klik untuk mengisi formulir permohonan</div>
          </div>
        </div>
        <ChevronRight size={18} className="text-blue-200" />
      </button>

      {/* Stats Summary Tabs */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === "ALL"
              ? "bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-2xs"
              : "bg-white border-gray-200 text-gray-600"
          }`}
        >
          <div className="text-base font-bold">{stats.total}</div>
          <div className="text-[10px] mt-0.5">Semua</div>
        </button>

        <button
          onClick={() => setActiveTab("PENDING")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === "PENDING"
              ? "bg-amber-50 border-amber-300 text-amber-700 font-bold shadow-2xs"
              : "bg-white border-gray-200 text-gray-600"
          }`}
        >
          <div className="text-base font-bold text-amber-600">{stats.pending}</div>
          <div className="text-[10px] mt-0.5">Menunggu</div>
        </button>

        <button
          onClick={() => setActiveTab("APPROVED")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === "APPROVED"
              ? "bg-green-50 border-green-300 text-green-700 font-bold shadow-2xs"
              : "bg-white border-gray-200 text-gray-600"
          }`}
        >
          <div className="text-base font-bold text-green-600">{stats.approved}</div>
          <div className="text-[10px] mt-0.5">Disetujui</div>
        </button>

        <button
          onClick={() => setActiveTab("REJECTED")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === "REJECTED"
              ? "bg-red-50 border-red-300 text-red-700 font-bold shadow-2xs"
              : "bg-white border-gray-200 text-gray-600"
          }`}
        >
          <div className="text-base font-bold text-red-600">{stats.rejected}</div>
          <div className="text-[10px] mt-0.5">Ditolak</div>
        </button>
      </div>

      {/* List Records */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100 shadow-2xs">
            <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            Memuat riwayat pengajuan...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100 shadow-2xs">
            <ClipboardList size={36} className="mx-auto mb-2 opacity-30 text-gray-400" />
            <p className="text-xs">Belum ada pengajuan pada tab ini.</p>
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const typeInfo = LEAVE_TYPES[rec.leaveType] || {
              label: rec.leaveType,
              badge: "bg-gray-100 text-gray-700 border-gray-200",
            };
            const startDate = new Date(rec.startDate);
            const endDate = new Date(rec.endDate);
            const days = differenceInCalendarDays(endDate, startDate) + 1;

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2.5 transition-all"
              >
                {/* Top: Type & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${typeInfo.badge}`}
                  >
                    {typeInfo.label}
                  </span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      rec.status === "APPROVED"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : rec.status === "REJECTED"
                        ? "bg-red-50 text-red-600 border-red-200 font-semibold"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {rec.status === "APPROVED"
                      ? "Disetujui"
                      : rec.status === "REJECTED"
                      ? "Ditolak"
                      : "Menunggu Persetujuan"}
                  </span>
                </div>

                {/* Period */}
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar size={13} className="text-blue-600 shrink-0" />
                    <span>
                      {format(startDate, "dd MMM yyyy", { locale: id })} -{" "}
                      {format(endDate, "dd MMM yyyy", { locale: id })}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-semibold bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                    {days} hari
                  </span>
                </div>

                {/* Reason */}
                <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-relaxed">
                  {rec.reason}
                </p>

                {/* Admin Notes if any */}
                {rec.adminNotes && (
                  <div className="text-xs text-gray-700 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 flex items-start gap-1.5">
                    <MessageSquare size={13} className="text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-blue-800 text-[11px] block">Catatan Admin:</strong>
                      <span className="text-[11px] text-gray-700">{rec.adminNotes}</span>
                    </div>
                  </div>
                )}

                {/* Bottom: Attachment & submission date */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400 border-t border-gray-100">
                  <span>
                    Diajukan {format(new Date(rec.createdAt), "dd MMM yyyy HH:mm", { locale: id })} WIB
                  </span>
                  {rec.attachmentUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(rec.attachmentUrl)}
                      className="text-blue-600 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={12} />
                      Lihat Bukti
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-600" />
                  Formulir Izin / Cuti
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lengkapi data permohonan izin atau cuti Anda
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Jenis Izin/Cuti */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Jenis Pengajuan <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">
                    Tanggal Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">
                    Tanggal Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Alasan */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Alasan / Keterangan <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Tuliskan alasan izin/cuti Anda dengan jelas..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* File Lampiran */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Lampiran / Bukti Surat (Opsional)</span>
                  <span className="text-gray-400 font-normal text-[10px]">Foto / Dokumen</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload size={13} className="text-blue-600" />
                    Pilih File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {form.attachmentUrl && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle size={13} /> Terlampir
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      Mengirim...
                    </span>
                  ) : (
                    "Kirim Pengajuan"
                  )}
                </button>
              </div>
            </form>
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
            className="relative max-w-sm w-full bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between text-white">
              <div className="font-bold text-xs text-gray-100 flex items-center gap-1.5">
                <FileText size={14} className="text-blue-400" />
                Bukti Lampiran
              </div>
              <button
                onClick={() => setLightboxUrl(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={lightboxUrl}
                alt="Bukti Lampiran"
                className="w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
