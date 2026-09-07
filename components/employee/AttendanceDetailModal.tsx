"use client";

import { useState } from "react";
import {
  X,
  Clock,
  MapPin,
  Calendar,
  Building2,
  User,
  CheckCircle,
  Check,
  XCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export interface AttendanceDetailData {
  id: string;
  date: string | Date;
  checkInTime: string | Date | null;
  checkOutTime: string | Date | null;
  checkInPhoto?: string | null;
  workplacePhoto?: string | null;
  checkOutPhoto?: string | null;
  checkInDistance?: number | null;
  checkOutDistance?: number | null;
  lateMinutes: number;
  status: string;
  notes?: string | null;
  adminNotes?: string | null;
  shift?: {
    name: string;
    startTime?: string;
    endTime?: string;
  } | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: any }
> = {
  VALID: {
    label: "Disetujui",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle,
  },
  LATE: {
    label: "Terlambat",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Clock,
  },
  PENDING: {
    label: "Menunggu Verifikasi",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: AlertCircle,
  },
  REJECTED: {
    label: "Ditolak",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
  },
  CORRECTED: {
    label: "Dikoreksi",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    icon: ShieldCheck,
  },
  ABSENT: {
    label: "Tidak Hadir",
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
    icon: XCircle,
  },
};

interface AttendanceDetailModalProps {
  attendance: AttendanceDetailData | null;
  onClose: () => void;
}

export default function AttendanceDetailModal({
  attendance,
  onClose,
}: AttendanceDetailModalProps) {
  const [zoomPhoto, setZoomPhoto] = useState<{
    url: string;
    label: string;
  } | null>(null);

  if (!attendance) return null;

  const hasAdminNotes = Boolean(attendance.adminNotes && attendance.adminNotes.trim());
  const baseSt =
    STATUS_CONFIG[attendance.status] ?? {
      label: attendance.status,
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
      icon: CheckCircle,
    };

  let dynamicLabel = baseSt.label;
  if (attendance.status === "VALID") {
    dynamicLabel = hasAdminNotes ? "Disetujui (dengan catatan)" : "Disetujui";
  } else if (attendance.status === "REJECTED") {
    dynamicLabel = hasAdminNotes ? "Ditolak (dengan catatan)" : "Ditolak";
  }

  const st = { ...baseSt, label: dynamicLabel };
  const StatusIcon = st.icon;

  const dateObj = new Date(attendance.date);
  const formattedDate = format(dateObj, "EEEE, dd MMMM yyyy", { locale: id });

  const hasPhotos =
    Boolean(attendance.checkInPhoto) ||
    Boolean(attendance.workplacePhoto) ||
    Boolean(attendance.checkOutPhoto);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150 my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-100 uppercase tracking-wider">
                <Calendar size={14} />
                Detail Presensi Kehadiran
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {formattedDate}
            </h3>
            {attendance.shift && (
              <p className="text-xs text-blue-100 mt-0.5 flex items-center gap-1">
                <Clock size={12} /> {attendance.shift.name}
                {attendance.shift.startTime && attendance.shift.endTime
                  ? ` (${attendance.shift.startTime} - ${attendance.shift.endTime} WIB)`
                  : ""}
              </p>
            )}
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Status & Lateness Banner */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <span className="text-xs text-gray-400 block mb-0.5 font-medium">
                  Status Verifikasi:
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${st.badgeClass}`}
                >
                  <StatusIcon size={14} />
                  {st.label}
                </span>
              </div>
              {attendance.lateMinutes > 0 ? (
                <div className="text-right">
                  <span className="text-xs text-amber-600 block mb-0.5 font-medium">
                    Keterlambatan:
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">
                    <Clock size={12} /> {attendance.lateMinutes} Menit
                  </span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-xs text-green-600 font-semibold bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 inline-flex items-center gap-1">
                    <Check size={12} /> Tepat Waktu
                  </span>
                </div>
              )}
            </div>

            {/* Catatan Admin (Bila ada catatan dari admin) */}
            {attendance.adminNotes && (
              <div
                className={`p-4 rounded-2xl border ${
                  attendance.status === "REJECTED"
                    ? "bg-red-50/80 border-red-200 text-red-900"
                    : attendance.status === "CORRECTED"
                    ? "bg-blue-50/80 border-blue-200 text-blue-900"
                    : "bg-amber-50/80 border-amber-200 text-amber-900"
                } space-y-1`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <MessageSquare size={14} />
                  Catatan dari Administrator
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  "{attendance.adminNotes}"
                </p>
                <p className="text-[11px] opacity-75 mt-1">
                  Catatan ini diberikan langsung oleh admin saat proses validasi absensi Anda.
                </p>
              </div>
            )}

            {/* Waktu Masuk & Pulang */}
            <div className="grid grid-cols-2 gap-3">
              {/* Jam Masuk */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                  <Clock size={13} className="text-blue-500" />
                  Absen Masuk (Datang)
                </span>
                <div className="font-mono text-base font-bold text-gray-800">
                  {attendance.checkInTime
                    ? `${format(new Date(attendance.checkInTime), "HH:mm")} WIB`
                    : "-"}
                </div>
                {attendance.checkInDistance != null && (
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <MapPin size={11} className="text-gray-400" />
                    Jarak: {attendance.checkInDistance}m dari kantor
                  </div>
                )}
              </div>

              {/* Jam Pulang */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                  <Clock size={13} className="text-indigo-500" />
                  Absen Pulang
                </span>
                <div className="font-mono text-base font-bold text-gray-800">
                  {attendance.checkOutTime
                    ? `${format(new Date(attendance.checkOutTime), "HH:mm")} WIB`
                    : "Belum Pulang"}
                </div>
                {attendance.checkOutDistance != null && (
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <MapPin size={11} className="text-gray-400" />
                    Jarak: {attendance.checkOutDistance}m dari kantor
                  </div>
                )}
              </div>
            </div>

            {/* Foto-Foto yang Telah Diambil */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-blue-500" />
                Foto-Foto Bukti Kehadiran
              </label>

              {!hasPhotos ? (
                <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                  Tidak ada foto yang tersimpan untuk absensi ini.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Foto 1: Muka */}
                  {attendance.checkInPhoto && (
                    <div
                      onClick={() =>
                        setZoomPhoto({
                          url: attendance.checkInPhoto!,
                          label: "Foto Wajah (Muka) - Absen Masuk",
                        })
                      }
                      className="group relative bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 cursor-pointer shadow-2xs hover:border-blue-400 transition-all"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-black flex items-center justify-center">
                        <img
                          src={attendance.checkInPhoto}
                          alt="Foto Muka"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2 bg-white text-center">
                        <span className="text-[11px] font-bold text-gray-700 flex items-center justify-center gap-1">
                          <User size={12} className="text-blue-600" /> Foto Muka
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Absen Masuk
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Foto 2: Lokasi Kerja Nyata */}
                  {attendance.workplacePhoto && (
                    <div
                      onClick={() =>
                        setZoomPhoto({
                          url: attendance.workplacePhoto!,
                          label:
                            "Foto Lokasi Kerja Nyata (Anti-Fake GPS) - Absen Masuk",
                        })
                      }
                      className="group relative bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 cursor-pointer shadow-2xs hover:border-purple-400 transition-all"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-black flex items-center justify-center">
                        <img
                          src={attendance.workplacePhoto}
                          alt="Foto Lokasi"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2 bg-white text-center">
                        <span className="text-[11px] font-bold text-purple-700 flex items-center justify-center gap-1">
                          <Building2 size={12} className="text-purple-600" />{" "}
                          Lokasi Kerja
                        </span>
                        <span className="text-[10px] text-purple-500 font-medium block">
                          Anti Fake GPS
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Foto 3: Pulang */}
                  {attendance.checkOutPhoto && (
                    <div
                      onClick={() =>
                        setZoomPhoto({
                          url: attendance.checkOutPhoto!,
                          label: "Foto Absen Pulang",
                        })
                      }
                      className="group relative bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 cursor-pointer shadow-2xs hover:border-emerald-400 transition-all"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-black flex items-center justify-center">
                        <img
                          src={attendance.checkOutPhoto}
                          alt="Foto Pulang"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2 bg-white text-center">
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                          <CheckCircle size={12} className="text-emerald-600" />{" "}
                          Foto Pulang
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Selesai Kerja
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Catatan dari Pegawai (jika ada) */}
            {attendance.notes && (
              <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100">
                <span className="font-semibold text-gray-700">
                  Catatan Anda:
                </span>{" "}
                {attendance.notes}
              </div>
            )}
          </div>

          {/* Footer Close Button */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Full-Screen Zoom Photo Lightbox */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setZoomPhoto(null)}
        >
          <div
            className="relative max-w-xl w-full bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-gray-800/90 border-b border-gray-700 flex items-center justify-between text-white">
              <span className="text-xs font-bold">{zoomPhoto.label}</span>
              <button
                onClick={() => setZoomPhoto(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center">
              <img
                src={zoomPhoto.url}
                alt="Zoom"
                className="w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}