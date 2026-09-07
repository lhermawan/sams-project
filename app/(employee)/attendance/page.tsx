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
  FileCheck,
  AlertCircle,
  Plus,
  Trash2,
  Send,
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
  toleranceMin?: number;
  isCrossDay?: boolean;
  is24Hours?: boolean;
}

interface PeriodicReportItem {
  id: string;
  checkpointSequence: number;
  scheduledAt: string;
  toleranceStartAt: string;
  toleranceEndAt: string;
  submittedAt: string | null;
  status: "PENDING" | "SUBMITTED" | "LATE" | "MISSED";
  reportNotes?: string | null;
  photos?: any[];
}

interface TodayStatus {
  employee?: any;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInPhoto?: string | null;
  workplacePhoto?: string | null;
  type: AttendanceType;
  schedule?: ScheduleInfo;
  isWeekendHoliday?: boolean;
  weekendNote?: string;
  department?: string;
  lateMinutes?: number;
  attendance?: any;
  handover?: {
    isRequired: boolean;
    isCompleted: boolean;
    pendingHandoverId?: string | null;
    minPhotos: number;
  };
  periodicReportRule?: {
    hasPeriodicReports: boolean;
    intervalHours: number;
    minPhotos: number;
  };
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
  const [activeCaptureType, setActiveCaptureType] = useState<"face" | "workplace" | "handover" | "patrol">("face");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");

  // Handover state
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState("");
  const [handoverPhotos, setHandoverPhotos] = useState<string[]>([]);
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Periodic Patrol state
  const [selectedPatrol, setSelectedPatrol] = useState<PeriodicReportItem | null>(null);
  const [showPatrolModal, setShowPatrolModal] = useState(false);
  const [patrolNotes, setPatrolNotes] = useState("");
  const [patrolPhotos, setPatrolPhotos] = useState<string[]>([]);
  const [submittingPatrol, setSubmittingPatrol] = useState(false);

