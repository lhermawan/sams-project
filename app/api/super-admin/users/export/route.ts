import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || "ALL";

    // Cari nama tenant jika filter mitra spesifik dipilih
    let selectedTenantName = "Semua Mitra";
    if (tenantId !== "ALL") {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, subdomain: true },
      });
      if (tenant) {
        selectedTenantName = tenant.name;
      }
    }

    // Query data user beserta relasi Employee dan Tenant
    const whereClause: any = {};
    if (tenantId !== "ALL") {
      whereClause.tenantId = tenantId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: { id: true, name: true, subdomain: true },
        },
        employee: {
          select: {
            id: true,
            nip: true,
            name: true,
            department: true,
            position: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { tenantId: "asc" },
        { role: "asc" },
        { email: "asc" },
      ],
    });

    // Validasi hash password secara asinkronus (komparasi bcrypt terhadap password default)
    const processedUsers = await Promise.all(
      users.map(async (user) => {
        let passwordStatus = "Sudah Diubah Mandiri";
        try {
          // Cek password default pegawai
          const isPegawaiDefault = await bcrypt.compare("Pegawai@123", user.password);
          if (isPegawaiDefault) {
            passwordStatus = "Pegawai@123";
          } else {
            // Cek password default admin
            const isAdminDefault = await bcrypt.compare("Admin@123", user.password);
            if (isAdminDefault) {
              passwordStatus = "Admin@123";
            }
          }
        } catch {
          passwordStatus = "Sudah Diubah Mandiri";
        }

        return {
          ...user,
          passwordStatus,
        };
      })
    );

    // Buat Dokumen Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "5758 Attendance System";
    workbook.created = new Date();

    const now = new Date();
    const sheetName =
      tenantId === "ALL"
        ? "Semua Pengguna"
        : selectedTenantName.replace(/[\\/?*\[\]]/g, "").substring(0, 31) || "Pengguna";

    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { orientation: "landscape", fitToPage: true },
    });

    // Judul Header Dokumen
    sheet.mergeCells("A1:L1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "DATA PENGGUNA 5758 ATTENDANCE SYSTEM";
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 28;

    // Subjudul Informasi Filter & Tanggal
    sheet.mergeCells("A2:L2");
    const subtitleCell = sheet.getCell("A2");
    subtitleCell.value = `Mitra: ${selectedTenantName} | Tanggal Ekspor: ${format(
      now,
      "dd MMMM yyyy HH:mm",
      { locale: id }
    )} WIB | Total: ${processedUsers.length} Pengguna`;
    subtitleCell.font = { italic: true, size: 10, color: { argb: "FF555555" } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 20;

    sheet.addRow([]); // Spacing baris 3

    // Baris Header Tabel
    const headerRow = sheet.addRow([
      "No",
      "Nama Mitra",
      "Nama Pegawai",
      "NIP / ID",
      "Bagian",
      "Jabatan",
      "Role",
      "Username / Email Login",
      "Password Login",
      "No. Telepon",
      "Status Akun",
      "Tanggal Dibuat",
    ]);

    headerRow.height = 26;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" }, // Blue-700
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    // Setting lebar kolom
    sheet.columns = [
      { key: "no", width: 6 },
      { key: "tenant", width: 22 },
      { key: "name", width: 24 },
      { key: "nip", width: 14 },
      { key: "department", width: 18 },
      { key: "position", width: 18 },
      { key: "role", width: 14 },
      { key: "email", width: 28 },
      { key: "password", width: 22 },
      { key: "phone", width: 16 },
      { key: "status", width: 14 },
      { key: "createdAt", width: 20 },
    ];

    // Mengisi data baris
    processedUsers.forEach((u, idx) => {
      const roleLabel =
        u.role === "SUPER_ADMIN"
          ? "Super Admin"
          : u.role === "ADMIN"
          ? "Admin Mitra"
          : "Pegawai";

      const formattedCreatedAt = u.createdAt
        ? format(new Date(u.createdAt), "dd/MM/yyyy HH:mm", { locale: id })
        : "-";

      const row = sheet.addRow([
        idx + 1,
        u.tenant?.name ?? "Super Admin (Pusat)",
        u.employee?.name ?? (u.role === "SUPER_ADMIN" ? "Super Admin" : "-"),
        u.employee?.nip ?? "-",
        u.employee?.department ?? "-",
        u.employee?.position ?? "-",
        roleLabel,
        u.email,
        u.passwordStatus,
        u.employee?.phone ?? "-",
        u.isActive ? "Aktif" : "Non-Aktif",
        formattedCreatedAt,
      ]);

      row.height = 20;

      // Styling Zebra striping
      const isEven = idx % 2 === 0;
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
      };

      // Alignment per kolom
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(12).alignment = { horizontal: "center", vertical: "middle" };

      // Highlight warna kolom Password
      const passwordCell = row.getCell(9);
      if (u.passwordStatus === "Pegawai@123" || u.passwordStatus === "Admin@123") {
        passwordCell.font = { bold: true, color: { argb: "FFC2410C" } }; // Orange-700
      } else {
        passwordCell.font = { color: { argb: "FF15803D" }, italic: true }; // Green-700
      }

      // Highlight warna kolom Status Akun
      const statusCell = row.getCell(11);
      if (u.isActive) {
        statusCell.font = { bold: true, color: { argb: "FF15803D" } };
      } else {
        statusCell.font = { bold: true, color: { argb: "FFDC2626" } };
      }

      // Border halus pada tiap cell
      for (let col = 1; col <= 12; col++) {
        row.getCell(col).border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeTenantSlug =
      tenantId === "ALL"
        ? "Semua_Mitra"
        : selectedTenantName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
    const filename = `5758_Data_Pengguna_${safeTenantSlug}_${format(
      now,
      "yyyyMMdd_HHmm"
    )}.xlsx`;

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export users error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal mengekspor data pengguna." },
      { status: 500 }
    );
  }
}
