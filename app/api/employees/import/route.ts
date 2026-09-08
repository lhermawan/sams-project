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

    // Pre-hash standard default password once to optimize bulk import of thousands of rows
    const DEFAULT_PASS = "Pegawai@123";
    const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASS, 10);
    const passwordCache = new Map<string, string>();
    passwordCache.set(DEFAULT_PASS, defaultPasswordHash);

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
          let name = (row.name || row["Nama Lengkap"] || row["nama"] || "").trim();
          let nip = (row.nip || row["NIP"] || "").toString().trim();
          let email = (row.email || row["Email"] || "").trim();
          let password = (row.password || row["Password"] || DEFAULT_PASS).trim();
          let department = (row.department || row["Bagian"] || row["Departemen"] || "Umum").trim();
          let position = (row.position || row["Jabatan"] || "Staff").trim();
          let phone = (row.phone || row["Nomor Telepon"] || row["No HP"] || row["Telepon"] || "").toString().trim();
          let address = (row.address || row["Alamat"] || "").trim();

          // Graceful fallback for empty fields so zero rows are blocked
          if (!name) name = `Pegawai ${rowIdx}`;
          if (!nip) nip = `EMP${Date.now().toString().slice(-4)}${rowIdx}`;
          if (!email) email = `${nip.toLowerCase().replace(/[^a-z0-9]/g, "")}@sams.id`;

          // Hash password efficiently
          let hashedPassword = passwordCache.get(password);
          if (!hashedPassword) {
            hashedPassword = await bcrypt.hash(password, 10);
            passwordCache.set(password, hashedPassword);
          }

          // Check if employee with NIP already exists
          const existingEmployee = await prisma.employee.findFirst({
            where: { nip,
                tenantId: session.user.tenantId
            },
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
                  tenantId: session.user.tenantId
            },
            });
            updatedCount++;
          } else {
            // Check email uniqueness
            let finalEmail = email;
            const existingUser = await prisma.user.findFirst({
              where: { email: finalEmail,
                  tenantId: session.user.tenantId
            },
            });
            if (existingUser) {
              const [local, dom] = email.includes("@") ? email.split("@") : [email, "sams.id"];
              finalEmail = `${local}_${Date.now().toString().slice(-4)}@${dom}`;
            }

            await prisma.user.create({
              data: {
                email: finalEmail,
                password: hashedPassword,
                role: "EMPLOYEE",
                isActive: true,
                employee: {
                  create: {
                    nip,
                    name,
                    department,
                    position,
                    phone: phone || null,
                    address: address || null,
                    isActive: true,
                    tenantId: session.user.tenantId,
                  },
                },
                  tenantId: session.user.tenantId
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