  // Incomplete checkout confirmation
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false);

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
    let tag = "FOTO WAJAH";
    if (activeCaptureType === "workplace") tag = "LOKASI KERJA";
    if (activeCaptureType === "handover") tag = "SERAH TERIMA";
    if (activeCaptureType === "patrol") tag = "PATROLI BERKALA";

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

    if (activeCaptureType === "handover") {
      setHandoverPhotos((prev) => [...prev, dataUrl]);
      stopCamera();
    } else if (activeCaptureType === "patrol") {
      setPatrolPhotos((prev) => [...prev, dataUrl]);
      stopCamera();
    } else if (attendanceType === "MASUK") {
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

  // --- Time display ---
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

  // Handover required check
  const requiresHandoverBeforeCheckIn =
    attendanceType === "MASUK" &&
    todayStatus?.handover?.isRequired &&
    !todayStatus?.handover?.isCompleted;

  // Periodic reports list
  const periodicReports: PeriodicReportItem[] =
    todayStatus?.attendance?.periodicReports || [];

  const pendingReportsCount = periodicReports.filter(
    (p) => p.status === "PENDING" || p.status === "MISSED"
  ).length;

  // --- Handover Submit ---
  const submitHandover = async () => {
    if (!handoverNotes || handoverNotes.trim().length < 5) {
      setErrorMsg("Catatan serah terima wajib diisi minimal 5 karakter.");
      return;
    }
    const minP = todayStatus?.handover?.minPhotos || 1;
    if (handoverPhotos.length < minP) {
      setErrorMsg(`Wajib melampirkan minimal ${minP} foto bukti serah terima.`);
      return;
    }

    try {
      setSubmittingHandover(true);
      setErrorMsg("");
      const res = await fetch("/api/attendance/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: handoverNotes,
          photos: handoverPhotos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan serah terima");

      setShowHandoverModal(false);
      setHandoverNotes("");
      setHandoverPhotos([]);
      fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingHandover(false);
    }
  };

  // --- Periodic Patrol Submit ---
  const submitPatrolReport = async () => {
    if (!selectedPatrol) return;
    const minP = todayStatus?.periodicReportRule?.minPhotos || 3;
    if (patrolPhotos.length < minP) {
      setErrorMsg(`Wajib melampirkan minimal ${minP} foto bukti patroli pos/titik jaga.`);
      return;
    }

    try {
      setSubmittingPatrol(true);
      setErrorMsg("");
      const res = await fetch(`/api/reports/periodic/${selectedPatrol.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: userLat,
          longitude: userLng,
          notes: patrolNotes,
          photos: patrolPhotos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirimkan laporan patroli");

      setShowPatrolModal(false);
      setPatrolNotes("");
      setPatrolPhotos([]);
      setSelectedPatrol(null);
      fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingPatrol(false);
    }
  };

  // --- Submit Attendance (Check-In or Check-Out) ---
  const submitAttendance = async () => {
    // If checking out and has incomplete reports, prompt confirmation
    if (attendanceType === "PULANG" && pendingReportsCount > 0 && !showIncompleteConfirm) {
      setShowIncompleteConfirm(true);
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
    setShowIncompleteConfirm(false);

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
          handoverId: todayStatus?.handover?.pendingHandoverId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menyimpan absensi");
      }

      setSuccessNote(
        data.message ||
          (type === "MASUK"
            ? "Absen Masuk Berhasil!"
            : "Absen Pulang Berhasil!")
      );

      setSubmitState("success");
      fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message);
      setSubmitState("error");
    }
  };

  const hasBothPhotos =
    attendanceType === "MASUK" ? !!(facePhoto && workplacePhoto) : !!facePhoto;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 pt-6 pb-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-blue-100 hover:text-white font-medium"
          >
            <ChevronLeft size={16} />
            Dashboard
          </Link>
          <span className="text-xs bg-blue-500/80 px-2.5 py-1 rounded-full font-mono font-medium">
            {todayStatus?.employee?.employeeType?.name || "Pegawai"}
          </span>
        </div>

        <div className="text-center">
          <div className="text-3xl font-black font-mono tracking-tight">{timeStr}</div>
          <div className="text-xs text-blue-100 mt-1">{dateStr}</div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-4">
        {/* Schedule Card */}
        {schedule && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase">Jadwal Tugas</span>
                <div className="font-bold text-gray-900 text-sm">{schedule.name}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 font-semibold uppercase">Jam Shift</span>
                <div className="font-mono font-bold text-blue-600 text-sm">
                  {schedule.startTime} - {schedule.endTime} WIB
                </div>
              </div>
            </div>
            {schedule.isCrossDay && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full font-medium">
                <Clock size={12} /> Shift Lintas Hari
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Handover Required Card (If active and not completed) */}
        {requiresHandoverBeforeCheckIn && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <FileCheck className="text-amber-600 flex-shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="font-bold text-amber-900 text-sm">Wajib Serah Terima Tugas</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Sesuai aturan kerja jenis pegawai Anda, Anda wajib menyelesaikan pencatatan Serah Terima Tugas dan foto bukti sebelum dapat melakukan absen masuk.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowHandoverModal(true);
                setErrorMsg("");
              }}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <FileCheck size={16} /> Isi Form Serah Terima Sekarang
            </button>
          </div>
        )}

        {/* PERIODIC PATROL REPORTS TIMELINE (When In Shift / PULANG mode) */}
        {attendanceType === "PULANG" && periodicReports.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Clock className="text-purple-600" size={18} />
                Laporan Patroli Berkala
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                {periodicReports.filter((p) => p.status === "SUBMITTED").length} / {periodicReports.length} Selesai
              </span>
            </div>

            <div className="space-y-2">
              {periodicReports.map((report) => {
                const isPending = report.status === "PENDING";
                const isSubmitted = report.status === "SUBMITTED";
                const isLate = report.status === "LATE";
                const schedTime = new Date(report.scheduledAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jakarta",
                });

                return (
                  <div
                    key={report.id}
                    className={cn(
                      "p-3 rounded-xl border flex items-center justify-between text-xs transition-all",
                      isSubmitted
                        ? "bg-green-50 border-green-200 text-green-900"
                        : isLate
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-gray-50 border-gray-200 text-gray-700"
                    )}
                  >
                    <div>
                      <div className="font-bold">Checkpoint ke-{report.checkpointSequence}</div>
                      <div className="text-[11px] opacity-75">Jadwal: {schedTime} WIB</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSubmitted ? (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                          <Check size={12} /> Selesai
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedPatrol(report);
                            setShowPatrolModal(true);
                            setPatrolPhotos([]);
                            setPatrolNotes("");
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1"
                        >
                          <Camera size={12} /> Lapor Patroli
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MAIN ATTENDANCE CARD */}
        {isAlreadyDone ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center space-y-3">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h3 className="font-bold text-gray-900 text-lg">Absensi Hari Ini Selesai</h3>
            <p className="text-xs text-gray-500">
              Anda telah menyelesaikan absen masuk dan absen pulang untuk jadwal kerja ini.
            </p>
          </div>
        ) : submitState === "success" ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center space-y-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h3 className="font-bold text-gray-900 text-lg">{successNote}</h3>
            <button
              onClick={() => {
                setSubmitState("idle");
                setFacePhoto(null);
                setWorkplacePhoto(null);
                fetchStatus();
              }}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium"
            >
              Kembali ke Menu
            </button>
          </div>
        ) : (
          <>
            {/* GPS Status Card */}
            <div
              className={cn(
                "rounded-2xl p-4 border transition-all text-xs",
                locationState === "valid"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : locationState === "invalid"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              )}
            >
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span className="font-semibold">
                  {locationState === "valid"
                    ? "Lokasi Dalam Radius Kantor"
                    : locationState === "invalid"
                    ? "Di Luar Radius Kantor"
                    : "Memeriksa GPS..."}
                </span>
              </div>
              {distance !== null && (
                <div className="mt-1 text-[11px] opacity-80">
                  Jarak: {distance} meter dari titik kantor (Radius toleransi: {office?.radius || 100}m)
                </div>
              )}
            </div>

            {/* If Handover is NOT completed and required, disable check-in camera */}
            {requiresHandoverBeforeCheckIn ? (
              <div className="bg-gray-100 rounded-2xl p-6 border border-gray-200 text-center space-y-2">
                <Lock className="text-gray-400 mx-auto" size={32} />
                <div className="font-bold text-gray-700 text-sm">Tombol Absen Masuk Terkunci</div>
                <div className="text-xs text-gray-500">
                  Selesaikan Serah Terima Tugas di atas terlebih dahulu untuk membuka akses absen masuk.
                </div>
              </div>
            ) : (
              /* CAMERA & PHOTO VERIFICATION */
              <>
                {/* Camera Viewfinder */}
                {showCamera && (
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-[11px] text-center py-1 rounded">
                        Posisikan kamera dengan jelas
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={capturePhoto}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                      >
                        <Camera size={18} /> Ambil Foto
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-4 bg-gray-100 text-gray-700 font-medium rounded-xl text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {/* Launch Camera Button */}
                {!showCamera && !hasBothPhotos && (
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
                    className="w-full border-2 border-dashed border-blue-300 rounded-2xl py-8 text-blue-600 flex flex-col items-center gap-2 hover:bg-blue-50 bg-white"
                  >
                    <Camera size={36} className="text-blue-600" />
                    <span className="font-bold text-sm">
                      {attendanceType === "MASUK"
                        ? facePhoto
                          ? "Lanjut Foto Langkah 2: Lokasi Kerja"
                          : "Buka Kamera untuk Absen Datang"
                        : "Buka Kamera untuk Absen Pulang"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {attendanceType === "MASUK"
                        ? "Wajib 2 foto: Muka dan Lokasi Pos/Kantor"
                        : "Selfie foto kepulangan"}
                    </span>
                  </button>
                )}

                {/* Photos Preview & Submit */}
                {!showCamera && hasBothPhotos && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
                      <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-green-500" />
                        Foto Siap Dikirim
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {facePhoto && (
                          <div className="relative rounded-xl overflow-hidden aspect-[4/3] border">
                            <img src={facePhoto} alt="Muka" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {workplacePhoto && (
                          <div className="relative rounded-xl overflow-hidden aspect-[4/3] border">
                            <img src={workplacePhoto} alt="Lokasi" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
                        {errorMsg}
                      </div>
                    )}

                    <button
                      onClick={submitAttendance}
                      disabled={submitState === "submitting"}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-base shadow-sm"
                    >
                      {submitState === "submitting" ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          {attendanceType === "MASUK" ? "KIRIM ABSEN MASUK" : "KIRIM ABSEN PULANG"}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* MODAL: HANDOVER SUBMISSION */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <FileCheck className="text-blue-600" size={20} />
              Form Serah Terima Tugas (Handover)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Catatan Kondisi & Inventaris Tugas
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Kunci brankas lengkap, 2 unit HT menyala normal, pos timur aman dan kondusif..."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Foto Bukti Serah Terima (Min {todayStatus?.handover?.minPhotos || 1} Foto)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {handoverPhotos.map((p, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden aspect-square border">
                      <img src={p} alt="Handover" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCaptureType("handover");
                      startCamera("environment");
                    }}
                    className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 aspect-square"
                  >
                    <Camera size={18} />
                    <span className="text-[10px] mt-1">+ Ambil Foto</span>
                  </button>
                </div>
              </div>

              {errorMsg && <div className="text-red-600">{errorMsg}</div>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowHandoverModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitHandover}
                disabled={submittingHandover}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
              >
                {submittingHandover ? "Menyimpan..." : "Kirim Serah Terima"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERIODIC PATROL SUBMISSION */}
      {showPatrolModal && selectedPatrol && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Camera className="text-purple-600" size={20} />
              Laporan Patroli Checkpoint ke-{selectedPatrol.checkpointSequence}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Catatan Pantauan Lingkungan / Pos
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Pintu gerbang terkunci rapat, perimeter pagar aman, genset beroperasi normal..."
                  value={patrolNotes}
                  onChange={(e) => setPatrolNotes(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Foto Bukti Patroli (Min {todayStatus?.periodicReportRule?.minPhotos || 3} Foto)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {patrolPhotos.map((p, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden aspect-square border">
                      <img src={p} alt="Patrol" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCaptureType("patrol");
                      startCamera("environment");
                    }}
                    className="border-2 border-dashed border-purple-300 rounded-lg flex flex-col items-center justify-center text-purple-600 hover:bg-purple-50 aspect-square"
                  >
                    <Camera size={18} />
                    <span className="text-[10px] mt-1">+ Ambil Foto</span>
                  </button>
                </div>
                <div className="text-[11px] text-gray-500">
                  Foto terkumpul: {patrolPhotos.length} / {todayStatus?.periodicReportRule?.minPhotos || 3}
                </div>
              </div>

              {errorMsg && <div className="text-red-600">{errorMsg}</div>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPatrolModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitPatrolReport}
                disabled={submittingPatrol}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold"
              >
                {submittingPatrol ? "Mengirimkan..." : "Kirim Laporan Patroli"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INCOMPLETE CHECKOUT CONFIRMATION */}
      {showIncompleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl text-center">
            <AlertCircle size={40} className="text-amber-500 mx-auto" />
            <h3 className="font-bold text-gray-900 text-base">Laporan Patroli Belum Lengkap</h3>
            <p className="text-xs text-gray-600">
              Masih terdapat {pendingReportsCount} laporan checkpoint patroli yang belum Anda selesaikan. Sesuai kebijakan sistem, absen pulang akan tetap diproses namun status kehadiran Anda akan ditandai sebagai <strong className="text-amber-700">INCOMPLETE (Tidak Lengkap)</strong>.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowIncompleteConfirm(false)}
                className="px-4 py-2 border rounded-xl text-xs font-medium hover:bg-gray-50"
              >
                Kembali Lapor Patroli
              </button>
              <button
                onClick={submitAttendance}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
              >
                Ya, Lanjutkan Pulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for drawing timestamp overlays */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
