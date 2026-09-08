import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";
import { id } from "date-fns/locale";
import ExcelJS from "exceljs";

const STATUS_LABELS: Record<string, string> = {
  VALID: "Hadir",
  LATE: "Terlambat",
  ABSENT: "Tidak Hadir",
  PENDING: "Menunggu",
  REJECTED: "Ditolak",
  CORRECTED: "Dikoreksi",
};

async function getReportData(searchParams: URLSearchParams, session: any) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const department = searchParams.get("department") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";
  const now = new Date();
  const dateFrom = from ? startOfDay(new Date(from)) : startOfMonth(now);
  const dateTo = to ? endOfDay(new Date(to)) : endOfMonth(now);

  const where: any = { date: { gte: dateFrom, lte: dateTo } };
  if (department) where.employee = { ...where.employee, department: { contains: department } };
  if (employeeId) where.employeeId = employeeId;

  const records = await prisma.attendance.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, nip: true, department: true, position: true } },
      shift: { select: { name: true } },
    },
    orderBy: [{ employee: { name: "asc" } }, { date: "asc" }],
  });

  let targetEmployee: { name: string; nip: string; department: string } | null = null;
  if (employeeId) {
    targetEmployee = await prisma.employee.findFirst({
      where: { id: employeeId,
          tenantId: session.user.tenantId
    },
      select: { name: true, nip: true, department: true },
    });
  }

  return { records, dateFrom, dateTo, targetEmployee, department };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({error:"Unauthorized"}, {status:401});
