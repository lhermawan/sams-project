"use client";

import { useEffect, use } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function ImpersonatePage({ params }: { params: any }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const unwrappedParams: any = use(params);

  useEffect(() => {
    if (token && unwrappedParams.tenantDomain) {
      signIn("credentials", {
        impersonationToken: token,
        tenantDomain: unwrappedParams.tenantDomain,
        redirect: false
      }).then((res) => {
        if (res?.ok) {
          window.location.href = "/admin/dashboard";
        } else {
          alert("Gagal memvalidasi token impersonate");
          window.location.href = "/login";
        }
      });
    }
  }, [token, unwrappedParams.tenantDomain]);

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
