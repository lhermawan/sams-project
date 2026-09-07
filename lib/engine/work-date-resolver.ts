import { prisma } from "@/lib/db";
import { startOfDay, addDays, subDays, isBefore, isAfter } from "date-fns";

export interface ResolvedWorkSession {
  workDate: Date;
  shift?: any;
  schedule?: any;
  activeAttendance?: any;
  isNewSession: boolean;
}

export class WorkDateResolver {
  /**
   * Determine the work_date and active shift/schedule for an employee.
   * For Check-In: Finds candidate shift window (today, yesterday for cross-day, etc.)
   * Auto-closes abandoned sessions older than 28 hours.
   */
  public static async resolveCheckIn(
    employeeId: string,
    now: Date = new Date()
  ): Promise<ResolvedWorkSession> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employeeType: {
          include: {
            shifts: { where: { isActive: true } },
            workSchedules: { where: { isActive: true } },
          },
        },
      },
    });

    if (!employee || !employee.employeeType) {
      throw new Error("Data pegawai atau jenis pegawai tidak ditemukan.");
    }

    // 1. Check if there is an active unclosed session
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        checkOutTime: null,
      },
      orderBy: { checkInTime: "desc" },
    });

    if (activeAttendance && activeAttendance.checkInTime) {
      const hoursSinceCheckIn =
        (now.getTime() - new Date(activeAttendance.checkInTime).getTime()) / (1000 * 60 * 60);

      if (hoursSinceCheckIn > 28) {
        // Auto-close abandoned session
        await prisma.attendance.update({
          where: { id: activeAttendance.id },
          data: {
            status: "INCOMPLETE",
            notes: (activeAttendance.notes ? activeAttendance.notes + " | " : "") +
              "Sistem: Ditutup otomatis karena pegawai lupa absen pulang (melebihi 28 jam)",
            checkOutTime: new Date(activeAttendance.checkInTime.getTime() + 12 * 3600 * 1000),
          },
        });
      } else {
        // Active session still ongoing!
        return {
          workDate: activeAttendance.workDate || activeAttendance.date,
          activeAttendance,
          isNewSession: false,
        };
      }
    }

    // 2. Non-Shift handling
    if (employee.employeeType.scheduleType === "NON_SHIFT") {
      const todayDate = startOfDay(now);
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon .. 7=Sun
      const schedule = employee.employeeType.workSchedules.find(
        (s) => s.dayOfWeek === dayOfWeek
      );

      return {
        workDate: todayDate,
        schedule: schedule || null,
        isNewSession: true,
      };
    }

    // 3. Shift handling: Evaluate Roster first, then default shifts
    const candidateDates = [
      subDays(startOfDay(now), 1), // Yesterday (crucial for cross-day check-in that happens late)
      startOfDay(now),             // Today
      addDays(startOfDay(now), 1), // Tomorrow (early bird check-in)
    ];

    for (const candDate of candidateDates) {
      // Check shift roster
      const roster = await prisma.employeeShiftRoster.findUnique({
        where: {
          employeeId_rosterDate: {
            employeeId,
            rosterDate: candDate,
          },
        },
        include: { shift: true },
      });

      let shift = roster?.shift;

      // Fallback to employeeType active shifts matching time window
      if (!shift && !roster?.isDayOff) {
        // Check which shift fits
        for (const s of employee.employeeType.shifts) {
          const [startH, startM] = s.startTime.split(":").map(Number);
          const shiftStart = new Date(candDate);
          shiftStart.setHours(startH, startM, 0, 0);

          const windowStart = new Date(shiftStart.getTime() - s.checkInStartBufferMin * 60000);
          const windowEnd = new Date(shiftStart.getTime() + s.checkInEndBufferMin * 60000);

          if (now >= windowStart && now <= windowEnd) {
            shift = s;
            break;
          }
        }
      }

      if (shift) {
        const [startH, startM] = shift.startTime.split(":").map(Number);
        const shiftStart = new Date(candDate);
        shiftStart.setHours(startH, startM, 0, 0);

        const windowStart = new Date(shiftStart.getTime() - shift.checkInStartBufferMin * 60000);
        const windowEnd = new Date(shiftStart.getTime() + shift.checkInEndBufferMin * 60000);

        if (now >= windowStart && now <= windowEnd) {
          return {
            workDate: candDate,
            shift,
            isNewSession: true,
          };
        }
      }
    }

    // Fallback: Default to today with the first available shift
    const defaultShift = employee.employeeType.shifts[0];
    return {
      workDate: startOfDay(now),
      shift: defaultShift || null,
      isNewSession: true,
    };
  }

  /**
   * Find active attendance session for Check-Out.
   * Never creates a new record on checkout!
   */
  public static async resolveCheckOut(employeeId: string): Promise<any> {
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        checkOutTime: null,
      },
      include: {
        employee: {
          include: { employeeType: true },
        },
        shift: true,
        periodicReports: true,
      },
      orderBy: { checkInTime: "desc" },
    });

    if (!activeAttendance) {
      throw new Error("Tidak ditemukan sesi absen masuk yang aktif. Anda belum melakukan absen masuk.");
    }

    return activeAttendance;
  }
}
