"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Clock, MapPin, Image as ImageIcon, MessageSquare, ChevronRight } from "lucide-react";
import AttendanceDetailModal, { AttendanceDetailData } from "./AttendanceDetailModal";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  VALID: { label: "Disetujui", color: "bg-green-100 text-green-700 border-green-200" },
  LATE: { label: "Terlambat", color: "bg-orange-100 text-orange-700 border-orange-200" },
  ABSENT: { label: "Tidak Hadir", color: "bg-red-100 text-red-700 border-red-200" },
  PENDING: { label: "Menunggu", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  REJECTED: { label: "Ditolak", color: "bg-red-100 text-red-700 border-red-200" },
  CORRECTED: { label: "Dikoreksi", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

export default function AttendanceHistoryList({
  records,
}: {
  records: AttendanceDetailData[];
}) {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceDetailData | null>(null);

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100 p-6">
        <p className="font-medium text-sm">Tidak ada data untuk periode ini</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {records.map((rec) => {
          const baseSt = STATUS_MAP[rec.status] ?? {
            label: rec.status,
            color: "bg-gray-100 text-gray-700 border-gray-200",
          };
          const hasNotes = Boolean(rec.adminNotes && rec.adminNotes.trim());
          let label = baseSt.label;
          if (rec.status === "VALID") {
            label = hasNotes ? "Disetujui (dengan catatan)" : "Disetujui";
          } else if (rec.status === "REJECTED") {
            label = hasNotes ? "Ditolak (dengan catatan)" : "Ditolak";
          }
          const st = { ...baseSt, label };
          const dateObj = new Date(rec.date);
          const hasPhotos = Boolean(rec.checkInPhoto || rec.workplacePhoto || rec.checkOutPhoto);

          return (
            <div
              key={rec.id}
              onClick={() => setSelectedRecord(rec)}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">
                    {format(dateObj, "EEEE, dd MMMM yyyy", { locale: id })}
                  </div>
                  {rec.shift && (
                    <div className="text-xs text-gray-400 mt-0.5">{rec.shift.name}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${st.color}`}
                  >
                    {st.label}
                  </span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>

              <div className="flex gap-4 text-sm items-center flex-wrap pt-1 border-t border-gray-50">
                <div>
                  <span className="text-gray-400 text-xs block">Masuk</span>
                  <div className="font-mono font-bold text-gray-700 text-xs">
                    {rec.checkInTime ? format(new Date(rec.checkInTime), "HH:mm") : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs block">Pulang</span>
                  <div className="font-mono font-bold text-gray-700 text-xs">
                    {rec.checkOutTime ? format(new Date(rec.checkOutTime), "HH:mm") : "-"}
                  </div>
                </div>

                {rec.lateMinutes > 0 && (
                  <div className="flex items-center gap-1 text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-100">
                    <Clock size={11} />
                    Telat {rec.lateMinutes}m
                  </div>
                )}

                {rec.checkInDistance != null && (
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <MapPin size={11} />
                    {rec.checkInDistance}m
                  </div>
                )}

                {hasPhotos && (
                  <div className="ml-auto flex items-center gap-1 text-blue-600 text-xs font-medium">
                    <ImageIcon size={12} />
                    <span>Lihat Foto</span>
                  </div>
                )}
              </div>

              {/* Admin Note Badge if present */}
              {rec.adminNotes && (
                <div className="mt-2.5 pt-2 border-t border-gray-50 flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50/70 px-2.5 py-1.5 rounded-xl border border-amber-200/60">
                  <MessageSquare size={12} className="shrink-0 text-amber-600" />
                  <span className="truncate">
                    <strong>Catatan Admin:</strong> {rec.adminNotes}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Attendance Detail Modal */}
      <AttendanceDetailModal
        attendance={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </>
  );
}