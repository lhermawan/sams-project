import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";
import { calcLateMinutes } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const dateParam = searchParams.get("date");
    const statusParam = searchParams.get("status");
    const deptParam = searchParams.get("department");
    const employeeIdParam = searchParams.get("employeeId");

    const where: any = {};

    if (dateParam) {
      const d = new Date(dateParam);
      where.date = { gte: startOfDay(d), lte: endOfDay(d) };
    }

    if (statusParam) {
      where.status = statusParam;
    }

    if (deptParam) {
      where.employee = { ...where.employee, department: { contains: deptParam, mode: "insensitive" } };
    }

    if (employeeIdParam) {
      where.employeeId = employeeIdParam;
    }

    const [records, total, distinctDepts, allEmployees] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true, department: true, nip: true } },
          employeeType: { select: { id: true, name: true, code: true, scheduleType: true } },
          shift: { select: { name: true, startTime: true, toleranceMin: true } },
          handover: { include: { photos: true } },
          periodicReports: { include: { photos: true }, orderBy: { checkpointSequence: "asc" } },
        },
        orderBy: [{ date: "desc" }, { checkInTime: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.attendance.count({ where }),
      prisma.employee.findMany({
        select: { department: true },
        where: { department: { not: "" } },
        distinct: ["department"],
      }),
      prisma.employee.findMany({
        select: { id: true, name: true, nip: true, department: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const formattedRecords = records.map((r) => {
      let lateMinutes = r.lateMinutes || 0;
      if (lateMinutes === 0 && r.checkInTime) {
        const scheduleStart = (r.shift as any)?.startTime || "08:00";
        const toleranceMin = (r.shift as any)?.toleranceMin || 15;
        lateMinutes = calcLateMinutes(new Date(r.checkInTime), scheduleStart, toleranceMin);
      }
      return {
        ...r,
        lateMinutes,
      };
    });

    const departments = Array.from(
      new Set(distinctDepts.map((d) => d.department?.trim()).filter(Boolean))
    ).sort();

    return NextResponse.json({
      records: formattedRecords,
      total,
      page,
      limit,
      departments,
      employees: allEmployees,
    });
  } catch (err) {
    console.error("GET /api/attendance/list:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
