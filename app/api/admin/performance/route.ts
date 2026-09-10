import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    let dateFrom = fromParam ? new Date(fromParam) : startOfMonth(new Date());
    let dateTo = toParam ? new Date(toParam) : endOfMonth(new Date());

    if (isNaN(dateFrom.getTime())) dateFrom = startOfMonth(new Date());
    if (isNaN(dateTo.getTime())) dateTo = endOfMonth(new Date());

    // Fix dateTo to include the whole day
    dateTo.setHours(23, 59, 59, 999);

    const employees = await prisma.employee.findMany({
      where: { tenantId },
      include: {
        attendances: {
          where: {
            date: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
        },
        periodicReports: {
          where: {
            scheduledAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
        },
        handovers: {
          where: {
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
        },
      },
    });

    const records = employees.map((emp: any) => {
      let countValid = 0;
      let countLate = 0;
      let countAbsent = 0; // We will treat INCOMPLETE / REJECTED as absent for this metric
      let totalLateMinutes = 0;

      emp.attendances.forEach((att: any) => {
        if (att.status === "VALID") countValid++;
        if (att.status === "LATE") {
          countLate++;
          totalLateMinutes += att.lateMinutes;
        }
        if (["INCOMPLETE", "REJECTED"].includes(att.status)) countAbsent++;
      });

      const countPatroli = emp.periodicReports.filter((pr: any) => pr.status === "SUBMITTED").length;
      const countHandover = emp.handovers.length;

      let score = 100 - (countLate * 2) - (countAbsent * 5) + (countPatroli * 0.5);
      if (score < 0) score = 0;
      if (score > 100) score = 100;

      return {
        id: emp.id,
        nip: emp.nip,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        score: Math.round(score * 10) / 10,
        countValid,
        countLate,
        countAbsent,
        totalLateMinutes,
        countPatroli,
        countHandover,
      };
    });

    // Sort by score desc
    records.sort((a: any, b: any) => b.score - a.score);

    return NextResponse.json({
      dateFrom,
      dateTo,
      records,
    });
  } catch (error: any) {
    console.error("[PERFORMANCE_API]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
