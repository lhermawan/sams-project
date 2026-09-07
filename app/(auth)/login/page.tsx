"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [branding, setBranding] = useState({
    app_name: "SAMS",
    company_name: "PT. Smart Attendance Management",
    company_tagline: "Smart Attendance Management System",
    company_logo: "",
    login_title: "Selamat Datang",
    login_subtitle: "Masuk ke akun Anda untuk melanjutkan",
    login_footer_text: "Hubungi administrator jika lupa password",
    footer_text: "",
    support_contact: "",
  });

  const loadBranding = () => {
    fetch(`/api/settings?_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setBranding({
            app_name: data.app_name || "SAMS",
            company_name: data.company_name || "PT. Smart Attendance Management",
            company_tagline: data.company_tagline || data.company_name || "Smart Attendance Management System",
            company_logo: data.company_logo || "",
            login_title: data.login_title || "Selamat Datang",
            login_subtitle: data.login_subtitle || "Masuk ke akun Anda untuk melanjutkan",
            login_footer_text: data.login_footer_text || "Hubungi administrator jika lupa password",
            footer_text: data.footer_text || "",
            support_contact: data.support_contact || "",
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadBranding();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "branding-updated") {
        loadBranding();
      }
    };
    window.addEventListener("branding-updated", loadBranding);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("branding-updated", loadBranding);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email atau password salah. Silakan coba lagi.");
        setIsLoading(false);
        return;
      }

      // Fetch session to determine role-based redirect
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      const role = session?.user?.role;

      if (role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError("Terjadi kesalahan koneksi. Coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / App Name */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4 p-2 overflow-hidden">
            {branding.company_logo ? (
              <img
                src={branding.company_logo}
                alt="Logo Perusahaan"
                className="w-full h-full object-contain"
              />
            ) : (
              <Shield className="w-10 h-10 text-blue-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{branding.app_name}</h1>
          <p className="text-blue-100 text-sm mt-1 font-medium">
            {branding.company_tagline || branding.company_name}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-2">
            {branding.login_title || "Selamat Datang"}
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm mb-5 sm:mb-6">
            {branding.login_subtitle || "Masuk ke akun Anda untuk melanjutkan"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nama@perusahaan.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Masukkan password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>

          {/* Hint / Support */}
          <div className="text-center text-xs text-gray-400 mt-6 space-y-1 border-t border-gray-100 pt-4">
            <p>{branding.login_footer_text || "Hubungi administrator jika lupa password"}</p>
            {branding.support_contact && (
              <p className="font-medium text-blue-600">
                Bantuan: {branding.support_contact}
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          {branding.footer_text || `© ${new Date().getFullYear()} ${branding.company_name || branding.app_name}. Hak Cipta Dilindungi.`}
        </p>
      </div>
    </div>
  );
}
