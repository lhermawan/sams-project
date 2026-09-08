import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // 1. SUPER ADMIN (No Tenant)
  // Wait, User model requires tenantId! So the super admin MUST belong to a tenant, or we create a dummy "SYSTEM" tenant.
  const sysTenant = await prisma.tenant.upsert({
    where: { subdomain: "app" },
    update: {},
    create: { subdomain: "app", name: "System Admin", domain: "app.niskala.id", isActive: true },
  });

  const superAdminPassword = await bcrypt.hash("Super@123", 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: sysTenant.id, email: "super@niskala.id" } },
    update: {},
    create: { tenantId: sysTenant.id, email: "super@niskala.id", password: superAdminPassword, role: "SUPER_ADMIN", isActive: true },
  });
  console.log("Super Admin created: super@niskala.id");

  // 2. Sample Tenants (MBG & DWP)
  const tenantMbg = await prisma.tenant.upsert({
    where: { subdomain: "mbg" },
    update: {},
    create: { subdomain: "mbg", name: "PT. MBG Niskala", isActive: true },
  });

  const tenantDwp = await prisma.tenant.upsert({
    where: { subdomain: "dwp" },
    update: {},
    create: { subdomain: "dwp", name: "PT. DWP Niskala", isActive: true },
  });
  console.log("Tenants seeded (mbg, dwp)");

  // 3. Admin User for MBG
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantMbg.id, email: "admin@mbg.id" } },
    update: {},
    create: { tenantId: tenantMbg.id, email: "admin@mbg.id", password: adminPassword, role: "ADMIN", isActive: true },
  });
  console.log("MBG Admin created: admin@mbg.id");

  // 4. Employee Types & Rules (MBG)
  const typeKantor = await prisma.employeeType.upsert({
    where: { tenantId_code: { tenantId: tenantMbg.id, code: "KANTOR" } },
    update: {},
    create: { tenantId: tenantMbg.id, code: "KANTOR", name: "Pegawai Kantor (Non-Shift)", description: "Jadwal kerja tetap", scheduleType: "NON_SHIFT", isActive: true },
  });
  const days = [
    { dayOfWeek: 1, name: "Senin", isWorkDay: true }, { dayOfWeek: 2, name: "Selasa", isWorkDay: true },
    { dayOfWeek: 3, name: "Rabu", isWorkDay: true }, { dayOfWeek: 4, name: "Kamis", isWorkDay: true },
    { dayOfWeek: 5, name: "Jumat", isWorkDay: true }, { dayOfWeek: 6, name: "Sabtu", isWorkDay: false },
    { dayOfWeek: 7, name: "Minggu", isWorkDay: false },
  ];
  for (const day of days) {
    await prisma.workSchedule.create({
      data: { tenantId: tenantMbg.id, employeeTypeId: typeKantor.id, name: "Jadwal " + day.name, dayOfWeek: day.dayOfWeek, isWorkDay: day.isWorkDay, startTime: day.isWorkDay ? "08:00" : null, endTime: day.isWorkDay ? "17:00" : null }
    });
  }

  // SATPAM
  const typeSatpam = await prisma.employeeType.upsert({
    where: { tenantId_code: { tenantId: tenantMbg.id, code: "SATPAM" } },
    update: {},
    create: { tenantId: tenantMbg.id, code: "SATPAM", name: "Satpam (Shift)", description: "Jadwal kerja shift", scheduleType: "SHIFT", isActive: true },
  });
  const satpamShifts = [
    { code: "PAGI", name: "Shift Pagi", startTime: "07:00", endTime: "15:00", isCrossDay: false },
    { code: "SIANG", name: "Shift Siang", startTime: "15:00", endTime: "23:00", isCrossDay: false },
    { code: "MALAM", name: "Shift Malam", startTime: "23:00", endTime: "07:00", isCrossDay: true },
    { code: "24JAM", name: "Piket 24 Jam", startTime: "08:00", endTime: "08:00", isCrossDay: true, is24Hours: true },
  ];
  for (const s of satpamShifts) {
    await prisma.shift.upsert({
      where: { tenantId_code: { tenantId: tenantMbg.id, code: s.code } },
      update: {},
      create: { tenantId: tenantMbg.id, employeeTypeId: typeSatpam.id, code: s.code, name: s.name, startTime: s.startTime, endTime: s.endTime, isCrossDay: s.isCrossDay, is24Hours: s.is24Hours || false, durationMinutes: s.is24Hours ? 1440 : 480 }
    });
  }
  console.log("MBG Employee Types seeded");

  // 5. Sample Employees
  const employees = [
    { email: "ahmad.rizki@mbg.id", nip: "MBG-001", name: "Ahmad Rizki", department: "IT", employeeTypeId: typeKantor.id, position: "Software Engineer" },
    { email: "siti.nurhaliza@mbg.id", nip: "MBG-002", name: "Siti Nurhaliza", department: "HR", employeeTypeId: typeKantor.id, position: "HR Specialist" },
    { email: "budi.santoso@mbg.id", nip: "MBG-003", name: "Budi Santoso", department: "Security", employeeTypeId: typeSatpam.id, position: "Satpam" },
  ];
  for (const emp of employees) {
    const password = await bcrypt.hash("Pegawai@123", 12);
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenantMbg.id, email: emp.email } },
      update: {},
      create: {
        tenantId: tenantMbg.id, email: emp.email, password, role: "EMPLOYEE", isActive: true,
        employee: { create: { tenantId: tenantMbg.id, nip: emp.nip, name: emp.name, department: emp.department, position: emp.position, isActive: true, employeeTypeId: emp.employeeTypeId } },
      },
    });
    console.log("Employee created:", emp.name);
  }

  // 6. Settings
  const settings = [
    { key: "app_name", value: "SAMS - PT. MBG" },
    { key: "timezone", value: "Asia/Jakarta" }, { key: "attendance_radius", value: "100" },
    { key: "office_lat", value: "-6.2088" }, { key: "office_lng", value: "106.8456" },
  ];
  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { tenantId_key: { tenantId: tenantMbg.id, key: setting.key } },
      update: { value: setting.value },
      create: { tenantId: tenantMbg.id, key: setting.key, value: setting.value },
    });
  }
  
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
