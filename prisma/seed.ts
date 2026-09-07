import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // 1. Admin User
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@sams.id" },
    update: {},
    create: { email: "admin@sams.id", password: adminPassword, role: "ADMIN", isActive: true },
  });
  console.log("Admin created:", admin.email);

  // 2. Employee Types & Rules
  // KANTOR
  const typeKantor = await prisma.employeeType.upsert({
    where: { code: "KANTOR" },
    update: {},
    create: { code: "KANTOR", name: "Pegawai Kantor (Non-Shift)", description: "Jadwal kerja tetap Senin - Jumat", scheduleType: "NON_SHIFT", isActive: true },
  });
  const days = [
    { dayOfWeek: 1, name: "Senin", isWorkDay: true }, { dayOfWeek: 2, name: "Selasa", isWorkDay: true },
    { dayOfWeek: 3, name: "Rabu", isWorkDay: true }, { dayOfWeek: 4, name: "Kamis", isWorkDay: true },
    { dayOfWeek: 5, name: "Jumat", isWorkDay: true }, { dayOfWeek: 6, name: "Sabtu", isWorkDay: false },
    { dayOfWeek: 7, name: "Minggu", isWorkDay: false },
  ];
  for (const day of days) {
    await prisma.workSchedule.upsert({
      where: { id: `schedule-kantor-${day.dayOfWeek}` },
      update: {},
      create: { id: `schedule-kantor-${day.dayOfWeek}`, employeeTypeId: typeKantor.id, name: "Jadwal " + day.name, dayOfWeek: day.dayOfWeek, isWorkDay: day.isWorkDay, startTime: day.isWorkDay ? "08:00" : null, endTime: day.isWorkDay ? "17:00" : null }
    });
  }
  await prisma.attendanceRule.upsert({
    where: { id: "rule-late-kantor" },
    update: {},
    create: { id: "rule-late-kantor", employeeTypeId: typeKantor.id, ruleType: "LATE_TOLERANCE", executionStage: "CHECK_IN", priority: 1, configuration: JSON.stringify({ gracePeriodMinutes: 15, maxLateMinutes: 60, actionOnExceedMax: "ALLOW_FLAG_EXCESSIVE_LATE" }) }
  });
  console.log("KANTOR type seeded");

  // SATPAM
  const typeSatpam = await prisma.employeeType.upsert({
    where: { code: "SATPAM" },
    update: {},
    create: { code: "SATPAM", name: "Satpam (Shift)", description: "Jadwal kerja shift", scheduleType: "SHIFT", isActive: true },
  });
  const satpamShifts = [
    { code: "PAGI", name: "Shift Pagi", startTime: "07:00", endTime: "15:00", isCrossDay: false },
    { code: "SIANG", name: "Shift Siang", startTime: "15:00", endTime: "23:00", isCrossDay: false },
    { code: "MALAM", name: "Shift Malam", startTime: "23:00", endTime: "07:00", isCrossDay: true },
    { code: "24JAM", name: "Piket 24 Jam", startTime: "08:00", endTime: "08:00", isCrossDay: true, is24Hours: true },
  ];
  for (const s of satpamShifts) {
    await prisma.shift.upsert({
      where: { code: s.code },
      update: {},
      create: { employeeTypeId: typeSatpam.id, code: s.code, name: s.name, startTime: s.startTime, endTime: s.endTime, isCrossDay: s.isCrossDay, is24Hours: s.is24Hours || false, durationMinutes: s.is24Hours ? 1440 : 480 }
    });
  }
  await prisma.attendanceRule.upsert({
    where: { id: "rule-handover-satpam" },
    update: {},
    create: { id: "rule-handover-satpam", employeeTypeId: typeSatpam.id, ruleType: "HANDOVER", executionStage: "PRE_CHECK_IN", priority: 1, configuration: JSON.stringify({ requireHandover: true, requirePhoto: true, minPhotos: 1 }) }
  });
  await prisma.attendanceRule.upsert({
    where: { id: "rule-patroli-satpam" },
    update: {},
    create: { id: "rule-patroli-satpam", employeeTypeId: typeSatpam.id, ruleType: "PERIODIC_REPORT", executionStage: "DURING_SHIFT", priority: 2, configuration: JSON.stringify({ intervalHours: 4, gracePeriodMinutes: 30, requirePhoto: true }) }
  });
  console.log("SATPAM type seeded");

  // 3. Sample Employees
  const employees = [
    { email: "ahmad.rizki@sams.id", nip: "2024001", name: "Ahmad Rizki", department: "IT Department", employeeTypeId: typeKantor.id, position: "Software Engineer" },
    { email: "siti.nurhaliza@sams.id", nip: "2024002", name: "Siti Nurhaliza", department: "HR Department", employeeTypeId: typeKantor.id, position: "HR Specialist" },
    { email: "budi.santoso@sams.id", nip: "2024003", name: "Budi Santoso", department: "Security", employeeTypeId: typeSatpam.id, position: "Satpam" },
  ];
  for (const emp of employees) {
    const password = await bcrypt.hash("Pegawai@123", 12);
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email, password, role: "EMPLOYEE", isActive: true,
        employee: { create: { nip: emp.nip, name: emp.name, department: emp.department, position: emp.position, isActive: true, employeeTypeId: emp.employeeTypeId } },
      },
    });
    console.log("Employee created:", emp.name);
  }

  // 4. Office Location & Settings
  await prisma.officeLocation.upsert({
    where: { id: "office-main" },
    update: {},
    create: { id: "office-main", name: "Kantor Pusat", address: "Jl. Contoh No. 1, Jakarta", latitude: -6.2088, longitude: 106.8456, radius: 100, isActive: true },
  });
  const settings = [
    { key: "app_name", value: "SAMS - Smart Attendance Management System" },
    { key: "timezone", value: "Asia/Jakarta" }, { key: "attendance_radius", value: "100" },
    { key: "office_lat", value: "-6.2088" }, { key: "office_lng", value: "106.8456" },
    { key: "late_tolerance_min", value: "15" },
  ];
  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log("Settings seeded");
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
