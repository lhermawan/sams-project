"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Share2, PlusSquare, Check } from "lucide-react";

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Register service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.log("SW registration error:", err);
      });
    }

    // 2. Check if already installed (standalone mode)
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      // Check if iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIosDevice);

      // If already installed, do not show
      if (isStandaloneMode) return;

      // Check if dismissed recently (within 24 hours)
      const dismissedTime = localStorage.getItem("sams_pwa_dismissed");
      const isDismissedRecently =
        dismissedTime && Date.now() - parseInt(dismissedTime) < 24 * 60 * 60 * 1000;

      // 3. Listen for beforeinstallprompt event (Chrome, Edge, Android)
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        if (!isDismissedRecently) {
          setShowPrompt(true);
        }
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      window.addEventListener("appinstalled", () => {
        setInstalled(true);
        setShowPrompt(false);
        setDeferredPrompt(null);
      });

      // For mobile iOS / Android where event hasn't fired yet, show after 2 seconds if not dismissed
      const timer = setTimeout(() => {
        if (!isStandaloneMode && !isDismissedRecently) {
          setShowPrompt(true);
        }
      }, 2000);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        clearTimeout(timer);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback for Android Chrome if prompt isn't directly triggerable
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("sams_pwa_dismissed", Date.now().toString());
    }
  };

  if (isStandalone || installed) {
    return null;
  }

  return (
    <>
      {/* Bottom Floating Install Banner / Modal - positioned above mobile bottom nav */}
      {showPrompt && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 md:p-5 relative overflow-hidden backdrop-blur-md bg-white/95">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-700" />

            <div className="flex items-start gap-3.5">
              {/* SAMS App Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex-shrink-0 flex items-center justify-center text-white shadow-md">
                <Smartphone size={24} className="text-white" />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <h4 className="font-bold text-gray-900 text-sm md:text-base leading-snug">
                  Pasang Aplikasi SAMS di HP
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Jadikan shortcut di layar utama HP Anda agar bisa dibuka langsung dan cepat tanpa perlu ketik alamat web lagi.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Pasang Sekarang</span>
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    Nanti Saja
                  </button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Installation Guide Modal (For iOS Safari or fallback) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  SAMS
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Cara Pasang di HP</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <p className="font-medium text-gray-900">
                Ikuti 2 langkah mudah untuk memasang shortcut SAMS di layar utama HP Anda:
              </p>

              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="p-1 bg-white rounded-md text-blue-600 shadow-2xs">
                      <Share2 size={16} />
                    </div>
                    <div>
                      <strong>Langkah 1:</strong> Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah browser Safari Anda.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="p-1 bg-white rounded-md text-blue-600 shadow-2xs">
                      <PlusSquare size={16} />
                    </div>
                    <div>
                      <strong>Langkah 2:</strong> Geser ke bawah lalu pilih menu <strong>&quot;Tambah ke Layar Utama&quot; (Add to Home Screen)</strong>.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="p-1 bg-white rounded-md text-blue-600 shadow-2xs font-bold px-1.5">
                      ⋮
                    </div>
                    <div>
                      <strong>Langkah 1:</strong> Ketuk tombol <strong>menu titik tiga (⋮)</strong> di pojok kanan atas browser Chrome.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="p-1 bg-white rounded-md text-blue-600 shadow-2xs">
                      <Download size={16} />
                    </div>
                    <div>
                      <strong>Langkah 2:</strong> Pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> atau <strong>&quot;Instal Aplikasi&quot;</strong>.
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-1.5 text-green-700 bg-green-50 p-2 rounded-xl font-medium border border-green-200">
                <Check size={14} className="shrink-0" />
                <span>Selesai! Ikon SAMS akan langsung muncul di menu HP Anda.</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSGuide(false);
                setShowPrompt(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
