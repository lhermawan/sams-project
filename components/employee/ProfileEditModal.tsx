"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Camera,
  Upload,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Briefcase,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

export interface ProfileInitialData {
  name: string;
  nip: string;
  department: string;
  position: string;
  email: string;
  phone: string | null;
  address: string | null;
  photoUrl: string | null;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: ProfileInitialData;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
  initialData,
}: ProfileEditModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState(initialData.email || "");
  const [phone, setPhone] = useState(initialData.phone || "");
  const [address, setAddress] = useState(initialData.address || "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData.photoUrl || null
  );
  const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageProcess = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar (JPG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          setPhotoPreview(resizedBase64);
          setNewPhotoBase64(resizedBase64);
          setError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };

      if (newPhotoBase64) {
        payload.photo = newPhotoBase64;
      }

      const res = await fetch("/api/employee/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui profil.");
      }

      setSuccess("Profil berhasil diperbarui!");
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
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
        className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150 my-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold">Edit Profil Pegawai</h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Perbarui username login, data kontak, dan foto profil Anda.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto grow">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Section: Ganti Foto Profil */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
            <div className="relative w-24 h-24 mx-auto mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview Profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initialData.name.charAt(0)
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg border border-white cursor-pointer transition-transform hover:scale-105"
                title="Unggah Foto Baru"
              >
                <Camera size={14} />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
              >
                <Upload size={13} className="text-blue-600" />
                Pilih Berkas
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
              >
                <Camera size={13} className="text-blue-600" />
                Ambil Kamera
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageProcess(f);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageProcess(f);
              }}
            />
            <p className="text-[11px] text-gray-400 mt-2">
              Maksimal ukuran foto 5MB. Format JPG, PNG, atau WEBP.
            </p>
          </div>

          {/* Readonly Identitas Resmi */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
              <span className="flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-blue-600" />
                Identitas Resmi Kepegawaian
              </span>
              <span className="text-[10px] bg-blue-200/60 text-blue-800 px-2 py-0.5 rounded-full font-normal">
                Dikelola HRD
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded-xl border border-blue-100/80">
                <div className="text-[10px] text-gray-400">Nama Lengkap</div>
                <div className="font-semibold text-gray-800 truncate">{initialData.name}</div>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-blue-100/80">
                <div className="text-[10px] text-gray-400">NIP / ID Pegawai</div>
                <div className="font-semibold text-gray-800 truncate">{initialData.nip}</div>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-blue-100/80">
                <div className="text-[10px] text-gray-400">Bagian</div>
                <div className="font-semibold text-gray-800 truncate">{initialData.department}</div>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-blue-100/80">
                <div className="text-[10px] text-gray-400">Jabatan</div>
                <div className="font-semibold text-gray-800 truncate">{initialData.position}</div>
              </div>
            </div>
          </div>

          {/* Editable Username/Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Mail size={13} className="text-blue-600" />
              Username / Email Login
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nama.user@5758inc.id"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Bisa memasukkan username saja (misal: <span className="font-mono text-gray-600">budi</span>, otomatis menjadi <span className="font-mono text-gray-600">budi@5758inc.id</span>) atau email lengkap.
            </p>
          </div>

          {/* Editable Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Phone size={13} className="text-blue-600" />
              Nomor Telepon (WhatsApp)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 08123456789"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Editable Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <MapPin size={13} className="text-blue-600" />
              Alamat Domisili
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Contoh: Jl. Sudirman No. 45, RT 02/RW 03..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
