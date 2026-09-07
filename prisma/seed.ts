import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ── Admin User ────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@sams.id" },
    update: {},
    create: {
      email: "admin@sams.id",
      password: adminPassword,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Admin created:", admin.email);

  // ── Sample Employees ──────────────────────────────────────────────────────
  const employees = [
    {
      email: "ahmad.rizki@sams.id",
      nip: "2024001",
      name: "Ahmad Rizki",
      department: "IT Department",
      position: "Software Engineer",
    },
    {
      email: "siti.nurhaliza@sams.id",
      nip: "2024002",
      name: "Siti Nurhaliza",
      department: "HR Department",
      position: "HR Specialist",
    },
    {
      email: "budi.santoso@sams.id",
      nip: "2024003",
      name: "Budi Santoso",
      department: "Finance",
      position: "Accounting Staff",
    },
  ];

  for (const emp of employees) {
    const password = await bcrypt.hash("Pegawai@123", 12);
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        password,
        role: "EMPLOYEE",
        isActive: true,
        employee: {
          create: {
            nip: emp.nip,
            name: emp.name,
            department: emp.department,
            position: emp.position,
            isActive: true,
          },
        },
      },
    });
    console.log("✅ Employee created:", emp.name);
  }

  // ── Office Location ───────────────────────────────────────────────────────
  await prisma.officeLocation.upsert({
    where: { id: "office-main" },
    update: {},
    create: {
      id: "office-main",
      name: "Kantor Pusat",
      address: "Jl. Contoh No. 1, Jakarta",
      latitude: -6.2088,    // Change to your actual office coordinates
      longitude: 106.8456,
      radius: 100,
      isActive: true,
    },
  });
  console.log("✅ Office location seeded");

  // ── Work Schedule ─────────────────────────────────────────────────────────
  await prisma.workSchedule.upsert({
    where: { id: "schedule-normal" },
    update: {},
    create: {
      id: "schedule-normal",
      name: "Jadwal Normal",
      startTime: "08:00",
      endTime: "17:00",
      toleranceMin: 15,
      effectiveFrom: new Date("2024-01-01"),
      isActive: true,
    },
  });
  console.log("✅ Work schedule seeded");

  // ── Default Shifts ────────────────────────────────────────────────────────
  const shifts = [
    { id: "shift-pagi", name: "Shift Pagi", code: "PAGI", startTime: "07:00", endTime: "15:00", isCrossDay: false },
    { id: "shift-normal", name: "Shift Normal", code: "NORMAL", startTime: "08:00", endTime: "17:00", isCrossDay: false },
    { id: "shift-malam", name: "Shift Malam", code: "MALAM", startTime: "22:00", endTime: "06:00", isCrossDay: true },
  ];

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { id: shift.id },
      update: {},
      create: { ...shift, toleranceMin: 15, isActive: true },
    });
    console.log("✅ Shift created:", shift.name);
  }

  // ── System Settings ───────────────────────────────────────────────────────
  const settings = [
    { key: "app_name", value: "SAMS - Smart Attendance Management System" },
    { key: "timezone", value: "Asia/Jakarta" },
    { key: "attendance_radius", value: "100" },
    { key: "office_lat", value: "-6.2088" },
    { key: "office_lng", value: "106.8456" },
    { key: "late_tolerance_min", value: "15" },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log("✅ System settings seeded");

  console.log("\n🎉 Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Admin    : admin@sams.id / Admin@123");
  console.log("Employee : ahmad.rizki@sams.id / Pegawai@123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
