import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const [attendance, employee, settingsList] = await Promise.all([
      prisma.attendance.findFirst({
        where: {
          employeeId: session.user.employeeId,
          date: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
        },
      }),
      prisma.employee.findUnique({
        where: { id: session.user.employeeId },
        select: { id: true, name: true, department: true },
      }),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              "late_tolerance_min",
              "saturday_work_mode",
              "sunday_work_mode",
              "weekend_working_departments",
            ],
          },
        },
      }),
    ]);

    const settingsMap: Record<string, string> = {};
    for (const s of settingsList) settingsMap[s.key] = s.value;

    // ── Check Saturday / Sunday conditions ────────────────────────────────
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const empDept = (employee?.department || "").trim().toLowerCase();

    const satMode = settingsMap["saturday_work_mode"] || "LIBUR_SEMUA";
    const sunMode = settingsMap["sunday_work_mode"] || "LIBUR_SEMUA";
    const weekendDepts = (settingsMap["weekend_working_departments"] || "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    let isWeekendHoliday = false;
    let weekendNote = "";

    if (dayOfWeek === 6) {
      // Saturday
      if (satMode === "LIBUR_SEMUA") {
        isWeekendHoliday = true;
        weekendNote = "Hari ini Sabtu (Jadwal Libur Umum). Absensi tetap diizinkan untuk dinas/piket.";
      } else if (satMode === "BAGIAN_TERTENTU") {
        const isDeptWorking = weekendDepts.some((d) => empDept.includes(d) || d.includes(empDept));
        if (!isDeptWorking) {
          isWeekendHoliday = true;
          weekendNote = `Hari ini Sabtu (Jadwal Libur Bagian ${employee?.department || "Anda"}). Absensi tetap diizinkan untuk piket/lembur.`;
        }
      }
    } else if (dayOfWeek === 0) {
      // Sunday
      if (sunMode === "LIBUR_SEMUA") {
        isWeekendHoliday = true;
        weekendNote = "Hari ini Minggu (Jadwal Libur Umum). Absensi tetap diizinkan untuk dinas/piket.";
      } else if (sunMode === "BAGIAN_TERTENTU") {
        const isDeptWorking = weekendDepts.some((d) => empDept.includes(d) || d.includes(empDept));
        if (!isDeptWorking) {
          isWeekendHoliday = true;
          weekendNote = `Hari ini Minggu (Jadwal Libur Bagian ${employee?.department || "Anda"}). Absensi tetap diizinkan untuk piket/lembur.`;
        }
      }
    }

    // ── Get active shift or schedule ──────────────────────────────────────
    const employeeShift = await prisma.employeeShift.findFirst({
      where: { employeeId: session.user.employeeId, isActive: true },
      include: { shift: true },
      orderBy: { effectiveFrom: "desc" },
    });

    const workSchedule = await prisma.workSchedule.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: "desc" },
    });

    const parsedTolerance = parseInt(settingsMap["late_tolerance_min"] || "15") || 15;

    const scheduleData = {
      name: employeeShift?.shift.name ?? workSchedule?.name ?? "Jadwal Normal",
      startTime: employeeShift?.shift.startTime ?? workSchedule?.startTime ?? "08:00",
      endTime: employeeShift?.shift.endTime ?? workSchedule?.endTime ?? "17:00",
      toleranceMin: employeeShift?.shift.toleranceMin ?? workSchedule?.toleranceMin ?? parsedTolerance,
      isCrossDay: employeeShift?.shift.isCrossDay ?? false,
    };

    if (!attendance) {
      return NextResponse.json({
        checkInTime: null,
        checkOutTime: null,
        checkInPhoto: null,
        workplacePhoto: null,
        type: "MASUK",
        schedule: scheduleData,
        isWeekendHoliday,
        weekendNote,
        department: employee?.department || "",
      }, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    const checkInTime = attendance.checkInTime
      ? new Date(attendance.checkInTime).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        })
      : null;

    const checkOutTime = attendance.checkOutTime
      ? new Date(attendance.checkOutTime).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        })
      : null;

    return NextResponse.json({
      id: attendance.id,
      checkInTime,
      checkOutTime,
      checkInPhoto: attendance.checkInPhoto,
      workplacePhoto: attendance.workplacePhoto,
      status: attendance.status,
      lateMinutes: attendance.lateMinutes,
      type: attendance.checkInTime && !attendance.checkOutTime ? "PULANG" : "MASUK",
      schedule: scheduleData,
      isWeekendHoliday,
      weekendNote,
      department: employee?.department || "",
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("GET /api/attendance/today:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
