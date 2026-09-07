"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  MapPin,
  Camera,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Lock,
  AlertTriangle,
  Clock,
  Building2,
  User,
  ShieldCheck,
  RotateCcw,
  CalendarDays,
  Check,
} from "lucide-react";
import { haversineDistance } from "@/lib/geolocation";
import { cn } from "@/lib/utils";
import Link from "next/link";

type LocationState = "idle" | "checking" | "valid" | "invalid" | "denied";
type AttendanceType = "MASUK" | "PULANG";
type SubmitState = "idle" | "capturing" | "submitting" | "success" | "error";

interface OfficeInfo {
  latitude: number;
  longitude: number;
  radius: number;
  name: string;
}

interface ScheduleInfo {
  name: string;
  startTime: string;
  endTime: string;
  toleranceMin: number;
  isCrossDay: boolean;
}

interface TodayStatus {
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto?: string | null;
  workplacePhoto?: string | null;
  type: AttendanceType;
  schedule?: ScheduleInfo;
  isWeekendHoliday?: boolean;
  weekendNote?: string;
  department?: string;
  lateMinutes?: number;
}

export default function AttendancePage() {
  const { data: session } = useSession();

  // --- State ---
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [distance, setDistance] = useState<number | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [office, setOffice] = useState<OfficeInfo | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successNote, setSuccessNote] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dual Photos for Absen Masuk (Face + Workplace)
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [workplacePhoto, setWorkplacePhoto] = useState<string | null>(null);
  const [activeCaptureType, setActiveCaptureType] = useState<"face" | "workplace">("face");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Clock ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Load office info + today status ---
  const fetchStatus = () => {
    fetch("/api/settings/office")
      .then((r) => r.json())
      .then(setOffice)
      .catch(() => {});

    fetch(`/api/attendance/today?_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setTodayStatus(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // --- GPS Check ---
  const checkLocation = useCallback(() => {
    setLocationState("checking");
    setDistance(null);

    if (!navigator.geolocation) {
      setLocationState("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);

        if (!office) return;

        const dist = haversineDistance(lat, lng, office.latitude, office.longitude);
        const rounded = Math.round(dist * 10) / 10;
        setDistance(rounded);
        setLocationState(rounded <= office.radius ? "valid" : "invalid");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationState("denied");
        } else {
          setLocationState("invalid");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [office]);

  useEffect(() => {
    if (office) checkLocation();
  }, [office]);

  // --- Camera Handling ---
  const startCamera = async (facing: "user" | "environment" = "user") => {
    setShowCamera(true);
    setCameraFacing(facing);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setErrorMsg("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0);

    const now = new Date();
    const timeStr = now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const tag = activeCaptureType === "workplace" ? "LOKASI KERJA" : "FOTO WAJAH";

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`[${tag}] ${session?.user?.name || "Pegawai"} | ${timeStr} WIB`, 10, canvas.height - 22);
    if (userLat && userLng) {
      ctx.font = "11px monospace";
      ctx.fillStyle = "#93c5fd";
      ctx.fillText(`GPS: ${userLat.toFixed(5)}, ${userLng.toFixed(5)}`, 10, canvas.height - 8);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    if (attendanceType === "MASUK") {
      if (activeCaptureType === "face") {
        setFacePhoto(dataUrl);
        stopCamera();
        setActiveCaptureType("workplace");
        setTimeout(() => {
          startCamera("environment");
        }, 500);
      } else {
        setWorkplacePhoto(dataUrl);
        stopCamera();
      }
    } else {
      setFacePhoto(dataUrl);
      stopCamera();
    }
  };

  // --- Time display & Real-time Schedule Validation ---
  const timeStr = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  const dateStr = currentTime.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  const attendanceType = todayStatus?.type ?? "MASUK";
  const isAlreadyDone =
    todayStatus?.checkInTime !== null && todayStatus?.checkOutTime !== null;
  const schedule = todayStatus?.schedule;

  // Real-time evaluation:
  // - MASUK: Selalu diperbolehkan (allowed: true), hitung menit telat real-time.
  // - PULANG: Dibuka untuk presentasi! Hitung menit pulang awal real-time.
  const timeValidation = (() => {
    if (!schedule) return { allowed: true, isLate: false, lateMinutes: 0, isEarly: false, earlyMinutes: 0, reason: "" };

    const type = todayStatus?.type ?? "MASUK";

    if (type === "MASUK") {
      const [sH, sM] = schedule.startTime.split(":").map(Number);
      const startMin = sH * 60 + sM;
      const curMin = currentTime.getHours() * 60 + currentTime.getMinutes();
      const isLate = curMin > startMin + (schedule.toleranceMin || 0);
      const lateMinutes = isLate ? curMin - startMin : 0;

      return {
        allowed: true, // Absen masuk selalu dibuka
        isLate,
        lateMinutes,
        isEarly: false,
        earlyMinutes: 0,
        reason: isLate
          ? `Perhatian: Anda terlambat ${lateMinutes} menit dari jadwal masuk (${schedule.startTime} WIB). Absensi masuk tetap dapat dilakukan dan tercatat.`
          : "",
      };
    } else {
      // PULANG - Selalu dibuka untuk presentasi
      const [eH, eM] = (schedule.endTime || "17:00").split(":").map(Number);
      const shiftEnd = new Date(currentTime);
      shiftEnd.setHours(eH, eM, 0, 0);
      const isEarly = currentTime < shiftEnd;
      const earlyMinutes = isEarly
        ? Math.max(0, Math.round((shiftEnd.getTime() - currentTime.getTime()) / 60000))
        : 0;

      return {
        allowed: true, // Absen pulang dibuka untuk presentasi
        isLate: false,
        lateMinutes: 0,
        isEarly,
        earlyMinutes,
        reason: isEarly
          ? `Jadwal kepulangan normal adalah pukul ${schedule.endTime} WIB (${earlyMinutes} menit lagi). Mode presentasi: Absen pulang dibuka dan dapat disubmit.`
          : `Waktu pulang sesuai jadwal (${schedule.endTime} WIB). Silakan lakukan absen pulang.`,
      };
    }
  })();

  // --- Submit Attendance ---
  const submitAttendance = async () => {
    if (!timeValidation.allowed) {
      setErrorMsg(timeValidation.reason);
      return;
    }

    if (attendanceType === "MASUK" && (!facePhoto || !workplacePhoto)) {
      setErrorMsg("Mohon lengkapi 2 foto: Foto Wajah dan Foto Lokasi Kerja.");
      return;
    }

    if (attendanceType === "PULANG" && !facePhoto) {
      setErrorMsg("Mohon ambil foto verifikasi kepulangan.");
      return;
    }

    const finalLat = userLat ?? office?.latitude ?? -6.2088;
    const finalLng = userLng ?? office?.longitude ?? 106.8456;
    const finalDistance = distance ?? 0;

    setSubmitState("submitting");
    setErrorMsg("");

    try {
      const type = todayStatus?.type ?? "MASUK";
      const endpoint = type === "MASUK" ? "/api/attendance/checkin" : "/api/attendance/checkout";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: finalLat,
          longitude: finalLng,
          distance: finalDistance,
          photo: facePhoto,
          workplacePhoto: attendanceType === "MASUK" ? workplacePhoto : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menyimpan absensi");
      }

      if (data.warningMessage) {
        setSuccessNote(data.warningMessage);
      } else {
        setSuccessNote(
          type === "MASUK"
            ? "Absen Masuk Berhasil Tepat Waktu!"
            : "Absen Pulang Berhasil!"
        );
      }

      setSubmitState("success");
      const updated = await fetch(`/api/attendance/today?_t=${Date.now()}`).then((r) => r.json());
      setTodayStatus(updated);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Terjadi kesalahan saat absensi");
      setSubmitState("error");
    }
  };

  const hasBothPhotos = attendanceType === "MASUK" ? (!!facePhoto && !!workplacePhoto) : !!facePhoto;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-5 pt-12 pb-6 text-white text-center">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard" className="flex items-center gap-1 text-blue-200 text-sm">
            <ChevronLeft size={16} />
            Kembali
          </Link>
          {schedule && (
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full text-blue-100 font-medium">
              {schedule.name}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold">
          {attendanceType === "MASUK" ? "Absen Masuk (Datang)" : "Absen Pulang"}
        </h1>

        {/* Real-time clock */}
        <div className="mt-4">
          <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight">{timeStr}</div>
          <div className="text-blue-200 text-sm mt-1">{dateStr} WIB</div>
          {schedule && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs text-blue-100">
              <Clock size={12} />
              <span>Jam Kerja: {schedule.startTime} - {schedule.endTime} (Toleransi: {schedule.toleranceMin} mnt)</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4 pb-8">
        {/* Weekend Info Banner */}
        {todayStatus?.isWeekendHoliday && (
          <div className="rounded-2xl p-4 border bg-blue-50 border-blue-200 text-blue-900 shadow-xs flex items-start gap-3">
            <CalendarDays className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Informasi Hari Libur Akhir Pekan</div>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                {todayStatus.weekendNote || "Hari ini adalah jadwal libur akhir pekan."} Bagi pegawai yang bertugas piket, lembur, atau dinas operasional, absensi tetap dapat dilakukan seperti biasa.
              </p>
            </div>
          </div>
        )}

        {/* Real-time Late Warning for Absen Masuk */}
        {attendanceType === "MASUK" && timeValidation.isLate && !isAlreadyDone && (
          <div className="rounded-2xl p-4 border bg-amber-50 border-amber-300 text-amber-900 shadow-xs flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">
                Peringatan: Anda Terlambat {timeValidation.lateMinutes} Menit!
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Jadwal masuk kantor: {schedule?.startTime} WIB (Batas toleransi: {schedule?.toleranceMin} menit).
                Absensi masuk <strong>tetap diterima</strong> dan jumlah menit keterlambatan otomatis dicatat oleh sistem.
              </p>
            </div>
          </div>
        )}

        {/* Already done today */}
        {isAlreadyDone && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center shadow-xs">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <div className="font-semibold text-green-800 text-lg">Absensi Hari Ini Selesai</div>
            <div className="text-sm text-green-600 mt-1">
              Masuk: {todayStatus?.checkInTime} • Pulang: {todayStatus?.checkOutTime}
            </div>
          </div>
        )}

        {/* Success state */}
        {submitState === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center shadow-xs">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <div className="font-semibold text-green-800 text-lg">
              {attendanceType === "MASUK" ? "Absen Masuk Berhasil!" : "Absen Pulang Berhasil!"}
            </div>
            <div className="text-sm text-green-700 mt-1 font-medium">
              {successNote}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Waktu: {timeStr} WIB
            </div>
          </div>
        )}

        {!isAlreadyDone && submitState !== "success" && (
          <>
            {/* Notice / Warning for Absen Pulang */}
            {attendanceType === "PULANG" && (
              <div
                className={cn(
                  "rounded-2xl p-4 border shadow-xs flex items-start gap-3",
                  timeValidation.isEarly
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-green-50 border-green-300 text-green-900"
                )}
              >
                <Clock
                  className={cn(
                    "w-6 h-6 flex-shrink-0 mt-0.5",
                    timeValidation.isEarly ? "text-amber-600" : "text-green-600"
                  )}
                />
                <div>
                  <div className="font-bold text-sm">
                    {timeValidation.isEarly
                      ? "Peringatan Waktu Pulang (Mode Presentasi)"
                      : "Waktu Absen Pulang"}
                  </div>
                  <p
                    className={cn(
                      "text-xs mt-1 leading-relaxed",
                      timeValidation.isEarly ? "text-amber-800" : "text-green-800"
                    )}
                  >
                    {timeValidation.reason}
                  </p>
                  {timeValidation.isEarly && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-200/70 rounded-full text-[11px] font-semibold text-amber-900">
                      Mode Demo/Presentasi: Absen pulang dibuka dan dapat diselesaikan
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location Status */}
            <div
              className={cn(
                "rounded-2xl p-5 border",
                locationState === "valid"
                  ? "bg-green-50 border-green-200"
                  : locationState === "invalid"
                  ? "bg-amber-50 border-amber-200"
                  : locationState === "checking"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <div className="flex items-center gap-3">
                {locationState === "checking" && (
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                )}
                {locationState === "valid" && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
                {locationState === "invalid" && (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                )}
                {locationState === "denied" && (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                {locationState === "idle" && (
                  <MapPin className="w-6 h-6 text-gray-400" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "font-semibold text-sm",
                        locationState === "valid"
                          ? "text-green-800"
                          : locationState === "invalid"
                          ? "text-amber-800"
                          : locationState === "denied"
                          ? "text-red-800"
                          : "text-gray-700"
                      )}
                    >
                      {locationState === "checking" && "Memeriksa Lokasi GPS..."}
                      {locationState === "valid" && "Dalam Radius Kantor"}
                      {locationState === "invalid" && "Di Luar Radius Kantor (Mode Presentasi Diizinkan)"}
                      {locationState === "denied" && "Izin Lokasi GPS Ditolak"}
                      {locationState === "idle" && "Menunggu Lokasi GPS..."}
                    </span>
                  </div>
                  {distance !== null ? (
                    <div
                      className={cn(
                        "text-xs mt-1",
                        locationState === "valid" ? "text-green-600" : "text-amber-800"
                      )}
                    >
                      Jarak: {distance} meter dari {office?.name ?? "kantor"} (Radius Kantor: {office?.radius}m)
                      {userLat && userLng && (
                        <div className="font-mono text-[11px] text-gray-500 mt-0.5">
                          GPS: {userLat.toFixed(5)}, {userLng.toFixed(5)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">
                      {office?.name ?? "Kantor"} • Radius {office?.radius ?? 100} meter
                    </div>
                  )}
                </div>
              </div>

              {(locationState === "invalid" || locationState === "denied") && (
                <button
                  onClick={checkLocation}
                  className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                >
                  <RefreshCw size={13} />
                  Periksa Ulang Lokasi GPS
                </button>
              )}
            </div>

            {/* Step Indicators for Dual Photos (Absen Masuk) */}
            {attendanceType === "MASUK" && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  <span>Prosedur Pengambilan Foto (Anti-Fake GPS)</span>
                  <span className="text-blue-600">
                    {facePhoto && workplacePhoto
                      ? "2 / 2 Selesai"
                      : facePhoto
                      ? "Langkah 2 dari 2"
                      : "Langkah 1 dari 2"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={cn(
                      "p-3 rounded-xl border flex items-center gap-2 text-xs",
                      facePhoto
                        ? "bg-green-50 border-green-200 text-green-800 font-semibold"
                        : activeCaptureType === "face"
                        ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold ring-2 ring-blue-400/30"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    )}
                  >
                    <User size={16} />
                    <span>1. Foto Muka</span>
                    {facePhoto && <Check size={16} className="ml-auto text-green-600" />}
                  </div>

                  <div
                    className={cn(
                      "p-3 rounded-xl border flex items-center gap-2 text-xs",
                      workplacePhoto
                        ? "bg-green-50 border-green-200 text-green-800 font-semibold"
                        : activeCaptureType === "workplace"
                        ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold ring-2 ring-blue-400/30"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    )}
                  >
                    <Building2 size={16} />
                    <span>2. Foto Lokasi Kerja</span>
                    {workplacePhoto && <Check size={16} className="ml-auto text-green-600" />}
                  </div>
                </div>
              </div>
            )}

            {/* Active Camera Viewfinder */}
            {showCamera && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                    <Camera size={18} className="text-blue-500" />
                    {attendanceType === "MASUK" ? (
                      activeCaptureType === "face" ? (
                        <span>Langkah 1: Foto Wajah (Kamera Depan)</span>
                      ) : (
                        <span>Langkah 2: Foto Suasana/Lokasi Kerja (Kamera Belakang)</span>
                      )
                    ) : (
                      <span>Foto Verifikasi Absen Pulang</span>
                    )}
                  </h3>
                  <button
                    onClick={() => startCamera(cameraFacing === "user" ? "environment" : "user")}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    title="Ganti kamera depan / belakang"
                  >
                    <RotateCcw size={12} />
                    Ganti Kamera
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Visual Guide Overlay */}
                  {activeCaptureType === "face" ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-52 border-2 border-white border-dashed rounded-full opacity-70 shadow-sm" />
                      <div className="absolute bottom-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                        Posisikan wajah Anda di dalam lingkaran
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-5/6 h-5/6 border-2 border-amber-300 border-dashed rounded-xl opacity-80 shadow-sm" />
                      <div className="absolute bottom-3 bg-black/70 text-amber-200 text-xs px-3 py-1 rounded-full font-medium">
                        Arahkan ke meja/lingkungan kantor nyata (Anti-Fake GPS)
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={capturePhoto}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <Camera size={18} />
                    {attendanceType === "MASUK" && activeCaptureType === "face"
                      ? "Ambil Foto Wajah (Lanjut ke Lokasi Kerja)"
                      : "Ambil Foto"}
                  </button>
                  <button
                    onClick={stopCamera}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    Tutup Kamera
                  </button>
                </div>
              </div>
            )}

            {/* Launch Camera Button (if not opened yet and missing photos) */}
            {!showCamera && !hasBothPhotos && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                <button
                  onClick={() => {
                    if (attendanceType === "MASUK" && facePhoto && !workplacePhoto) {
                      setActiveCaptureType("workplace");
                      startCamera("environment");
                    } else {
                      setActiveCaptureType("face");
                      startCamera("user");
                    }
                  }}
                  className="w-full border-2 border-dashed border-blue-300 rounded-2xl py-8 text-blue-600 flex flex-col items-center gap-2 hover:bg-blue-50 transition-colors"
                >
                  <Camera size={36} className="text-blue-600" />
                  <span className="font-bold text-base">
                    {attendanceType === "MASUK"
                      ? facePhoto
                        ? "Lanjut Foto Langkah 2 (Lokasi Kerja)"
                        : "Buka Kamera untuk Absen Datang"
                      : "Buka Kamera untuk Absen Pulang"}
                  </span>
                  <span className="text-xs text-blue-400">
                    {attendanceType === "MASUK"
                      ? "Diperlukan 2 foto: Muka dan Lokasi Kerja nyata"
                      : "Gunakan kamera depan untuk selfie kepulangan"}
                  </span>
                </button>
              </div>
            )}

            {/* Dual Photos Preview Card (Absen Masuk) */}
            {!showCamera && hasBothPhotos && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                      <ShieldCheck size={18} className="text-emerald-500" />
                      Foto Verifikasi Absensi Selesai
                    </h3>
                    <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Siap Dikirim
                    </span>
                  </div>

                  {attendanceType === "MASUK" ? (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Face Photo */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                          <User size={13} /> Foto Muka
                        </div>
                        <div className="relative rounded-xl overflow-hidden bg-gray-100 border aspect-[4/3]">
                          <img
                            src={facePhoto!}
                            alt="Foto Wajah"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setActiveCaptureType("face");
                            startCamera("user");
                          }}
                          className="w-full text-xs text-blue-600 hover:underline py-1 flex items-center justify-center gap-1"
                        >
                          <RotateCcw size={12} /> Ulangi Muka
                        </button>
                      </div>

                      {/* Workplace Photo */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                          <Building2 size={13} /> Foto Lokasi Kerja
                        </div>
                        <div className="relative rounded-xl overflow-hidden bg-gray-100 border aspect-[4/3]">
                          <img
                            src={workplacePhoto!}
                            alt="Foto Lokasi Kerja"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setActiveCaptureType("workplace");
                            startCamera("environment");
                          }}
                          className="w-full text-xs text-blue-600 hover:underline py-1 flex items-center justify-center gap-1"
                        >
                          <RotateCcw size={12} /> Ulangi Lokasi
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Single photo preview for PULANG
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden bg-gray-100 border aspect-[4/3]">
                        <img
                          src={facePhoto!}
                          alt="Foto Pulang"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setActiveCaptureType("face");
                          startCamera("user");
                        }}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Ulangi Foto
                      </button>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {errorMsg}
                  </div>
                )}

                {/* Big Submit Button */}
                <button
                  onClick={submitAttendance}
                  disabled={submitState === "submitting"}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg shadow-lg transition-all"
                >
                  {submitState === "submitting" ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Menyimpan Absensi...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={22} />
                      {attendanceType === "MASUK" ? "KIRIM ABSEN MASUK" : "KIRIM ABSEN PULANG"}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for drawing timestamps and photos */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}