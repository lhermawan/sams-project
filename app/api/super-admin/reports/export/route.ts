import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";
import { id } from "date-fns/locale";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  VALID: "Hadir",
  LATE: "Terlambat",
  ABSENT: "Tidak Hadir",
  PENDING: "Menunggu",
  REJECTED: "Ditolak",
  CORRECTED: "Dikoreksi",
};

async function getReportData(searchParams: URLSearchParams, session: any, reqTenantId: string | null) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const department = searchParams.get("department") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";
  const now = new Date();
  const dateFrom = from ? startOfDay(new Date(from)) : startOfMonth(now);
  const dateTo = to ? endOfDay(new Date(to)) : endOfMonth(now);

  
  const where: any = { date: { gte: dateFrom, lte: dateTo } };
  if (reqTenantId && reqTenantId !== "ALL") {
    where.tenantId = reqTenantId as string;
  }

  if (department) where.employee = { ...where.employee, department: { contains: department } };
  if (employeeId) where.employeeId = employeeId;

  const records = await prisma.attendance.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, nip: true, department: true, position: true } },
      shift: { select: { name: true } },
      tenant: { select: { name: true } },
    },
    orderBy: [{ employee: { name: "asc" } }, { date: "asc" }],
  });

  let targetEmployee: { name: string; nip: string; department: string } | null = null;
  if (employeeId) {
    targetEmployee = await prisma.employee.findFirst({
      where: { 
        id: employeeId,
        ...(reqTenantId !== "ALL" && { tenantId: reqTenantId as string })
      },
      select: { name: true, nip: true, department: true },
    });
  }

  return { records, dateFrom, dateTo, targetEmployee, department };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("type") ?? "excel";
    const reqTenantId = searchParams.get("tenantId") || "ALL";
    const category = searchParams.get("category") || "absensi";
    const now = new Date();
    
    let reqTenantName = "Laporan";
    if (reqTenantId !== "ALL") {
      const t = await prisma.tenant.findUnique({ where: { id: reqTenantId }, select: { name: true } });
      if (t) reqTenantName = t.name;
    }
    
    // ======== EXPORT KINERJA ========
    if (category === "kinerja") {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const dateFrom = from ? startOfDay(new Date(from)) : startOfMonth(now);
      const dateTo = to ? endOfDay(new Date(to)) : endOfMonth(now);
      
      const where: any = {};
      if (reqTenantId !== "ALL") {
        where.tenantId = reqTenantId as string;
      }
      
      // Get all employees matching tenant criteria
      const employees = await prisma.employee.findMany({
        where,
        include: {
          tenant: { select: { name: true } },
          attendances: {
            where: { date: { gte: dateFrom, lte: dateTo } },
            select: { status: true, lateMinutes: true }
          },
          periodicReports: {
            where: { createdAt: { gte: dateFrom, lte: dateTo } },
            select: { id: true }
          },
          handovers: {
            where: { createdAt: { gte: dateFrom, lte: dateTo }, status: "COMPLETED" },
            select: { id: true }
          }
        },
        orderBy: [{ tenantId: 'asc' }, { name: 'asc' }]
      });
      
      // Calculate Kinerja
      const kinerjaRecords = employees.map((emp: any) => {
        const valid = emp.attendances.filter((a: any) => a.status === "VALID").length;
        const late = emp.attendances.filter((a: any) => a.status === "LATE").length;
        const absent = emp.attendances.filter((a: any) => a.status === "ABSENT" || a.status === "REJECTED").length;
        const lateMins = emp.attendances.reduce((acc: number, a: any) => acc + (a.lateMinutes || 0), 0);
        
        const patroli = emp.periodicReports.length;
        const handover = emp.handovers.length;
        
        let score = 100 - (late * 2) - (absent * 5) + (patroli * 0.5) + (handover * 1);
        if (score > 100) score = 100;
        if (score < 0) score = 0;
        
        return { ...emp, valid, late, absent, lateMins, patroli, handover, score: Math.round(score) };
      });
      
      const groupedRecords: Record<string, typeof kinerjaRecords> = {};
      if (reqTenantId === "ALL" && kinerjaRecords.length > 0) {
        kinerjaRecords.forEach((rec: any) => {
          const tName = rec.tenant?.name || "Lainnya";
          if (!groupedRecords[tName]) groupedRecords[tName] = [];
          groupedRecords[tName].push(rec);
        });
      } else {
        const tName = reqTenantName;
        groupedRecords[tName] = kinerjaRecords;
      }

      if (Object.keys(groupedRecords).length === 0) {
        groupedRecords["Laporan Kosong"] = [];
      }

      if (exportType === "excel") {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "SAMS";
        workbook.created = new Date();

        for (const [tName, tRecords] of Object.entries(groupedRecords)) {
          const safeSheetName = tName.replace(/[\\/?*\[\]]/g, "").substring(0, 31) || "Laporan";
          const sheet = workbook.addWorksheet(safeSheetName, {
            pageSetup: { orientation: "landscape", fitToPage: true },
          });

          sheet.mergeCells("A1:K1");
          sheet.getCell("A1").value = "LAPORAN KINERJA PEGAWAI";
          sheet.getCell("A1").font = { bold: true, size: 14 };
          sheet.getCell("A1").alignment = { horizontal: "center" };

          const periodLabel = `${format(dateFrom, "dd MMM yyyy", { locale: id })} - ${format(dateTo, "dd MMM yyyy", { locale: id })}`;
          sheet.mergeCells("A2:K2");
          sheet.getCell("A2").value = `Perusahaan: ${tName} | Periode: ${periodLabel}`;
          sheet.getCell("A2").alignment = { horizontal: "center" };
          sheet.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };

          sheet.addRow([]);

          const headerRow = sheet.addRow([
            "No", "Perusahaan", "ID Pegawai", "Nama Pegawai", "Bagian", 
            "Skor Kinerja", "Hadir", "Terlambat", "Mangkir/Absen", 
            "Laporan Patroli", "Serah Terima (Selesai)"
          ]);
          headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
          headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
          headerRow.alignment = { horizontal: "center", vertical: "middle" };
          headerRow.height = 22;

          sheet.columns = [
            { key: "no", width: 5 },
            { key: "tenant", width: 20 },
            { key: "nip", width: 12 },
            { key: "name", width: 22 },
            { key: "dept", width: 18 },
            { key: "score", width: 15 },
            { key: "valid", width: 10 },
            { key: "late", width: 10 },
            { key: "absent", width: 15 },
            { key: "patroli", width: 15 },
            { key: "handover", width: 22 }
          ];

          tRecords.forEach((rec: any, i) => {
            const row = sheet.addRow([
              i + 1,
              rec.tenant?.name || "-",
              rec.nip,
              rec.name,
              rec.department,
              rec.score,
              rec.valid,
              rec.late,
              rec.absent,
              rec.patroli,
              rec.handover
            ]);

            if (rec.score < 50) {
              row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
            } else if (rec.score < 80) {
              row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFED7AA" } };
            } else {
              row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBBF7D0" } };
            }

            if (i % 2 === 1) {
              row.eachCell((cell) => {
                if (!cell.fill || (cell.fill as any).fgColor?.argb === "FFFFFFFF") {
                  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
                }
              });
            }
            row.alignment = { vertical: "middle" };
          });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `SAMS_Kinerja_${reqTenantId}_${format(dateFrom, "yyyyMMdd")}-${format(dateTo, "yyyyMMdd")}.xlsx`;

        return new NextResponse(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }
      
      if (exportType === "csv") {
        const csvHeader = [
          "No", "Perusahaan", "ID Pegawai", "Nama Pegawai", "Bagian", 
          "Skor Kinerja", "Hadir", "Terlambat", "Mangkir/Absen", 
          "Laporan Patroli", "Serah Terima (Selesai)"
        ].join(",");

        const csvRows = kinerjaRecords.map((rec: any, i) => {
          return [
            i + 1,
            `"${rec.tenant?.name || "-"}"`,
            `"${rec.nip}"`,
            `"${rec.name}"`,
            `"${rec.department}"`,
            rec.score,
            rec.valid,
            rec.late,
            rec.absent,
            rec.patroli,
            rec.handover
          ].join(",");
        });

        const csvString = [csvHeader, ...csvRows].join("\n");
        const filename = `SAMS_Kinerja_${reqTenantId}_${format(dateFrom, "yyyyMMdd")}-${format(dateTo, "yyyyMMdd")}.csv`;

        return new NextResponse(csvString, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }
      
      
      if (exportType === "pdf") {
        if (reqTenantId === "ALL") {
          const zip = new JSZip();
          for (const [tName, tRecords] of Object.entries(groupedRecords)) {
            const safeFileName = tName.replace(/[\\/?*\[\]]/g, "") || "Laporan";
            const doc = new jsPDF();
            doc.text(`Laporan Kinerja - ${tName}`, 14, 15);
            autoTable(doc, {
              startY: 20,
              head: [["No", "ID Pegawai", "Nama", "Bagian", "Skor Kinerja", "Hadir", "Telat", "Mangkir", "Patroli", "Handover"]],
              body: (tRecords as any[]).map((r: any, i: number) => [
                i + 1, r.nip, r.name, r.department, r.score, r.valid, r.late, r.absent, r.patroli, r.handover
              ])
            });
            const buffer = Buffer.from(doc.output("arraybuffer"));
            zip.file(`${safeFileName}.pdf`, buffer);
          }
          const zipContent = await zip.generateAsync({ type: "nodebuffer" });
        const zipBuffer = Buffer.from(zipContent as any);
          return new NextResponse(zipBuffer as any, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="SAMS_Kinerja_All_Tenants.zip"`,
            }
          });
        } else {
          const doc = new jsPDF();
          const tName = Object.keys(groupedRecords)[0] || "Laporan Kinerja";
          const tRecords = groupedRecords[tName] || [];
          doc.text(`Laporan Kinerja - ${tName}`, 14, 15);
          autoTable(doc, {
            startY: 20,
            head: [["No", "ID Pegawai", "Nama", "Bagian", "Skor Kinerja", "Hadir", "Telat", "Mangkir", "Patroli", "Handover"]],
            body: (tRecords as any[]).map((r: any, i: number) => [
              i + 1, r.nip, r.name, r.department, r.score, r.valid, r.late, r.absent, r.patroli, r.handover
            ])
          });
          const buffer = Buffer.from(doc.output("arraybuffer"));
          return new NextResponse(buffer as any, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="SAMS_Kinerja_${reqTenantId}.pdf"`,
            }
          });
        }
      }

    }
    
    // ======== EXPORT ABSENSI ========
    const { records, dateFrom, dateTo, targetEmployee, department } = await getReportData(searchParams, session, reqTenantId);

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

      const groupedRecords: Record<string, typeof records> = {};
      if (reqTenantId === "ALL" && records.length > 0) {
        records.forEach(rec => {
          const tName = (rec as any).tenant?.name || "Lainnya";
          if (!groupedRecords[tName]) groupedRecords[tName] = [];
          groupedRecords[tName].push(rec);
        });
      } else {
        const tName = reqTenantName;
        groupedRecords[tName] = records;
      }
      
      if (Object.keys(groupedRecords).length === 0) {
        groupedRecords["Laporan Kosong"] = [];
      }

      for (const [tName, tRecords] of Object.entries(groupedRecords)) {
          const safeSheetName = tName.replace(/[\\/?*\[\]]/g, "").substring(0, 31) || "Laporan";
          const sheet = workbook.addWorksheet(safeSheetName, {
            pageSetup: { orientation: "landscape", fitToPage: true },
          });

          sheet.mergeCells("A1:M1");
          sheet.getCell("A1").value = titleText;
          sheet.getCell("A1").font = { bold: true, size: 14 };
          sheet.getCell("A1").alignment = { horizontal: "center" };

          sheet.mergeCells("A2:M2");
          sheet.getCell("A2").value = `Perusahaan: ${tName} | Periode: ${periodLabel}`;
          sheet.getCell("A2").alignment = { horizontal: "center" };
          sheet.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };

          sheet.addRow([]);

          const headerRow = sheet.addRow([
            "No", "Perusahaan", "ID Pegawai", "Nama", "Bagian", "Jabatan",
            "Tanggal", "Jam Masuk", "Jam Pulang", "Shift",
            "Status", "Terlambat (mnt)", "Catatan",
          ]);
          headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
          headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
          headerRow.alignment = { horizontal: "center", vertical: "middle" };
          headerRow.height = 22;

          sheet.columns = [
            { key: "no", width: 5 },
            { key: "tenant", width: 20 },
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

          tRecords.forEach((rec, i) => {
            const row = sheet.addRow([
              i + 1,
              (rec as any).tenant?.name || "-",
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

            if (rec.status === "LATE") {
              row.getCell(12).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFED7AA" } };
            }
            if (rec.status === "ABSENT" || rec.status === "REJECTED") {
              row.getCell(12).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
            }

            if (i % 2 === 1) {
              row.eachCell((cell) => {
                if (!cell.fill || (cell.fill as any).fgColor?.argb === "FFFFFFFF") {
                  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
                }
              });
            }

            row.alignment = { vertical: "middle" };
          });

          sheet.addRow([]);
          const summaryHeader = sheet.addRow(["RINGKASAN"]);
          summaryHeader.font = { bold: true };

          const valid = tRecords.filter((r) => r.status === "VALID").length;
          const late = tRecords.filter((r) => r.status === "LATE").length;
          const absent = tRecords.filter((r) => r.status === "ABSENT").length;
          const totalLate = tRecords.reduce((a, r) => a + (r.lateMinutes || 0), 0);

          const todayStr = format(now, "yyyy-MM-dd");
          const weekStart = startOfWeek(now, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);

          const todayLate = tRecords
            .filter((r) => format(new Date(r.date), "yyyy-MM-dd") === todayStr)
            .reduce((a, r) => a + (r.lateMinutes || 0), 0);

          const weeklyLate = tRecords
            .filter((r) => {
              const d = new Date(r.date);
              return d >= weekStart && d <= weekEnd;
            })
            .reduce((a, r) => a + (r.lateMinutes || 0), 0);

          const monthlyLate = tRecords
            .filter((r) => {
              const d = new Date(r.date);
              return d >= monthStart && d <= monthEnd;
            })
            .reduce((a, r) => a + (r.lateMinutes || 0), 0);

          sheet.addRow(["Total Absensi", tRecords.length]);
          sheet.addRow(["Hadir Tepat Waktu", valid]);
          sheet.addRow(["Terlambat", late]);
          sheet.addRow(["Tidak Hadir", absent]);
          sheet.addRow(["Total Menit Keterlambatan (Periode)", `${totalLate} menit`]);
          sheet.addRow(["Keterlambatan Harian (Hari Ini)", `${todayLate} menit`]);
          sheet.addRow(["Keterlambatan Mingguan (Minggu Ini)", `${weeklyLate} menit`]);
          sheet.addRow(["Keterlambatan Bulanan (Bulan Ini)", `${monthlyLate} menit`]);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      let filePrefix = "laporan_absensi_semua";
      if (reqTenantId !== "ALL") {
        filePrefix = `laporan_absensi_${reqTenantId}`;
      }
      const filename = `${filePrefix}_${format(dateFrom, "yyyyMMdd")}-${format(dateTo, "yyyyMMdd")}.xlsx`;

      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (exportType === "csv") {
      const csvHeader = [
        "No",
        "Perusahaan",
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
            (r as any).tenant?.name || "-",
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
      const groupedRecords: Record<string, typeof records> = {};
      if (reqTenantId === "ALL" && records.length > 0) {
        records.forEach((rec: any) => {
          const tName = rec.tenant?.name || "Lainnya";
          if (!groupedRecords[tName]) groupedRecords[tName] = [];
          groupedRecords[tName].push(rec);
        });
      } else {
        const tName = reqTenantName;
        groupedRecords[tName] = records;
      }
      
      if (Object.keys(groupedRecords).length === 0) {
        groupedRecords["Laporan Kosong"] = [];
      }

      if (reqTenantId === "ALL") {
        const zip = new JSZip();
        for (const [tName, tRecords] of Object.entries(groupedRecords)) {
          const safeFileName = tName.replace(/[\\/?*\[\]]/g, "") || "Laporan";
          const doc = new jsPDF({ orientation: "landscape" });
          doc.text(`Laporan Absensi - ${tName}`, 14, 15);
          autoTable(doc, {
            startY: 20,
            head: [["No", "ID Pegawai", "Nama", "Bagian", "Tanggal", "Jam Masuk", "Jam Pulang", "Status", "Telat (mnt)"]],
            body: (tRecords as any[]).map((r: any, i: number) => [
              i + 1, 
              r.employee.nip, 
              r.employee.name, 
              r.employee.department,
              format(new Date(r.date), "dd/MM/yyyy"),
              r.checkInTime ? format(new Date(r.checkInTime), "HH:mm") : "-",
              r.checkOutTime ? format(new Date(r.checkOutTime), "HH:mm") : "-",
              STATUS_LABELS[r.status] ?? r.status,
              r.lateMinutes > 0 ? r.lateMinutes : 0
            ])
          });
          const buffer = Buffer.from(doc.output("arraybuffer"));
          zip.file(`${safeFileName}.pdf`, buffer);
        }
        const zipContent = await zip.generateAsync({ type: "nodebuffer" });
        return new NextResponse(Buffer.from(zipContent as any) as any, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="SAMS_Absensi_All_Tenants.zip"`,
          }
        });
      } else {
        const doc = new jsPDF({ orientation: "landscape" });
        const tName = Object.keys(groupedRecords)[0] || "Laporan Absensi";
        const tRecords = groupedRecords[tName] || [];
        doc.text(`Laporan Absensi - ${tName}`, 14, 15);
        autoTable(doc, {
          startY: 20,
          head: [["No", "ID Pegawai", "Nama", "Bagian", "Tanggal", "Jam Masuk", "Jam Pulang", "Status", "Telat (mnt)"]],
          body: (tRecords as any[]).map((r: any, i: number) => [
            i + 1, 
            r.employee.nip, 
            r.employee.name, 
            r.employee.department,
            format(new Date(r.date), "dd/MM/yyyy"),
            r.checkInTime ? format(new Date(r.checkInTime), "HH:mm") : "-",
            r.checkOutTime ? format(new Date(r.checkOutTime), "HH:mm") : "-",
            STATUS_LABELS[r.status] ?? r.status,
            r.lateMinutes > 0 ? r.lateMinutes : 0
          ])
        });
        const buffer = Buffer.from(doc.output("arraybuffer"));
        return new NextResponse(buffer as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="SAMS_Absensi_${reqTenantId}.pdf"`,
          }
        });
      }
    }

    return NextResponse.json({ error: "Type tidak valid. Gunakan excel atau pdf" }, { status: 400 });
  } catch (err) {
    console.error("GET /api/reports/export:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
