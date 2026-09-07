import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { attendanceRateLimiter } from "@/lib/rate-limit";
import { isWithinRadius } from "@/lib/geolocation";
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

    const { latitude, longitude, photo } = await req.json();

    // ── Server-side GPS calculation ─────────────────────────────────────────
    const office = await prisma.officeLocation.findFirst({ where: { isActive: true } });
    let calculatedDistance = 0;
    if (office && latitude && longitude) {
      const validation = isWithinRadius(latitude, longitude, office.latitude, office.longitude, office.radius);
      calculatedDistance = validation.distance;
    }

    // ── Find today's check-in record ───────────────────────────────────────
    const today = new Date();
    let attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: session.user.employeeId,
        date: { gte: startOfDay(today), lte: endOfDay(today) },
      },
    });

    const checkOutNow = new Date();

    // If no check-in yet, auto-create one for presentation demo convenience
    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          employeeId: session.user.employeeId,
          date: startOfDay(today),
          checkInTime: checkOutNow,
          checkInLat: latitude,
          checkInLng: longitude,
          checkInDistance: calculatedDistance,
          status: "VALID",
        },
      });
    }

    if (attendance.checkOutTime) {
      return NextResponse.json({ error: "Sudah melakukan absen pulang hari ini" }, { status: 400 });
    }

    // ── Save photo (Serverless compatible: store directly or write if possible) ──
    let photoUrl = photo;
    try {
      if (photo && photo.startsWith("data:image")) {
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filename = `checkout_${session.user.employeeId}_${Date.now()}.jpg`;
        const uploadDir = join(process.cwd(), "public", "uploads", "attendance");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(join(uploadDir, filename), buffer);
        photoUrl = `/uploads/attendance/${filename}`;
      }
    } catch {
      photoUrl = photo;
    }

    // ── Check shift & early out minutes (Allowed for presentation) ────────
    const employeeShift = await prisma.employeeShift.findFirst({
      where: { employeeId: session.user.employeeId, isActive: true },
      include: { shift: true },
      orderBy: { effectiveFrom: "desc" },
    });
    const schedule = await prisma.workSchedule.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: "desc" },
    });
    const scheduleEnd = employeeShift?.shift.endTime ?? schedule?.endTime ?? "17:00";
    const [endH, endM] = scheduleEnd.split(":").map(Number);
    const shiftEnd = new Date(checkOutNow);
    shiftEnd.setHours(endH, endM, 0, 0);

    const earlyOutMinutes =
      checkOutNow < shiftEnd
        ? Math.max(0, Math.round((shiftEnd.getTime() - checkOutNow.getTime()) / 60000))
        : 0;

    // ── Update record ──────────────────────────────────────────────────────
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: checkOutNow,
        checkOutPhoto: photoUrl,
        checkOutLat: latitude,
        checkOutLng: longitude,
        checkOutDistance: calculatedDistance,
        earlyOutMinutes,
        // Preserve status (PENDING or LATE) so Admin can validate it
        status: attendance.status,
      },
    });

    // ── Audit log ──────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CHECKOUT",
        entity: "Attendance",
        entityId: attendance.id,
        newData: JSON.stringify({ checkOutTime: checkOutNow, distance: calculatedDistance, earlyOutMinutes }),
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "ATTENDANCE_SUCCESS",
        title: "Absen Pulang Berhasil",
        message: `Absen pulang tercatat pada ${checkOutNow.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
      },
    });

    return NextResponse.json({
      success: true,
      attendance: { id: updated.id, checkOutTime: checkOutNow, status: updated.status },
    });
  } catch (err) {
    console.error("POST /api/attendance/checkout:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
