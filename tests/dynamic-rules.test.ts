import { PrismaClient } from "@prisma/client";
import { WorkDateResolver } from "../lib/engine/work-date-resolver";
import { ScheduleResolver } from "../lib/engine/schedule-resolver";
import { AttendanceRuleEngine } from "../lib/engine/rule-engine";
import { PeriodicReportGenerator } from "../lib/engine/periodic-report-generator";
import { startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING DYNAMIC ATTENDANCE RULE SYSTEM TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Shift 24 Jam Duration Calculation
    // ----------------------------------------------------
    const shift24 = await prisma.shift.findUnique({
      where: { code: "SATPAM_SHIFT_24H" },
    });
    assert(!!shift24, "Shift 24 Jam terdaftar di database");
    assert(
      shift24?.durationMinutes === 1440,
      `Shift 24 Jam berdurasi tepat 1.440 menit (24 jam), bukan 0 menit. Actual: ${shift24?.durationMinutes}`
    );
    assert(shift24?.is24Hours === true, "Flag is24Hours bernilai true");

    // ----------------------------------------------------
    // TEST 2: Shift Lintas Hari (Cross-Day) 19:00 - 07:00
    // ----------------------------------------------------
    const shiftCross = await prisma.shift.findUnique({
      where: { code: "SATPAM_SHIFT_2" },
    });
    assert(!!shiftCross, "Shift 2 (Malam) terdaftar di database");
    assert(shiftCross?.isCrossDay === true, "Shift 2 memiliki flag isCrossDay = true");
    assert(
      shiftCross?.durationMinutes === 720,
      `Shift 2 (19:00 - 07:00) berdurasi 720 menit (12 jam). Actual: ${shiftCross?.durationMinutes}`
    );

    // ----------------------------------------------------
    // TEST 3: Non-Shift Jumat Berbeda
    // ----------------------------------------------------
    const staffType = await prisma.employeeType.findUnique({
      where: { code: "STAFF" },
      include: { workSchedules: true },
    });
    assert(!!staffType, "EmployeeType STAFF terdaftar");

    const fridaySchedule = staffType?.workSchedules.find((s) => s.dayOfWeek === 5);
    const mondaySchedule = staffType?.workSchedules.find((s) => s.dayOfWeek === 1);
    const saturdaySchedule = staffType?.workSchedules.find((s) => s.dayOfWeek === 6);

    assert(
      fridaySchedule?.endTime === "16:30",
      `Jadwal Jumat jam pulang 16:30. Actual: ${fridaySchedule?.endTime}`
    );
    assert(
      mondaySchedule?.endTime === "16:00",
      `Jadwal Senin jam pulang 16:00. Actual: ${mondaySchedule?.endTime}`
    );
    assert(
      saturdaySchedule?.isWorkDay === false,
      "Jadwal Sabtu berstatus libur mingguan (isWorkDay = false)"
    );

    // Setup Test Employee
    const satpamType = await prisma.employeeType.findUnique({
      where: { code: "SATPAM" },
    });

    let testEmp = await prisma.employee.findFirst({
      where: { nip: "TEST_SECURITY_99" },
    });

    if (!testEmp) {
      const user = await prisma.user.create({
        data: {
          email: "security.test@sams.id",
          password: "hashedpassword",
          role: "EMPLOYEE",
        },
      });

      testEmp = await prisma.employee.create({
        data: {
          nip: "TEST_SECURITY_99",
          name: "Security Tester",
          department: "Security",
          position: "Danru",
          employeeTypeId: satpamType!.id,
          userId: user.id,
        },
      });
    }

    const workDate = new Date("2026-09-07T00:00:00.000Z");

    // ----------------------------------------------------
    // TEST 4: Late Rule Engine (Grace Period & Max Late Cutoff)
    // ----------------------------------------------------
    // 4a. Check-in on time (07:08 WIB - within 10 min grace period for 07:00 shift)
    const onTimeContext = {
      employeeId: testEmp.id,
      employeeTypeId: satpamType!.id,
      workDate,
      checkInTime: new Date("2026-09-07T07:08:00.000+07:00"),
      shift: { startTime: "07:00" },
      latitude: -6.2088,
      longitude: 106.8456,
    };
    const onTimeRes = await AttendanceRuleEngine.executeStage("CHECK_IN", onTimeContext);
    assert(
      onTimeRes.isPassed === true && onTimeRes.combinedDetails?.lateMinutes === 0,
      `Check-in menit ke-8 (toleransi 10 mnt) dianggap VALID On-Time (lateMinutes: ${onTimeRes.combinedDetails?.lateMinutes})`
    );

    // 4b. Check-in late (07:25 WIB - 25 min after 07:00)
    const lateContext = {
      employeeId: testEmp.id,
      employeeTypeId: satpamType!.id,
      workDate,
      checkInTime: new Date("2026-09-07T07:25:00.000+07:00"),
      shift: { startTime: "07:00" },
      latitude: -6.2088,
      longitude: 106.8456,
    };
    const lateRes = await AttendanceRuleEngine.executeStage("CHECK_IN", lateContext);
    assert(
      lateRes.combinedDetails?.isLate === true && lateRes.combinedDetails?.lateMinutes === 25,
      `Check-in 07:25 WIB tercatat terlambat 25 menit. Actual: ${lateRes.combinedDetails?.lateMinutes}`
    );

    // 4c. Check-in excessive late (130 min late when max is 120 min) -> BLOCKED
    const excessiveLateContext = {
      employeeId: testEmp.id,
      employeeTypeId: satpamType!.id,
      workDate,
      checkInTime: new Date("2026-09-07T09:10:00.000+07:00"), // 130 min late
      shift: { startTime: "07:00" },
      latitude: -6.2088,
      longitude: 106.8456,
    };
    const excessiveLateRes = await AttendanceRuleEngine.executeStage("CHECK_IN", excessiveLateContext);
    assert(
      excessiveLateRes.isPassed === false && excessiveLateRes.isBlocking === true,
      `Check-in terlambat 130 menit (batas 120 menit) diblokir oleh rule engine. Message: "${excessiveLateRes.message}"`
    );

    // ----------------------------------------------------
    // TEST 5: Handover Rule Engine
    // ----------------------------------------------------
    // 5a. Missing handover -> BLOCKED
    const noHandoverRes = await AttendanceRuleEngine.executeStage("PRE_CHECK_IN", {
      employeeId: testEmp.id,
      employeeTypeId: satpamType!.id,
      workDate,
      handoverId: null,
    });
    assert(
      noHandoverRes.isPassed === false && noHandoverRes.isBlocking === true,
      `Check-in ditolak jika serah terima belum selesai. Message: "${noHandoverRes.message}"`
    );

    // ----------------------------------------------------
    // TEST 6: Periodic Report Generator (Patroli per 4 jam)
    // ----------------------------------------------------
    const testAttendance = await prisma.attendance.create({
      data: {
        employeeId: testEmp.id,
        employeeTypeId: satpamType!.id,
        shiftId: shiftCross!.id, // 19:00 - 07:00 (12 Jam)
        date: new Date("2026-09-06T00:00:00.000Z"),
        workDate: new Date("2026-09-06T00:00:00.000Z"),
        checkInTime: new Date("2026-09-06T19:02:00.000+07:00"),
        status: "VALID",
      },
    });

    const generatedCount = await PeriodicReportGenerator.generateForAttendance(testAttendance.id);
    assert(
      generatedCount === 2,
      `Shift 12 jam dengan interval 4 jam menghasilkan tepat 2 checkpoint patroli (19:00 + 4h = 23:00, + 8h = 03:00). Actual: ${generatedCount}`
    );

    const checkpoints = await prisma.periodicReport.findMany({
      where: { attendanceId: testAttendance.id },
      orderBy: { checkpointSequence: "asc" },
    });

    assert(checkpoints.length === 2, "Jumlah checkpoint di database tepat 2");

    // ----------------------------------------------------
    // TEST 7: Check-Out with Incomplete Periodic Reports
    // ----------------------------------------------------
    const preCheckOutRes = await AttendanceRuleEngine.executeStage("PRE_CHECK_OUT", {
      attendanceId: testAttendance.id,
      employeeId: testEmp.id,
      employeeTypeId: satpamType!.id,
      workDate: testAttendance.workDate!,
    });

    assert(
      preCheckOutRes.isPassed === true && preCheckOutRes.combinedDetails?.markIncomplete === true,
      `Check-out dengan checkpoint patroli belum lengkap mengizinkan pulang namun menandai status INCOMPLETE (${preCheckOutRes.combinedDetails?.incompleteCount} patroli belum lengkap).`
    );

    // Clean up test attendance
    await prisma.periodicReport.deleteMany({ where: { attendanceId: testAttendance.id } });
    await prisma.attendanceRuleLog.deleteMany({ where: { employeeId: testEmp.id } });
    await prisma.attendance.delete({ where: { id: testAttendance.id } });
    await prisma.employee.delete({ where: { id: testEmp.id } });
    await prisma.user.delete({ where: { email: "security.test@sams.id" } });
    console.log("🧹 Test artifacts cleaned up.");

  } catch (err: any) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("==================================================");
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
