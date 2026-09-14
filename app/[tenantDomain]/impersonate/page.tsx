"use client";

import { Suspense, useEffect, use } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function ImpersonateContent({ params }: { params: any }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const unwrappedParams: any = params && typeof params.then === "function" ? use(params) : params;

  useEffect(() => {
    if (!token) return;

    let domain = unwrappedParams?.tenantDomain;
    if (!domain && typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host.endsWith(".5758inc.my.id")) {
        const prefix = host.slice(0, -".5758inc.my.id".length);
        if (prefix && prefix !== "www" && prefix !== "app") domain = prefix;
      } else if (host.includes(".localhost")) {
        const prefix = host.split(".localhost")[0];
        if (prefix && prefix !== "www" && prefix !== "app" && prefix !== "localhost") domain = prefix;
      }
    }

    console.log("[IMPERSONATE] Initiating signIn for domain:", domain);

    signIn("credentials", {
      impersonationToken: token,
      tenantDomain: domain || "",
      redirect: false,
    }).then((res) => {
      if (res?.ok) {
        console.log("[IMPERSONATE] Login successful, redirecting to /admin/dashboard");
        window.location.replace("/admin/dashboard");
      } else {
        console.error("Impersonate login failed:", res?.error);
        alert("Gagal memvalidasi token impersonate: " + (res?.error || "Invalid session"));
        window.location.replace("/login");
      }
    }).catch((err) => {
      console.error("Impersonate error:", err);
      alert("Terjadi kesalahan saat memproses sesi impersonate");
      window.location.replace("/login");
    });
  }, [token, unwrappedParams?.tenantDomain]);

  if (!token) return <div className="p-10 text-center">Token login tidak valid atau kosong.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 font-medium">Memasuki Admin Panel perusahaan...</p>
      </div>
    </div>
  );
}

export default function ImpersonatePage(props: any) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ImpersonateContent {...props} />
    </Suspense>
  );
}
