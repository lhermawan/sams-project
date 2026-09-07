import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { attendanceRateLimiter } from "@/lib/rate-limit";
import { isWithinRadius } from "@/lib/geolocation";
import { calcLateMinutes } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { startOfDay, endOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!attendanceRateLimiter.check(ip)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam 1 menit." }, { status: 429 });
    }

    const session = await auth();
    if (!session || !session.user.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { latitude, longitude, distance, photo, workplacePhoto } = await req.json();

    // ── Server-side GPS calculation ──────────────────────────────────────
    const office = await prisma.officeLocation.findFirst({
      where: { isActive: true },
    });

    let calculatedDistance = distance ?? 0;
    let isInside = true;

    if (office && latitude && longitude) {
      const validation = isWithinRadius(latitude, longitude, office.latitude, office.longitude, office.radius);
      calculatedDistance = validation.distance;
      isInside = validation.valid;
    }

    // ── Check if already checked in today ─────────────────────────────────
    const today = new Date();
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: session.user.employeeId,
        date: { gte: startOfDay(today), lte: endOfDay(today) },
      },
    });

    if (existing?.checkInTime) {
      return NextResponse.json({ error: "Sudah melakukan absen masuk hari ini" }, { status: 400 });
    }

    // ── Save photos (Serverless compatible: store directly or write if possible) ──
    let photoUrl = photo;
    let workplacePhotoUrl = workplacePhoto || null;

    try {
      const uploadDir = join(process.cwd(), "public", "uploads", "attendance");
      await mkdir(uploadDir, { recursive: true });

      if (photo && photo.startsWith("data:image")) {
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filename = `checkin_${session.user.employeeId}_${Date.now()}.jpg`;
        await writeFile(join(uploadDir, filename), buffer);
        photoUrl = `/uploads/attendance/${filename}`;
      }

      if (workplacePhoto && workplacePhoto.startsWith("data:image")) {
        const base64Workplace = workplacePhoto.replace(/^data:image\/\w+;base64,/, "");
        const workplaceBuffer = Buffer.from(base64Workplace, "base64");
        const workplaceFilename = `workplace_${session.user.employeeId}_${Date.now()}.jpg`;
        await writeFile(join(uploadDir, workplaceFilename), workplaceBuffer);
        workplacePhotoUrl = `/uploads/attendance/${workplaceFilename}`;
      }
    } catch {
      // In serverless environment (Vercel read-only filesystem), store data URI directly
      photoUrl = photo;
      workplacePhotoUrl = workplacePhoto || null;
    }

    // ── Get active schedule for late calculation ───────────────────────────
    const schedule = await prisma.workSchedule.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: "desc" },
    });

    // Get active shift for this employee
    const employeeShift = await prisma.employeeShift.findFirst({
      where: { employeeId: session.user.employeeId, isActive: true },
      include: { shift: true },
      orderBy: { effectiveFrom: "desc" },
    });

    const checkInNow = new Date();
    const scheduleStart = employeeShift?.shift.startTime ?? schedule?.startTime ?? "08:00";
    const toleranceMin = employeeShift?.shift.toleranceMin ?? schedule?.toleranceMin ?? 15;

    // Calculate late minutes (Never block checkin, but record lateness accurately)
    const lateMinutes = calcLateMinutes(checkInNow, scheduleStart, toleranceMin);
    // Initial status requires Admin validation: LATE if past tolerance, PENDING if on-time
    const status = lateMinutes > 0 ? "LATE" : "PENDING";
    const checkinNotes = lateMinutes > 0 ? `Terlambat ${lateMinutes} menit (Jadwal: ${scheduleStart} WIB)` : null;

    // ── Upsert attendance record ───────────────────────────────────────────
    const attendance = await prisma.attendance.upsert({
      where: existing
        ? { id: existing.id }
        : { employeeId_date: { employeeId: session.user.employeeId, date: startOfDay(today) } },
      update: {
        checkInTime: checkInNow,
        checkInPhoto: photoUrl,
        workplacePhoto: workplacePhotoUrl,
        checkInLat: latitude,
        checkInLng: longitude,
        checkInDistance: calculatedDistance,
        lateMinutes,
        status,
        notes: checkinNotes,
        shiftId: employeeShift?.shiftId ?? null,
      },
      create: {
        employeeId: session.user.employeeId,
        date: startOfDay(today),
        checkInTime: checkInNow,
        checkInPhoto: photoUrl,
        workplacePhoto: workplacePhotoUrl,
        checkInLat: latitude,
        checkInLng: longitude,
        checkInDistance: calculatedDistance,
        lateMinutes,
        status,
        notes: checkinNotes,
        shiftId: employeeShift?.shiftId ?? null,
      },
    });

    // ── Audit log ──────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CHECKIN",
        entity: "Attendance",
        entityId: attendance.id,
        newData: JSON.stringify({
          checkInTime: checkInNow,
          distance: calculatedDistance,
          status,
          lateMinutes,
          hasWorkplacePhoto: !!workplacePhotoUrl,
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    // ── Notification ───────────────────────────────────────────────────────
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: lateMinutes > 0 ? "LATE_WARNING" : "ATTENDANCE_SUCCESS",
        title: lateMinutes > 0 ? `Terlambat ${lateMinutes} Menit` : "Absen Masuk Berhasil",
        message: lateMinutes > 0
          ? `Anda terlambat ${lateMinutes} menit dari jadwal masuk (${scheduleStart} WIB). Absen masuk berhasil dicatat.`
          : `Absen masuk berhasil dicatat pada ${checkInNow.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
      },
    });

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance.id,
        checkInTime: checkInNow,
        status,
        lateMinutes,
        checkInPhoto: photoUrl,
        workplacePhoto: workplacePhotoUrl,
      },
      lateMinutes,
      isLate: lateMinutes > 0,
      warningMessage: lateMinutes > 0
        ? `Anda terlambat ${lateMinutes} menit (Jadwal: ${scheduleStart} WIB). Absensi tetap dicatat.`
        : undefined,
    });
  } catch (err) {
    console.error("POST /api/attendance/checkin:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
