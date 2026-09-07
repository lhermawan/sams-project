import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ScheduleResolver } from "@/lib/engine/schedule-resolver";
import { formatTime } from "@/lib/utils";
import { startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      include: {
        employeeType: {
          include: {
            rules: { where: { isActive: true } },
          },
        },
      },
    });

    if (!employee || !employee.employeeType) {
      return NextResponse.json(
        { error: "Data pegawai atau jenis pegawai belum lengkap." },
        { status: 400 }
      );
    }

    // 1. Resolve Active Schedule
    const resolvedSchedule = await ScheduleResolver.resolveForEmployee(
      employee.id,
      new Date()
    );

    // 2. Find Active Attendance (checkOutTime is null) or Today's Attendance
    const today = startOfDay(new Date());

    let attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        checkOutTime: null,
      },
      include: {
        shift: true,
        handover: { include: { photos: true } },
        periodicReports: {
          include: { photos: true },
          orderBy: { checkpointSequence: "asc" },
        },
      },
      orderBy: { checkInTime: "desc" },
    });

    if (!attendance) {
      attendance = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          workDate: today,
        },
        include: {
          shift: true,
          handover: { include: { photos: true } },
          periodicReports: {
            include: { photos: true },
            orderBy: { checkpointSequence: "asc" },
          },
        },
        orderBy: { checkInTime: "desc" },
      });
    }

    // 3. Check Handover Requirement
    const handoverRule = employee.employeeType.rules.find((r) => r.ruleType === "HANDOVER");
    let requiresHandover = false;
    let handoverConfig: any = {};
    if (handoverRule) {
      try {
        handoverConfig = JSON.parse(handoverRule.configuration);
        requiresHandover = handoverConfig.requireHandover ?? true;
      } catch {
        requiresHandover = true;
      }
    }

    // Check if employee has a completed handover waiting to be linked to checkin
    let pendingHandover = null;
    if (requiresHandover && !attendance?.checkInTime) {
      pendingHandover = await prisma.attendanceHandover.findFirst({
        where: {
          employeeId: employee.id,
          attendanceId: null,
          status: "COMPLETED",
        },
        include: { photos: true },
        orderBy: { createdAt: "desc" },
      });
    }

    // 4. Check Periodic Report Rule Config
    const reportRule = employee.employeeType.rules.find((r) => r.ruleType === "PERIODIC_REPORT");
    let periodicReportConfig: any = {};
    if (reportRule) {
      try {
        periodicReportConfig = JSON.parse(reportRule.configuration);
      } catch {
        periodicReportConfig = {};
      }
    }

    // 5. Build Response
    const checkInTimeFormatted = attendance?.checkInTime
      ? formatTime(attendance.checkInTime)
      : null;

    const checkOutTimeFormatted = attendance?.checkOutTime
      ? formatTime(attendance.checkOutTime)
      : null;

    const type = attendance?.checkInTime && !attendance?.checkOutTime ? "PULANG" : "MASUK";

    return NextResponse.json(
      {
        success: true,
        employee: {
          id: employee.id,
          name: employee.name,
          nip: employee.nip,
          department: employee.department,
          position: employee.position,
          employeeType: {
            id: employee.employeeType.id,
            code: employee.employeeType.code,
            name: employee.employeeType.name,
            scheduleType: employee.employeeType.scheduleType,
          },
        },
        schedule: {
          name: resolvedSchedule.scheduleName || "Jadwal Kerja",
          startTime: resolvedSchedule.startTime || "08:00",
          endTime: resolvedSchedule.endTime || "17:00",
          isWorkDay: resolvedSchedule.isWorkDay,
          isHoliday: resolvedSchedule.isHoliday,
          holidayName: resolvedSchedule.holidayName,
          isDayOff: resolvedSchedule.isDayOff,
          isCrossDay: resolvedSchedule.isCrossDay || false,
          is24Hours: resolvedSchedule.is24Hours || false,
        },
        attendance: attendance
          ? {
              id: attendance.id,
              workDate: attendance.workDate,
              checkInTime: checkInTimeFormatted,
              checkOutTime: checkOutTimeFormatted,
              rawCheckInTime: attendance.checkInTime,
              rawCheckOutTime: attendance.checkOutTime,
              checkInPhoto: attendance.checkInPhoto,
              workplacePhoto: attendance.workplacePhoto,
              checkOutPhoto: attendance.checkOutPhoto,
              status: attendance.status,
              lateMinutes: attendance.lateMinutes,
              earlyOutMinutes: attendance.earlyOutMinutes,
              notes: attendance.notes,
              periodicReports: attendance.periodicReports || [],
            }
          : null,
        handover: {
          isRequired: requiresHandover,
          isCompleted: !!attendance?.handover || !!pendingHandover,
          pendingHandoverId: pendingHandover?.id || null,
          minPhotos: handoverConfig.minPhotos ?? 1,
        },
        periodicReportRule: {
          hasPeriodicReports: !!reportRule,
          intervalHours: periodicReportConfig.intervalHours ?? 4,
          minPhotos: periodicReportConfig.minPhotos ?? 3,
        },
        type,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (err: any) {
    console.error("GET /api/attendance/today error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
