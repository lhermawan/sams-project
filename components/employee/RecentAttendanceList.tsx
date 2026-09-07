"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronRight, Image as ImageIcon, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import AttendanceDetailModal, { AttendanceDetailData } from "./AttendanceDetailModal";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  VALID: { label: "Disetujui", color: "bg-green-100 text-green-700 border-green-200" },
  LATE: { label: "Terlambat", color: "bg-orange-100 text-orange-700 border-orange-200" },
  ABSENT: { label: "Tidak Hadir", color: "bg-red-100 text-red-700 border-red-200" },
  PENDING: { label: "Menunggu", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  REJECTED: { label: "Ditolak", color: "bg-red-100 text-red-700 border-red-200" },
  CORRECTED: { label: "Dikoreksi", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

export default function RecentAttendanceList({
  records,
}: {
  records: AttendanceDetailData[];
}) {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceDetailData | null>(null);

  if (!records || records.length === 0) {
    return (
      <div className="p-5 text-center text-xs text-gray-400">
        Belum ada riwayat absensi
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Riwayat Terakhir</h3>
            <p className="text-[11px] text-gray-400">Klik untuk melihat foto dan catatan absensi</p>
          </div>
          <Link href="/history" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
            Semua <ArrowRight size={12} />
          </Link>
        </div>

        <div className="divide-y divide-gray-50">
          {records.map((att) => {
            const baseSt = STATUS_MAP[att.status] ?? {
              label: att.status,
              color: "bg-gray-100 text-gray-700 border-gray-200",
            };
            const hasNotes = Boolean(att.adminNotes && att.adminNotes.trim());
            let label = baseSt.label;
            if (att.status === "VALID") {
              label = hasNotes ? "Disetujui (dengan catatan)" : "Disetujui";
            } else if (att.status === "REJECTED") {
              label = hasNotes ? "Ditolak (dengan catatan)" : "Ditolak";
            }
            const st = { ...baseSt, label };
            const hasPhotos = Boolean(att.checkInPhoto || att.workplacePhoto || att.checkOutPhoto);

            return (
              <div
                key={att.id}
                onClick={() => setSelectedRecord(att)}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-blue-50/50 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {format(new Date(att.date), "dd MMM yyyy", { locale: id })}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                    <span>
                      {att.checkInTime ? format(new Date(att.checkInTime), "HH:mm") : "-"}
                      {" s/d "}
                      {att.checkOutTime ? format(new Date(att.checkOutTime), "HH:mm") : "-"} WIB
                    </span>
                    {hasPhotos && (
                      <span className="inline-flex items-center gap-0.5 text-blue-600 text-[11px] font-medium bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        <ImageIcon size={10} /> Foto
                      </span>
                    )}
                    {att.adminNotes && (
                      <span className="inline-flex items-center gap-0.5 text-amber-700 text-[11px] font-medium bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100">
                        <MessageSquare size={10} /> Catatan
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${st.color}`}
                  >
                    {st.label}
                  </span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
          <Link href="/history" className="text-xs text-blue-600 font-semibold flex items-center justify-center gap-1.5 hover:underline">
            Buka Halaman Riwayat Lengkap <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Attendance Detail Modal */}
      <AttendanceDetailModal
        attendance={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </>
  );
}