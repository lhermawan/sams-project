import { prisma } from "@/lib/db";
import { addHours, subMinutes, addMinutes } from "date-fns";

export class PeriodicReportGenerator {
  /**
   * Automatically generate scheduled checkpoints for an attendance session.
   */
  public static async generateForAttendance(attendanceId: string): Promise<number> {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        shift: true,
        employee: {
          include: {
            employeeType: {
              include: {
                rules: { where: { ruleType: "PERIODIC_REPORT", isActive: true } },
              },
            },
          },
        },
      },
    });

    if (!attendance || !attendance.employee?.employeeType) {
      return 0;
    }

    // Check if reports are already generated for this attendance session
    const existing = await prisma.periodicReport.count({
      where: { attendanceId: attendance.id },
    });
    if (existing > 0) {
      return 0;
    }

    const rule = attendance.employee.employeeType.rules[0];
    if (!rule) {
      return 0;
    }

    let config: any = {};
    try {
      config = JSON.parse(rule.configuration);
    } catch {
      return 0;
    }

    const isNonShift =
      attendance.employee.employeeType.scheduleType === "NON_SHIFT" ||
      !attendance.shift;

    if (isNonShift) {
      // Non-Shift: 1 Daily Performance / Activity Report
      const baseDate = new Date(attendance.workDate || attendance.date);
      const scheduledAt = new Date(baseDate);
      scheduledAt.setHours(17, 0, 0, 0);

      // Tolerance starts when checked in, ends at end of day
      const toleranceStartAt = attendance.checkInTime
        ? new Date(attendance.checkInTime)
        : new Date(new Date(baseDate).setHours(6, 0, 0, 0));

      const toleranceEndAt = new Date(baseDate);
      toleranceEndAt.setHours(23, 59, 59, 999);

      await prisma.periodicReport.create({
        data: {
          tenantId: attendance.tenantId,
          attendanceId: attendance.id,
          employeeId: attendance.employeeId,
          checkpointSequence: 1,
          scheduledAt,
          toleranceStartAt,
          toleranceEndAt,
          status: "PENDING",
        },
      });
      return 1;
    }

    if (!attendance.shift) {
      return 0;
    }

    const intervalHours = config.intervalHours ?? 4;
    const toleranceBeforeMin = config.toleranceBeforeMin ?? 30;
    const toleranceAfterMin = config.toleranceAfterMin ?? 30;

    const durationMinutes = attendance.shift.durationMinutes || 720;
    const durationHours = durationMinutes / 60;
    const totalCheckpoints = Math.floor(durationHours / intervalHours);

    const [startH, startM] = attendance.shift.startTime.split(":").map(Number);
    const shiftBaseStart = new Date(attendance.workDate || attendance.date);
    shiftBaseStart.setHours(startH, startM, 0, 0);

    let createdCount = 0;
    for (let i = 1; i <= totalCheckpoints; i++) {
      const scheduledAt = addHours(shiftBaseStart, i * intervalHours);

      // Do not create if matches or exceeds shift end
      const shiftEnd = addHours(shiftBaseStart, durationHours);
      if (scheduledAt >= shiftEnd) {
        continue;
      }

      const toleranceStartAt = subMinutes(scheduledAt, toleranceBeforeMin);
      const toleranceEndAt = addMinutes(scheduledAt, toleranceAfterMin);

      await prisma.periodicReport.create({
        data: {
          tenantId: attendance.tenantId,
          attendanceId: attendance.id,
          employeeId: attendance.employeeId,
          checkpointSequence: i,
          scheduledAt,
          toleranceStartAt,
          toleranceEndAt,
          status: "PENDING",
        },
      });
      createdCount++;
    }

    return createdCount;
  }
}
