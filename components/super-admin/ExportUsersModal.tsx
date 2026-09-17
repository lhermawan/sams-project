"use client";

import { useState, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { TenantOption } from "./UserTable";

interface ExportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: TenantOption[];
  initialTenantId?: string;
}

export default function ExportUsersModal({
  isOpen,
  onClose,
  tenants,
  initialTenantId = "ALL",
}: ExportUsersModalProps) {
  const [selectedTenant, setSelectedTenant] = useState(initialTenantId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTenant(initialTenantId);
      setError(null);
    }
  }, [isOpen, initialTenantId]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/super-admin/users/export?tenantId=${selectedTenant}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengekspor data pengguna.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = "5758_Data_Pengguna.xlsx";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengekspor data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150 my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Export Data Pengguna</h3>
              <p className="text-xs text-emerald-100">
                Unduh spreadsheet Excel (.xlsx) data akun dan status login
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector Mitra */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Building2 size={14} className="text-emerald-600" />
              Pilih Mitra Perusahaan
            </label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="ALL">Semua Mitra (Gabungan Seluruh Perusahaan)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.subdomain})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Pilih <span className="font-semibold text-gray-700">Semua Mitra</span> untuk mengunduh rekap gabungan, atau pilih salah satu mitra spesifik.
            </p>
          </div>

          {/* Info Format & Password Logic */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 space-y-2.5 text-xs text-emerald-950">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <KeyRound size={15} className="text-emerald-700 shrink-0" />
              Logika Status Password Otomatis
            </div>
            <p className="text-emerald-800 leading-relaxed text-[11.5px]">
              Sistem melakukan komparasi hash kata sandi secara aman tanpa mengubah struktur database:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                <div className="font-semibold text-orange-700">Password Default</div>
                <div className="text-gray-600 mt-0.5">
                  Ditampilkan <span className="font-mono font-bold text-orange-800 bg-orange-50 px-1 py-0.5 rounded">Pegawai@123</span> jika user belum mengubah kata sandinya.
                </div>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                <div className="font-semibold text-emerald-700">Password Mandiri</div>
                <div className="text-gray-600 mt-0.5">
                  Ditampilkan <span className="font-medium italic text-emerald-800 bg-emerald-100/60 px-1 py-0.5 rounded">Sudah Diubah Mandiri</span> untuk menjaga privasi sandi pegawai.
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Berkas */}
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">Struktur 12 Kolom Berkas:</span>{" "}
            No, Nama Mitra, Nama Pegawai, NIP, Bagian, Jabatan, Role, Username/Email Login, Password Login, No. Telepon, Status Akun, dan Tanggal Dibuat.
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Membuat Excel...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download Excel (.xlsx)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
