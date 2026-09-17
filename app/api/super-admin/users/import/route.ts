import { createManyNotifications } from "@/lib/notification";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId, data } = await req.json();

    if (!tenantId || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Ambil jenis pegawai untuk tenant ini
    const employeeTypes = await prisma.employeeType.findMany({
      where: { tenantId }
    });

    const employeeTypeMap = new Map(employeeTypes.map(et => [et.code.toLowerCase(), et.id]));
    const defaultPassword = await bcrypt.hash("Pegawai@123", 10);
    
    let successCount = 0;
    
    // Process sequentially to handle username uniqueness safely
    for (const row of data) {
      const name = row["Nama Lengkap"]?.trim();
      const nip = row["NIP"]?.trim();
      const department = row["Bagian"]?.trim();
      const position = row["Jabatan"]?.trim();
      const typeCode = row["Kode Jenis Pegawai"]?.trim().toLowerCase();
      const phone = row["Nomor Telepon"]?.toString().trim();
      const address = row["Alamat"]?.trim();

      if (!name || !nip) continue; // Skip invalid rows

      const employeeTypeId = employeeTypeMap.get(typeCode) || null;

      // Generate base username
      const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);
      let username = `${baseUsername}@5758inc.id`;
      let counter = 1;

      // Make sure email is unique in this tenant
      while (await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email: username } } })) {
        username = `${baseUsername}${counter}@5758inc.id`;
        counter++;
      }

      await prisma.user.create({
        data: {
          email: username,
          password: defaultPassword,
          tenantId,
          role: "EMPLOYEE",
          isActive: true,
          employee: {
            create: {
              name,
              nip,
              department: department || "Umum",
              position: position || "Staff",
              phone: phone || null,
              address: address || null,
              employeeTypeId,
              tenantId,
              isActive: true,
            }
          }
        }
      });
      successCount++;
    }

    // Notify Super Admins
    if (successCount > 0) {
      try {
        const targetTenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true },
        });

        const superAdmins = await prisma.user.findMany({
          where: { role: "SUPER_ADMIN", isActive: true },
          select: { id: true, tenantId: true },
        });

        if (superAdmins.length > 0) {
          await createManyNotifications({
            data: superAdmins.map((sa) => ({
              tenantId: sa.tenantId,
              userId: sa.id,
              type: "BULK_IMPORT_COMPLETED",
              title: "Import Data Pegawai Selesai",
              message: `Berhasil mengimpor ${successCount} data pegawai untuk mitra "${targetTenant?.name || "Mitra"}".`,
              data: JSON.stringify({ url: "/super-admin/users" }),
            })),
          });
        }
      } catch (notifErr) {
        console.warn("Gagal membuat notifikasi bulk import:", notifErr);
      }
    }

    return NextResponse.json({ success: true, count: successCount }, { status: 201 });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Gagal melakukan import data" }, { status: 500 });
  }
}
