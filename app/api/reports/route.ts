import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const department = searchParams.get("department") ?? "";
    const employeeId = searchParams.get("employeeId") ?? "";

    const now = new Date();
    const dateFrom = from ? startOfDay(new Date(from)) : startOfMonth(now);
    const dateTo = to ? endOfDay(new Date(to)) : endOfMonth(now);

    const where: any = {
      date: { gte: dateFrom, lte: dateTo },
    };
    if (department) where.employee = { ...where.employee, department: { contains: department } };
    if (employeeId) where.employeeId = employeeId;

    const [records, distinctDepts, allEmployees] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true, nip: true, department: true, position: true } },
          shift: { select: { name: true, startTime: true, endTime: true } },
        },
        orderBy: [{ employee: { name: "asc" } }, { date: "asc" }],
      }),
      prisma.employee.findMany({
        select: { department: true },
        where: { department: { not: "" } },
        distinct: ["department"],
      }),
      prisma.employee.findMany({
        select: { id: true, name: true, nip: true, department: true, position: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // ── Summary stats & Late Duration Breakdowns ───────────────────────────
    const todayStr = format(now, "yyyy-MM-dd");
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const totalLateMinutes = records.reduce((a, r) => a + (r.lateMinutes || 0), 0);

    // Keterlambatan Harian: Hari ini
    const todayLateMinutes = records
      .filter((r) => format(new Date(r.date), "yyyy-MM-dd") === todayStr)
      .reduce((a, r) => a + (r.lateMinutes || 0), 0);

    // Keterlambatan Mingguan: Minggu ini (Senin - Minggu)
    const weeklyLateMinutes = records
      .filter((r) => {
        const d = new Date(r.date);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((a, r) => a + (r.lateMinutes || 0), 0);

    // Keterlambatan Bulanan: Bulan ini
    const monthlyLateMinutes = records
      .filter((r) => {
        const d = new Date(r.date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((a, r) => a + (r.lateMinutes || 0), 0);

    const summary = {
      total: records.length,
      valid: records.filter((r) => r.status === "VALID").length,
      late: records.filter((r) => r.status === "LATE").length,
      absent: records.filter((r) => r.status === "ABSENT").length,
      pending: records.filter((r) => r.status === "PENDING").length,
      totalLateMinutes,
      todayLateMinutes,
      weeklyLateMinutes,
      monthlyLateMinutes,
    };

    const departments = Array.from(
      new Set(distinctDepts.map((d) => d.department?.trim()).filter(Boolean))
    ).sort();

    return NextResponse.json({
      records,
      summary,
      departments,
      employees: allEmployees,
      from: dateFrom,
      to: dateTo,
    });
  } catch (err) {
    console.error("GET /api/reports:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
