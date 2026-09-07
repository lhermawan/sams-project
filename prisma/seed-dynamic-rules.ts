import { PrismaClient } from "@prisma/client";
import { startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Dynamic Attendance Rules Migration and Seeder...");

  // 1. EmployeeType: STAFF
  const staffType = await prisma.employeeType.upsert({
    where: { code: "STAFF" },
    update: {},
    create: {
      code: "STAFF",
      name: "Staff Kantor (Non-Shift)",
      description: "Pegawai harian reguler Senin s/d Jumat",
      scheduleType: "NON_SHIFT",
      isActive: true,
    },
  });

  // 2. EmployeeType: SATPAM
  const satpamType = await prisma.employeeType.upsert({
    where: { code: "SATPAM" },
    update: {},
    create: {
      code: "SATPAM",
      name: "Satuan Pengamanan (Satpam)",
      description: "Petugas keamanan bersistem shift 12 dan 24 jam, wajib serah terima dan patroli berkala",
      scheduleType: "SHIFT",
      isActive: true,
    },
  });

  console.log("Created/Ensured Employee Types:", staffType.code, satpamType.code);

  // 3. Work Schedules for STAFF (Senin - Minggu)
  const staffDays = [
    { dayOfWeek: 1, name: "Senin", isWorkDay: true, startTime: "07:30", endTime: "16:00" },
    { dayOfWeek: 2, name: "Selasa", isWorkDay: true, startTime: "07:30", endTime: "16:00" },
    { dayOfWeek: 3, name: "Rabu", isWorkDay: true, startTime: "07:30", endTime: "16:00" },
    { dayOfWeek: 4, name: "Kamis", isWorkDay: true, startTime: "07:30", endTime: "16:00" },
    { dayOfWeek: 5, name: "Jumat", isWorkDay: true, startTime: "07:30", endTime: "16:30" },
    { dayOfWeek: 6, name: "Sabtu", isWorkDay: false, startTime: null, endTime: null },
    { dayOfWeek: 7, name: "Minggu", isWorkDay: false, startTime: null, endTime: null },
  ];

  for (const day of staffDays) {
    const existing = await prisma.workSchedule.findFirst({
      where: { employeeTypeId: staffType.id, dayOfWeek: day.dayOfWeek },
    });
    if (!existing) {
      await prisma.workSchedule.create({
        data: {
          employeeTypeId: staffType.id,
          name: "Jadwal " + day.name,
          dayOfWeek: day.dayOfWeek,
          isWorkDay: day.isWorkDay,
          startTime: day.startTime,
          endTime: day.endTime,
          toleranceMin: 15,
          isActive: true,
        },
      });
    }
  }
  console.log("Seeded Work Schedules for STAFF");

  // 4. Shifts for SATPAM
  const satpamShifts = [
    {
      code: "SATPAM_SHIFT_1",
      name: "Shift 1 (Pagi 12 Jam)",
      startTime: "07:00",
      endTime: "19:00",
      isCrossDay: false,
      is24Hours: false,
      durationMinutes: 720,
    },
    {
      code: "SATPAM_SHIFT_2",
      name: "Shift 2 (Malam 12 Jam Lintas Hari)",
      startTime: "19:00",
      endTime: "07:00",
      isCrossDay: true,
      is24Hours: false,
      durationMinutes: 720,
    },
    {
      code: "SATPAM_SHIFT_24H",
      name: "Shift 24 Jam Penuh",
      startTime: "07:00",
      endTime: "07:00",
      isCrossDay: true,
      is24Hours: true,
      durationMinutes: 1440,
    },
  ];

  for (const s of satpamShifts) {
    await prisma.shift.upsert({
      where: { code: s.code },
      update: {
        employeeTypeId: satpamType.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        isCrossDay: s.isCrossDay,
        is24Hours: s.is24Hours,
        durationMinutes: s.durationMinutes,
      },
      create: {
        employeeTypeId: satpamType.id,
        code: s.code,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        isCrossDay: s.isCrossDay,
        is24Hours: s.is24Hours,
        durationMinutes: s.durationMinutes,
        toleranceMin: 10,
        checkInStartBufferMin: 120,
        checkInEndBufferMin: 240,
        isActive: true,
      },
    });
  }
  console.log("Seeded Shifts for SATPAM");

  // 5. Dynamic Rules for SATPAM
  const satpamRules = [
    {
      ruleType: "HANDOVER",
      executionStage: "PRE_CHECK_IN",
      priority: 1,
      configuration: JSON.stringify({
        requireHandover: true,
        requirePhoto: true,
        minPhotos: 1,
        maxPhotos: 5,
      }),
    },
    {
      ruleType: "PERIODIC_REPORT",
      executionStage: "PRE_CHECK_OUT",
      priority: 2,
      configuration: JSON.stringify({
        intervalHours: 4,
        toleranceBeforeMin: 30,
        toleranceAfterMin: 30,
        minPhotos: 3,
        maxPhotos: 10,
        checkoutAction: "ALLOW_WITH_INCOMPLETE_STATUS",
      }),
    },
    {
      ruleType: "LATE_TOLERANCE",
      executionStage: "CHECK_IN",
      priority: 3,
      configuration: JSON.stringify({
        gracePeriodMinutes: 10,
        maxLateMinutes: 120,
        actionOnExceedMax: "BLOCK_CHECKIN",
      }),
    },
    {
      ruleType: "LOCATION",
      executionStage: "CHECK_IN",
      priority: 4,
      configuration: JSON.stringify({
        enforceGeofence: true,
        radiusMeters: 100,
      }),
    },
  ];

  for (const r of satpamRules) {
    await prisma.attendanceRule.upsert({
      where: {
        employeeTypeId_ruleType: {
          employeeTypeId: satpamType.id,
          ruleType: r.ruleType,
        },
      },
      update: {
        configuration: r.configuration,
        executionStage: r.executionStage,
        priority: r.priority,
      },
      create: {
        employeeTypeId: satpamType.id,
        ruleType: r.ruleType,
        executionStage: r.executionStage,
        priority: r.priority,
        configuration: r.configuration,
        isActive: true,
      },
    });
  }
  console.log("Seeded Dynamic Rules for SATPAM");

  // 6. Dynamic Rules for STAFF
  const staffRules = [
    {
      ruleType: "LATE_TOLERANCE",
      executionStage: "CHECK_IN",
      priority: 1,
      configuration: JSON.stringify({
        gracePeriodMinutes: 15,
        maxLateMinutes: 60,
        actionOnExceedMax: "ALLOW_FLAG_EXCESSIVE_LATE",
      }),
    },
    {
      ruleType: "LOCATION",
      executionStage: "CHECK_IN",
      priority: 2,
      configuration: JSON.stringify({
        enforceGeofence: true,
        radiusMeters: 100,
      }),
    },
  ];

  for (const r of staffRules) {
    await prisma.attendanceRule.upsert({
      where: {
        employeeTypeId_ruleType: {
          employeeTypeId: staffType.id,
          ruleType: r.ruleType,
        },
      },
      update: {
        configuration: r.configuration,
        executionStage: r.executionStage,
        priority: r.priority,
      },
      create: {
        employeeTypeId: staffType.id,
        ruleType: r.ruleType,
        executionStage: r.executionStage,
        priority: r.priority,
        configuration: r.configuration,
        isActive: true,
      },
    });
  }
  console.log("Seeded Dynamic Rules for STAFF");

  // 7. Backfill Existing Employees
  const updatedEmployees = await prisma.employee.updateMany({
    where: { employeeTypeId: null },
    data: { employeeTypeId: staffType.id },
  });
  console.log("Backfilled employees:", updatedEmployees.count);

  // 8. Backfill Existing Attendances
  const attendances = await prisma.attendance.findMany({
    where: { workDate: null },
  });
  for (const att of attendances) {
    await prisma.attendance.update({
      where: { id: att.id },
      data: {
        workDate: startOfDay(att.date),
        employeeTypeId: staffType.id,
      },
    });
  }
  console.log("Backfilled attendances:", attendances.length);

  console.log("Dynamic Rules Seeder and Backfill Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("Seeder error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