try {
    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("type") ?? "excel";
    const now = new Date();
    const { records, dateFrom, dateTo, targetEmployee, department } = await getReportData(searchParams, session);

    const periodLabel = `${format(dateFrom, "dd MMM yyyy", { locale: id })} – ${format(dateTo, "dd MMM yyyy", { locale: id })}`;

    let titleText = "LAPORAN ABSENSI PEGAWAI";
    if (targetEmployee) {
      titleText = `LAPORAN ABSENSI: ${targetEmployee.name.toUpperCase()} (${targetEmployee.nip})`;
    } else if (department) {
      titleText = `LAPORAN ABSENSI BAGIAN: ${department.toUpperCase()}`;
    }

    // ── EXCEL Export ────────────────────────────────────────────────────────
    if (exportType === "excel") {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SAMS";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Laporan Absensi", {
        pageSetup: { orientation: "landscape", fitToPage: true },
      });

      // Title
      sheet.mergeCells("A1:I1");
      sheet.getCell("A1").value = titleText;
      sheet.getCell("A1").font = { bold: true, size: 14 };
      sheet.getCell("A1").alignment = { horizontal: "center" };

      sheet.mergeCells("A2:I2");
      sheet.getCell("A2").value = `Periode: ${periodLabel} | Bagian: ${targetEmployee ? targetEmployee.department : (department || "Semua Bagian")}`;
      sheet.getCell("A2").alignment = { horizontal: "center" };
      sheet.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };

      sheet.addRow([]);

      // Headers
      const headerRow = sheet.addRow([
        "No", "ID Pegawai", "Nama", "Bagian", "Jabatan",
        "Tanggal", "Jam Masuk", "Jam Pulang", "Shift",
        "Status", "Terlambat (mnt)", "Catatan",
      ]);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 22;

      sheet.columns = [
        { key: "no", width: 5 },
        { key: "nip", width: 12 },
        { key: "name", width: 22 },
        { key: "dept", width: 18 },
        { key: "pos", width: 18 },
        { key: "date", width: 14 },
        { key: "cin", width: 12 },
        { key: "cout", width: 12 },
        { key: "shift", width: 14 },
        { key: "status", width: 14 },
        { key: "late", width: 14 },
        { key: "notes", width: 24 },
      ];

      // Data rows
      records.forEach((rec, i) => {
        const row = sheet.addRow([
          i + 1,
          rec.employee.nip,
          rec.employee.name,
          rec.employee.department,
          rec.employee.position,
          format(new Date(rec.date), "dd/MM/yyyy"),
          rec.checkInTime ? format(new Date(rec.checkInTime), "HH:mm") : "-",
          rec.checkOutTime ? format(new Date(rec.checkOutTime), "HH:mm") : "-",
          rec.shift?.name ?? "Normal",
          STATUS_LABELS[rec.status] ?? rec.status,
          rec.lateMinutes > 0 ? rec.lateMinutes : 0,
          rec.adminNotes ?? "",
        ]);

        // Color late rows orange
        if (rec.status === "LATE") {
          row.getCell(10).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFED7AA" } };
        }
        // Color absent rows red
        if (rec.status === "ABSENT" || rec.status === "REJECTED") {
          row.getCell(10).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
        }

        // Alternating row background
        if (i % 2 === 1) {
          row.eachCell((cell) => {
            if (!cell.fill || (cell.fill as any).fgColor?.argb === "FFFFFFFF") {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
            }
          });
        }

        row.alignment = { vertical: "middle" };
      });

      // Summary
      sheet.addRow([]);
      const summaryHeader = sheet.addRow(["RINGKASAN"]);
      summaryHeader.font = { bold: true };

      const valid = records.filter((r) => r.status === "VALID").length;
      const late = records.filter((r) => r.status === "LATE").length;
      const absent = records.filter((r) => r.status === "ABSENT").length;
      const totalLate = records.reduce((a, r) => a + (r.lateMinutes || 0), 0);

      const todayStr = format(now, "yyyy-MM-dd");
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const todayLate = records
        .filter((r) => format(new Date(r.date), "yyyy-MM-dd") === todayStr)
        .reduce((a, r) => a + (r.lateMinutes || 0), 0);

      const weeklyLate = records
        .filter((r) => {
          const d = new Date(r.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((a, r) => a + (r.lateMinutes || 0), 0);

      const monthlyLate = records
        .filter((r) => {
          const d = new Date(r.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((a, r) => a + (r.lateMinutes || 0), 0);

      sheet.addRow(["Total Absensi", records.length]);
      sheet.addRow(["Hadir Tepat Waktu", valid]);
      sheet.addRow(["Terlambat", late]);
      sheet.addRow(["Tidak Hadir", absent]);
      sheet.addRow(["Total Menit Keterlambatan (Periode)", `${totalLate} menit`]);
      sheet.addRow(["Keterlambatan Harian (Hari Ini)", `${todayLate} menit`]);
      sheet.addRow(["Keterlambatan Mingguan (Minggu Ini)", `${weeklyLate} menit`]);
      sheet.addRow(["Keterlambatan Bulanan (Bulan Ini)", `${monthlyLate} menit`]);

      const buffer = await workbook.xlsx.writeBuffer();
      let filePrefix = "laporan_absensi_semua";
      if (targetEmployee) {
        filePrefix = `laporan_${targetEmployee.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } else if (department) {
        filePrefix = `laporan_bagian_${department.replace(/[^a-zA-Z0-9]/g, "_")}`;
      }
      const filename = `${filePrefix}_${format(dateFrom, "yyyyMMdd")}-${format(dateTo, "yyyyMMdd")}.xlsx`;

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ── CSV (Spreadsheet) Export ─────────────────────────────────────────────
    if (exportType === "csv") {
      const csvHeader = [
        "No",
        "Tanggal",
        "NIP",
        "Nama Pegawai",
        "Bagian",
        "Jabatan",
        "Shift",
        "Jam Masuk",
        "Jam Pulang",
        "Keterlambatan (menit)",
        "Status",
        "Catatan Admin",
      ];

      const csvRows = [
        csvHeader.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
        ...records.map((r, idx) =>
          [
            idx + 1,
            format(new Date(r.date), "yyyy-MM-dd"),
            r.employee.nip,
            r.employee.name,
            r.employee.department,
            r.employee.position,
            r.shift?.name || "Reguler",
            r.checkInTime ? format(new Date(r.checkInTime), "HH:mm") : "",
            r.checkOutTime ? format(new Date(r.checkOutTime), "HH:mm") : "",
            r.lateMinutes || 0,
            STATUS_LABELS[r.status] || r.status,
            r.adminNotes || "",
          ]
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ];

      const csvContent = "\uFEFF" + csvRows.join("\r\n");
      let filePrefix = "laporan_absensi_spreadsheet";
      if (targetEmployee) {
        filePrefix = `laporan_${targetEmployee.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } else if (department) {
        filePrefix = `laporan_bagian_${department.replace(/[^a-zA-Z0-9]/g, "_")}`;
      }
      const filename = `${filePrefix}_${format(dateFrom, "yyyyMMdd")}-${format(dateTo, "yyyyMMdd")}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ── PDF Export ──────────────────────────────────────────────────────────
    if (exportType === "pdf") {
      const todayStr = format(now, "yyyy-MM-dd");
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const todayLate = records
        .filter((r) => format(new Date(r.date), "yyyy-MM-dd") === todayStr)
        .reduce((a, r) => a + (r.lateMinutes || 0), 0);

      const weeklyLate = records
        .filter((r) => {
          const d = new Date(r.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((a, r) => a + (r.lateMinutes || 0), 0);

      const monthlyLate = records
        .filter((r) => {
          const d = new Date(r.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((a, r) => a + (r.lateMinutes || 0), 0);

      const pdfData = {
        title: titleText,
        period: periodLabel,
        department: targetEmployee
          ? `${targetEmployee.department} (Pegawai: ${targetEmployee.name})`
          : department || "Semua Bagian",
        generatedAt: format(new Date(), "dd MMM yyyy HH:mm", { locale: id }),
        summary: {
          total: records.length,
          valid: records.filter((r) => r.status === "VALID").length,
          late: records.filter((r) => r.status === "LATE").length,
          absent: records.filter((r) => r.status === "ABSENT").length,
          totalLateMinutes: records.reduce((a, r) => a + (r.lateMinutes || 0), 0),
          todayLateMinutes: todayLate,
          weeklyLateMinutes: weeklyLate,
          monthlyLateMinutes: monthlyLate,
        },
        rows: records.map((r, i) => [
          i + 1,
          r.employee.nip,
          r.employee.name,
          r.employee.department,
          format(new Date(r.date), "dd/MM/yyyy"),
          r.checkInTime ? format(new Date(r.checkInTime), "HH:mm") : "-",
          r.checkOutTime ? format(new Date(r.checkOutTime), "HH:mm") : "-",
          STATUS_LABELS[r.status] ?? r.status,
          r.lateMinutes > 0 ? `${r.lateMinutes} mnt` : "-",
        ]),
      };
      return NextResponse.json(pdfData);
    }

    return NextResponse.json({ error: "Type tidak valid. Gunakan excel atau pdf" }, { status: 400 });
  } catch (err) {
    console.error("GET /api/reports/export:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
