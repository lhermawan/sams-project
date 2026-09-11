"use client";

import { useEffect, use } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function ImpersonatePage({ params }: { params: any }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const unwrappedParams: any = use(params);

  useEffect(() => {
    if (!token) return;

    let domain = unwrappedParams?.tenantDomain;
    if (!domain && typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host.endsWith(".niskala.id")) {
        const prefix = host.slice(0, -".niskala.id".length);
        if (prefix && prefix !== "www" && prefix !== "app") domain = prefix;
      } else if (host.includes(".localhost")) {
        const prefix = host.split(".localhost")[0];
        if (prefix && prefix !== "www" && prefix !== "app" && prefix !== "localhost") domain = prefix;
      }
    }

    signIn("credentials", {
      impersonationToken: token,
      tenantDomain: domain || "",
      redirect: false,
    }).then((res) => {
      if (res?.ok) {
        window.location.href = "/admin/dashboard";
      } else {
        console.error("Impersonate login failed:", res?.error);
        alert("Gagal memvalidasi token impersonate: " + (res?.error || "Invalid session"));
        window.location.href = "/login";
      }
    }).catch((err) => {
      console.error("Impersonate error:", err);
      alert("Terjadi kesalahan saat memproses sesi impersonate");
      window.location.href = "/login";
    });
  }, [token, unwrappedParams?.tenantDomain]);

  if (!token) return <div className="p-10 text-center">Invalid or missing token.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 font-medium">Memasuki Admin Panel perusahaan...</p>
      </div>
    </div>
  );
}
