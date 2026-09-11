import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { RAW_EMPLOYEES } from "./raw-data";
import { SEED_CONFIG } from "./config";
import {
  applySwap,
  normalizeUsername,
  parseBirthDate,
  resolveAdminEmail,
  resolveTenantDomain,
  resolveTenantIdentifier,
  TransformedEmployee,
} from "./normalizer";
import { validateSourceData } from "./validator";

export async function runSeed(prisma: PrismaClient) {
  console.log("========================================");
  console.log("STARTING MULTI-TENANT & EMPLOYEE SEED");
  console.log("========================================");

  // 1. Transform raw dataset according to SEED_CONFIG
  const transformedList: TransformedEmployee[] = RAW_EMPLOYEES.map((raw) =>
    applySwap(raw, SEED_CONFIG)
  );

  // 2. Validate transformed source data
  const validation = validateSourceData(transformedList);

  if (validation.warnings.length > 0) {
    console.log("\n--- VALIDATION WARNINGS ---");
    validation.warnings.forEach((w) => console.log(w));
  }

  if (!validation.isValid) {
    console.error("\n--- VALIDATION ERRORS ---");
    validation.errors.forEach((e) => console.error(e));
    throw new Error(
      `Pre-seed validation failed with ${validation.errors.length} error(s). Aborting seed.`
    );
  }

  // 3. Ensure System Tenant ("app") & Super Admin ("super@niskala.id") exist
  const sysTenant = await prisma.tenant.upsert({
    where: { subdomain: "app" },
    update: {},
    create: {
      subdomain: "app",
      name: "System Admin",
      domain: "app.niskala.id",
      isActive: true,
    },
  });

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { tenantId: sysTenant.id, email: "super@niskala.id" },
  });

  if (!existingSuperAdmin) {
    const superAdminPassword = await bcrypt.hash("Super@123", 12);
    await prisma.user.create({
      data: {
        tenantId: sysTenant.id,
        email: "super@niskala.id",
        password: superAdminPassword,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
    console.log("? Super Admin initialized: super@niskala.id");
  }

  // 4. Group employees by finalTenantName
  const tenantGroups = new Map<string, TransformedEmployee[]>();
  for (const item of transformedList) {
    if (!tenantGroups.has(item.finalTenantName)) {
      tenantGroups.set(item.finalTenantName, []);
    }
    tenantGroups.get(item.finalTenantName)!.push(item);
  }

  // Cache default hashed passwords so we don't re-hash in every iteration
  const hashedAdminPassword = await bcrypt.hash("Admin@123", 12);
  const hashedEmployeePassword = await bcrypt.hash("Pegawai@123", 12);

  let tenantsCreatedCount = 0;
  let adminsCreatedCount = 0;
  let employeeTypesCreatedCount = 0;
  let employeesCreatedCount = 0;

  const tenantSummaryList: Array<{
    name: string;
    domain: string;
    adminEmail: string;
    employeeCount: number;
  }> = [];

  // 5. Seed Tenants, Admins, EmployeeTypes, and Employees
  for (const [tenantName, empItems] of tenantGroups.entries()) {
    const tenantIdentifier = resolveTenantIdentifier(tenantName);
    const tenantDomain = resolveTenantDomain(tenantIdentifier);
    const adminEmail = resolveAdminEmail(tenantIdentifier);

    // A. Upsert Tenant
    const tenant = await prisma.tenant.upsert({
      where: { subdomain: tenantIdentifier },
      update: {
        name: tenantName,
        domain: tenantDomain,
        isActive: true,
      },
      create: {
        name: tenantName,
        subdomain: tenantIdentifier,
        domain: tenantDomain,
        isActive: true,
      },
    });
    tenantsCreatedCount++;

    // B. Upsert EmployeeType: SECURITY
    const securityType = await prisma.employeeType.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "SECURITY",
        },
      },
      update: {
        name: "Security / Satpam",
        description: "Pegawai bagian keamanan",
        scheduleType: "SHIFT",
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        code: "SECURITY",
        name: "Security / Satpam",
        description: "Pegawai bagian keamanan",
        scheduleType: "SHIFT",
        isActive: true,
      },
    });
    employeeTypesCreatedCount++;

    // C. Upsert Tenant Admin (do not overwrite existing password if user already exists)
    const existingAdmin = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: adminEmail,
        },
      },
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: adminEmail,
          password: hashedAdminPassword,
          role: "ADMIN",
          isActive: true,
        },
      });
      adminsCreatedCount++;
    } else {
      // Ensure role is ADMIN and active
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: "ADMIN", isActive: true },
      });
      adminsCreatedCount++;
    }

    // D. Seed Employees for this tenant
    const usernameOccurrences = new Map<string, number>();

    for (const item of empItems) {
      const { raw, finalPlacement } = item;
      const baseUsername = normalizeUsername(raw.nama);

      // Suffix duplicate usernames within the same tenant
      const count = usernameOccurrences.get(baseUsername) || 0;
      usernameOccurrences.set(baseUsername, count + 1);

      const finalUsername =
        count > 0 ? `${baseUsername}.${count + 1}` : baseUsername;
      const employeeEmail = `${finalUsername}@${tenantDomain}`;

      // Check or create User for employee
      let user = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email: employeeEmail,
          },
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email: employeeEmail,
            password: hashedEmployeePassword,
            role: "EMPLOYEE",
            isActive: true,
          },
        });
      }

      // Upsert Employee linked to User and Tenant
      const birthDateObj = parseBirthDate(
        raw.tgl_lahir,
        raw.bln_lahir,
        raw.thn_lahir
      );

      await prisma.employee.upsert({
        where: {
          tenantId_nip: {
            tenantId: tenant.id,
            nip: raw.nip,
          },
        },
        update: {
          name: raw.nama,
          nik: raw.nik || null,
          department: "Keamanan",
          position: "Security / Satpam",
          employeeTypeId: securityType.id,
          placement: finalPlacement,
          phone: raw.no_rekening || null,
          address: raw.alamat || null,
          birthPlace: raw.tmpt_lahir || null,
          birthDate: birthDateObj,
          motherName: raw.nama_ibu || null,
          education: raw.lulusan || null,
          gender: raw.jenis_kelamin || null,
          bankAccount: raw.no_rekening || null,
          sourceAccountNumber: raw.no_rekening || null,
          isActive: true,
          userId: user.id,
        },
        create: {
          tenantId: tenant.id,
          nip: raw.nip,
          name: raw.nama,
          nik: raw.nik || null,
          department: "Keamanan",
          position: "Security / Satpam",
          employeeTypeId: securityType.id,
          placement: finalPlacement,
          phone: raw.no_rekening || null,
          address: raw.alamat || null,
          birthPlace: raw.tmpt_lahir || null,
          birthDate: birthDateObj,
          motherName: raw.nama_ibu || null,
          education: raw.lulusan || null,
          gender: raw.jenis_kelamin || null,
          bankAccount: raw.no_rekening || null,
          sourceAccountNumber: raw.no_rekening || null,
          isActive: true,
          userId: user.id,
        },
      });

      employeesCreatedCount++;
    }

    tenantSummaryList.push({
      name: tenantName,
      domain: tenantDomain,
      adminEmail: adminEmail,
      employeeCount: empItems.length,
    });
  }

  // 6. Print Seed Summary
  console.log("\n========================================");
  console.log("SEED SUMMARY");
  console.log("========================================");
  console.log(`Source rows        : ${transformedList.length}`);
  console.log(`Tenants created    : ${tenantsCreatedCount}`);
  console.log(`Admins created     : ${adminsCreatedCount}`);
  console.log(`Employees created  : ${employeesCreatedCount}`);
  console.log(`Employee types     : ${employeeTypesCreatedCount}`);
  console.log(`Swap mode          : ${SEED_CONFIG.swapMode}`);

  console.log("\n----------------------------------------");
  console.log("TENANTS");
  console.log("----------------------------------------");
  for (const t of tenantSummaryList) {
    console.log(`\n${t.name}`);
    console.log(`  Domain    : ${t.domain}`);
    console.log(`  Admin     : ${t.adminEmail}`);
    console.log(`  Employees : ${t.employeeCount}`);
  }

  console.log("\n========================================");
  console.log("VALIDATION");
  console.log("========================================");
  console.log(`Duplicate NIP      : ${validation.duplicateNIPCount}`);
  console.log(`Duplicate NIK      : ${validation.duplicateNIKCount}`);
  console.log(`Invalid Birth Date : ${validation.invalidBirthDateCount}`);
  console.log(`Missing Tenant     : ${validation.missingTenantCount}`);
  console.log(`Missing NIP        : ${validation.missingNIPCount}`);
  console.log(`Missing Name       : ${validation.missingNameCount}`);

  console.log("\n========================================");
  console.log("SEED COMPLETED SUCCESSFULLY");
  console.log("========================================");
}
