import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const employees = body.employees;

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { error: "Data pegawai tidak ditemukan dalam berkas" },
        { status: 400 }
      );
    }

    // Fetch employee types to map Kode Jenis Pegawai
    const employeeTypes = await prisma.employeeType.findMany({
      where: { tenantId: session.user.tenantId }
    });
    const employeeTypeMap = new Map(employeeTypes.map(et => [et.code.toLowerCase(), et.id]));

    // Pre-hash standard default password once to optimize bulk import of thousands of rows
    const DEFAULT_PASS = "Pegawai@123";
    const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASS, 10);

    let insertedCount = 0;
    let updatedCount = 0;
    const errors: Array<{ row: number; nip?: string; error: string }> = [];

    // Process in batches of 50 to maintain fast database execution
    const batchSize = 50;
    for (let i = 0; i < employees.length; i += batchSize) {
      const batch = employees.slice(i, i + batchSize);

      for (let j = 0; j < batch.length; j++) {
        const rowIdx = i + j + 1;
        const row = batch[j];

        try {
          const name = row["Nama Lengkap"]?.trim();
          const nip = row["NIP"]?.toString().trim();
          const department = row["Bagian"]?.trim() || "Umum";
          const position = row["Jabatan"]?.trim() || "Staff";
          const typeCode = row["Kode Jenis Pegawai"]?.trim().toLowerCase();
          const phone = row["Nomor Telepon"]?.toString().trim() || null;
          const address = row["Alamat"]?.trim() || null;

          if (!name || !nip) continue;

          const employeeTypeId = typeCode ? (employeeTypeMap.get(typeCode) || null) : null;

          // Check if employee with NIP already exists
          const existingEmployee = await prisma.employee.findFirst({
            where: { nip, tenantId: session.user.tenantId },
            include: { user: true },
          });

          if (existingEmployee) {
            // Update existing employee data
            await prisma.employee.update({
              where: { tenantId_nip: { tenantId: session.user.tenantId, nip } },
              data: {
                name,
                department,
                position,
                phone: phone || existingEmployee.phone,
                address: address || existingEmployee.address,
                employeeTypeId: employeeTypeId || existingEmployee.employeeTypeId,
              },
            });
            updatedCount++;
          } else {
            // Generate base username
            const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);
            let username = `${baseUsername}@5758inc.id`;
            let counter = 1;

            // Make sure email is unique in this tenant
            while (await prisma.user.findUnique({ where: { tenantId_email: { tenantId: session.user.tenantId, email: username } } })) {
              username = `${baseUsername}${counter}@5758inc.id`;
              counter++;
            }

            await prisma.user.create({
              data: {
                email: username,
                password: defaultPasswordHash,
                role: "EMPLOYEE",
                isActive: true,
                tenantId: session.user.tenantId,
                employee: {
                  create: {
                    nip,
                    name,
                    department,
                    position,
                    phone,
                    address,
                    employeeTypeId,
                    isActive: true,
                    tenantId: session.user.tenantId,
                  },
                },
              },
            });
            insertedCount++;
          }
        } catch (err: any) {
          console.error(`Import error row ${rowIdx}:`, err);
          errors.push({ row: rowIdx, nip: row.nip, error: err.message || "Gagal simpan" });
        }
      }
    }

    // Log audit
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "BULK_IMPORT_EMPLOYEES",
          entity: "Employee",
          entityId: "bulk",
          newData: JSON.stringify({ insertedCount, updatedCount, total: employees.length }),
          ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
            tenantId: session.user.tenantId
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      insertedCount,
      updatedCount,
      totalProcessed: employees.length,
      errors,
    });
  } catch (err: any) {
    console.error("POST /api/employees/import error:", err);
    return NextResponse.json({ error: "Gagal memproses import data" }, { status: 500 });
  }
}