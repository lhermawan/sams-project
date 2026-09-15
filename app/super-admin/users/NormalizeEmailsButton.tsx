"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Loader2 } from "lucide-react";

export default function NormalizeEmailsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNormalize = async () => {
    if (!confirm("Apakah Anda yakin ingin menormalisasi semua email Pegawai menjadi @5758inc.id? Tindakan ini akan mengubah email login mereka (hanya sementara/satu kali klik).")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/users/normalize-emails", {
        method: "POST"
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal");
      
      alert(`Berhasil menormalisasi ${data.count} email pegawai.`);
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleNormalize}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200 rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer w-fit"
      title="Perbaiki email pegawai ke @5758inc.id (Sementara)"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
      Fix Email Pegawai
    </button>
  );
}
