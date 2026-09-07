import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { attendanceRateLimiter } from "@/lib/rate-limit";
import { WorkDateResolver } from "@/lib/engine/work-date-resolver";
import { AttendanceRuleEngine } from "@/lib/engine/rule-engine";
import { isWithinRadius } from "@/lib/geolocation";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { addDays } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!attendanceRateLimiter.check(ip)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi dalam 1 menit." },
        { status: 429 }
      );
    }

    const session = await auth();
    if (!session || !session.user.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { latitude, longitude, photo, notes } = await req.json();

    // 1. Resolve Active Attendance Session
    let attendance: any;
    try {
      attendance = await WorkDateResolver.resolveCheckOut(session.user.employeeId);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (attendance.checkOutTime) {
      return NextResponse.json(
        { error: "Sesi absensi ini sudah melakukan absen pulang sebelumnya." },
        { status: 400 }
      );
    }

    const now = new Date();
    const employeeTypeId =
      attendance.employeeTypeId || attendance.employee?.employeeTypeId;

    // 2. Execute Stage: PRE_CHECK_OUT (Evaluate Periodic Patrol Reports)
    const ruleContext = {
      attendanceId: attendance.id,
      employeeId: session.user.employeeId,
      employeeTypeId,
      workDate: attendance.workDate || attendance.date,
      checkOutTime: now,
      latitude,
      longitude,
      shift: attendance.shift,
    };

    const preCheckOutResult = await AttendanceRuleEngine.executeStage(
      "PRE_CHECK_OUT",
      ruleContext
    );

    if (!preCheckOutResult.isPassed) {
      return NextResponse.json(
        { error: preCheckOutResult.message || "Validasi absen pulang gagal." },
        { status: 422 }
      );
    }

    const preCheckOutDetails = preCheckOutResult.combinedDetails || {};
    const shouldMarkIncomplete = !!preCheckOutDetails.markIncomplete;

    // 3. Calculate Distance & Early Out
    let calculatedDistance = 0;
    const office = await prisma.officeLocation.findFirst({ where: { isActive: true } });
    if (office && latitude && longitude) {
      const val = isWithinRadius(latitude, longitude, office.latitude, office.longitude, office.radius);
      calculatedDistance = val.distance;
    }

    let earlyOutMinutes = 0;
    const endTimeStr = attendance.shift?.endTime || "17:00";
    const [endH, endM] = endTimeStr.split(":").map(Number);

    let scheduledEnd = new Date(attendance.workDate || attendance.date);
    scheduledEnd.setHours(endH, endM, 0, 0);

    // If shift is cross-day or 24 hours, end time is on next day
    if (attendance.shift?.isCrossDay || attendance.shift?.is24Hours) {
      scheduledEnd = addDays(scheduledEnd, 1);
    }

    if (now < scheduledEnd) {
      earlyOutMinutes = Math.max(0, Math.round((scheduledEnd.getTime() - now.getTime()) / 60000));
    }

    // 4. Save Checkout Photo
    let photoUrl = photo;
    try {
      if (photo && typeof photo === "string" && photo.startsWith("data:image")) {
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

    // 5. Determine Final Attendance Status
    let finalStatus = attendance.status;
    let appendedNotes: string[] = [];
    if (attendance.notes) appendedNotes.push(attendance.notes);

    if (shouldMarkIncomplete) {
      finalStatus = "INCOMPLETE";
      appendedNotes.push(
        preCheckOutDetails.reason ||
          "Check-out disetujui namun patroli berkala belum lengkap (INCOMPLETE)."
      );
    } else if (finalStatus === "PENDING") {
      finalStatus = "VALID";
    }

    if (earlyOutMinutes > 0) {
      appendedNotes.push(`Pulang lebih awal ${earlyOutMinutes} menit (Jadwal pulang: ${endTimeStr} WIB).`);
    }

    if (notes) {
      appendedNotes.push(`Catatan pulang: ${notes}`);
    }

    // 6. Update Attendance Record
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: now,
        checkOutPhoto: photoUrl,
        checkOutLat: latitude,
        checkOutLng: longitude,
        checkOutDistance: calculatedDistance,
        earlyOutMinutes,
        status: finalStatus,
        notes: appendedNotes.join(" | "),
      },
    });

    // 7. Audit Log & Notification
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CHECKOUT",
        entity: "Attendance",
        entityId: updated.id,
        newData: JSON.stringify({
          checkOutTime: now,
          status: finalStatus,
          earlyOutMinutes,
          incompleteReportsFlagged: shouldMarkIncomplete,
        }),
        ipAddress: ip,
      },
    });

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: shouldMarkIncomplete ? "LATE_WARNING" : "ATTENDANCE_SUCCESS",
        title: shouldMarkIncomplete ? "Absen Pulang (Laporan Tidak Lengkap)" : "Absen Pulang Berhasil",
        message: shouldMarkIncomplete
          ? `Absen pulang dicatat pada ${now.toLocaleTimeString("id-ID")} WIB dengan catatan laporan patroli belum lengkap.`
          : `Absen pulang berhasil dicatat pada ${now.toLocaleTimeString("id-ID")} WIB. Terima kasih atas kerja keras Anda!`,
      },
    });

    return NextResponse.json({
      success: true,
      message: shouldMarkIncomplete
        ? "Absen pulang berhasil dicatat. Status kehadiran: Tidak Lengkap (INCOMPLETE)."
        : "Absen pulang berhasil dicatat. Terima kasih atas tugas Anda!",
      data: {
        id: updated.id,
        checkOutTime: updated.checkOutTime,
        status: updated.status,
        earlyOutMinutes,
        notes: updated.notes,
      },
    });
  } catch (err: any) {
    console.error("POST /api/attendance/checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
