import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

export interface ResolvedSchedule {
  isWorkDay: boolean;
  isHoliday: boolean;
  isDayOff: boolean;
  holidayName?: string;
  scheduleType: "SHIFT" | "NON_SHIFT";
  scheduleName?: string;
  startTime?: string | null;
  endTime?: string | null;
  isCrossDay?: boolean;
  is24Hours?: boolean;
  shift?: any;
  workSchedule?: any;
}

export class ScheduleResolver {
  public static async resolveForEmployee(
    employeeId: string,
    targetDate: Date = new Date()
  ): Promise<ResolvedSchedule> {
    const dayStart = startOfDay(targetDate);

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
      throw new Error("Pegawai atau tipe pegawai tidak ditemukan");
    }

    const employeeType = employee.employeeType;

    // 1. Check specific shift roster for today
    const roster = await prisma.employeeShiftRoster.findUnique({
      where: {
        employeeId_rosterDate: {
          employeeId,
          rosterDate: dayStart,
        },
      },
      include: { shift: true },
    });

    if (roster) {
      if (roster.isDayOff || !roster.shift) {
        return {
          isWorkDay: false,
          isHoliday: false,
          isDayOff: true,
          scheduleType: "SHIFT",
          scheduleName: "Jadwal Libur Tugas (Off)",
        };
      }

      return {
        isWorkDay: true,
        isHoliday: false,
        isDayOff: false,
        scheduleType: "SHIFT",
        scheduleName: roster.shift.name,
        startTime: roster.shift.startTime,
        endTime: roster.shift.endTime,
        isCrossDay: roster.shift.isCrossDay,
        is24Hours: roster.shift.is24Hours,
        shift: roster.shift,
      };
    }

    // 2. Check company/national holidays
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: dayStart,
      },
    });

    if (holiday) {
      return {
        isWorkDay: false,
        isHoliday: true,
        isDayOff: true,
        holidayName: holiday.name,
        scheduleType: employeeType.scheduleType as any,
        scheduleName: `Hari Libur: ${holiday.name}`,
      };
    }

    // 3. Fallback: Non-Shift regular daily schedule
    if (employeeType.scheduleType === "NON_SHIFT") {
      const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay();
      const dailySchedule = employeeType.workSchedules.find((s) => s.dayOfWeek === dayOfWeek);

      if (!dailySchedule || !dailySchedule.isWorkDay) {
        return {
          isWorkDay: false,
          isHoliday: false,
          isDayOff: true,
          scheduleType: "NON_SHIFT",
          scheduleName: "Libur Akhir Pekan",
        };
      }

      return {
        isWorkDay: true,
        isHoliday: false,
        isDayOff: false,
        scheduleType: "NON_SHIFT",
        scheduleName: dailySchedule.name,
        startTime: dailySchedule.startTime,
        endTime: dailySchedule.endTime,
        isCrossDay: dailySchedule.isCrossDay,
        workSchedule: dailySchedule,
      };
    }

    // 4. Fallback: Shift-based type (check active EmployeeShift or first shift)
    const empShift = await prisma.employeeShift.findFirst({
      where: { employeeId, isActive: true },
      include: { shift: true },
      orderBy: { effectiveFrom: "desc" },
    });

    const shift = empShift?.shift || employeeType.shifts[0];

    if (shift) {
      return {
        isWorkDay: true,
        isHoliday: false,
        isDayOff: false,
        scheduleType: "SHIFT",
        scheduleName: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        isCrossDay: shift.isCrossDay,
        is24Hours: shift.is24Hours,
        shift,
      };
    }

    return {
      isWorkDay: false,
      isHoliday: false,
      isDayOff: true,
      scheduleType: "SHIFT",
      scheduleName: "Tidak Ada Shift Terdaftar",
    };
  }
}
