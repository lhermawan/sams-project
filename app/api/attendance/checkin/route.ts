import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { attendanceRateLimiter } from "@/lib/rate-limit";
import { WorkDateResolver } from "@/lib/engine/work-date-resolver";
import { AttendanceRuleEngine } from "@/lib/engine/rule-engine";
import { PeriodicReportGenerator } from "@/lib/engine/periodic-report-generator";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { startOfDay } from "date-fns";

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

    const {
      latitude,
      longitude,
      photo,
      workplacePhoto,
      handoverId,
      isMockLocation,
      notes,
    } = await req.json();

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      include: { employeeType: true },
    });

    if (!employee || !employee.employeeTypeId) {
      return NextResponse.json(
        { error: "Data jenis pegawai Anda belum dikonfigurasi. Hubungi HRD." },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1. Resolve Work Session & Date
    const sessionInfo = await WorkDateResolver.resolveCheckIn(employee.id, now);

    // If an active session already exists and hasn't checked out
    if (!sessionInfo.isNewSession && sessionInfo.activeAttendance) {
      return NextResponse.json(
        {
          error: "Anda sudah melakukan absen masuk dan sesi kerja masih aktif.",
          attendance: sessionInfo.activeAttendance,
        },
        { status: 400 }
      );
    }

    // Check if an attendance record already exists for this workDate
    const existingForWorkDate = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        workDate: sessionInfo.workDate,
      },
    });

    if (existingForWorkDate?.checkInTime) {
      return NextResponse.json(
        { error: "Anda sudah melakukan absen masuk untuk jadwal/shift tanggal kerja ini." },
        { status: 400 }
      );
    }

    // 2. Prepare Context for Rule Engine
    const ruleContext = {
      employeeId: employee.id,
      employeeTypeId: employee.employeeTypeId,
      workDate: sessionInfo.workDate,
      checkInTime: now,
      latitude,
      longitude,
      isMockLocation: !!isMockLocation,
      handoverId: handoverId || null,
      notes: notes || null,
      shift: sessionInfo.shift,
      schedule: sessionInfo.schedule,
    };

    // 3. Execute Stage: PRE_CHECK_IN (Handover verification)
    const preCheckInResult = await AttendanceRuleEngine.executeStage(
      "PRE_CHECK_IN",
      ruleContext
    );

    if (!preCheckInResult.isPassed) {
      return NextResponse.json(
        { error: preCheckInResult.message || "Gagal verifikasi pra-absen." },
        { status: 422 }
      );
    }

    // 4. Execute Stage: CHECK_IN (Location Geofence, Late Tolerance & Max Cutoff)
    const checkInResult = await AttendanceRuleEngine.executeStage(
      "CHECK_IN",
      ruleContext
    );

    if (!checkInResult.isPassed) {
      return NextResponse.json(
        { error: checkInResult.message || "Validasi absen masuk gagal." },
        { status: 422 }
      );
    }

    const details = checkInResult.combinedDetails || {};
    const lateMinutes = details.lateMinutes ?? 0;
    const distanceMeters = details.distance ?? 0;
    const isLate = details.isLate ?? false;

    // 5. Handle Photos Upload
    let photoUrl = photo;
    let workplacePhotoUrl = workplacePhoto || null;

    try {
      const uploadDir = join(process.cwd(), "public", "uploads", "attendance");
      await mkdir(uploadDir, { recursive: true });

      if (photo && typeof photo === "string" && photo.startsWith("data:image")) {
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filename = `checkin_${employee.id}_${Date.now()}.jpg`;
        await writeFile(join(uploadDir, filename), buffer);
        photoUrl = `/uploads/attendance/${filename}`;
      }

      if (
        workplacePhoto &&
        typeof workplacePhoto === "string" &&
        workplacePhoto.startsWith("data:image")
      ) {
        const base64Workplace = workplacePhoto.replace(/^data:image\/\w+;base64,/, "");
        const workplaceBuffer = Buffer.from(base64Workplace, "base64");
        const workplaceFilename = `workplace_${employee.id}_${Date.now()}.jpg`;
        await writeFile(join(uploadDir, workplaceFilename), workplaceBuffer);
        workplacePhotoUrl = `/uploads/attendance/${workplaceFilename}`;
      }
    } catch {
      photoUrl = photo;
      workplacePhotoUrl = workplacePhoto || null;
    }

    const finalStatus = isLate ? "LATE" : "PENDING";
    const statusNote = isLate ? details.warning || `Terlambat ${lateMinutes} menit` : null;

    // 6. Create / Upsert Attendance Record
    const attendance = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        employeeTypeId: employee.employeeTypeId,
        shiftId: sessionInfo.shift?.id || null,
        date: sessionInfo.workDate,
        workDate: sessionInfo.workDate,
        checkInTime: now,
        checkInPhoto: photoUrl,
        workplacePhoto: workplacePhotoUrl,
        checkInLat: latitude,
        checkInLng: longitude,
        checkInDistance: distanceMeters,
        lateMinutes,
        status: finalStatus,
        notes: statusNote,
      },
    });

    // 7. Link Handover to Attendance if provided
    if (handoverId) {
      await prisma.attendanceHandover.update({
        where: { id: handoverId },
        data: { attendanceId: attendance.id },
      }).catch(() => {});
    }

    // 8. Auto-Generate Periodic Patrol Reports if applicable
    const scheduledReportsCount = await PeriodicReportGenerator.generateForAttendance(
      attendance.id
    );

    // 9. Audit Log & Notification
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CHECKIN",
        entity: "Attendance",
        entityId: attendance.id,
        newData: JSON.stringify({
          workDate: sessionInfo.workDate,
          checkInTime: now,
          status: finalStatus,
          lateMinutes,
          shift: sessionInfo.shift?.name || "Non-Shift",
          periodicReportsCreated: scheduledReportsCount,
        }),
        ipAddress: ip,
      },
    });

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: isLate ? "LATE_WARNING" : "ATTENDANCE_SUCCESS",
        title: isLate ? `Terlambat ${lateMinutes} Menit` : "Absen Masuk Berhasil",
        message: isLate
          ? `Absen masuk dicatat pada ${now.toLocaleTimeString("id-ID")} WIB (Terlambat ${lateMinutes} menit).`
          : `Absen masuk berhasil dicatat pada ${now.toLocaleTimeString("id-ID")} WIB. Selamat bertugas!`,
      },
    });

    return NextResponse.json({
      success: true,
      message: isLate
        ? `Absen masuk berhasil dicatat. Anda terlambat ${lateMinutes} menit.`
        : "Absen masuk berhasil dicatat. Selamat bertugas!",
      data: {
        id: attendance.id,
        workDate: attendance.workDate,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
        shiftName: sessionInfo.shift?.name || sessionInfo.schedule?.name || "Jadwal Reguler",
        periodicReportsCount: scheduledReportsCount,
      },
    });
  } catch (err: any) {
    console.error("POST /api/attendance/checkin error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
