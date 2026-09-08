import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const actionParam = searchParams.get("action");
    const entityParam = searchParams.get("entity");
    const userIdParam = searchParams.get("userId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const searchParam = searchParams.get("search");
    const exportParam = searchParams.get("export");

    const where: any = {};

    if (actionParam && actionParam !== "ALL") {
      where.action = actionParam;
    }

    if (entityParam && entityParam !== "ALL") {
      where.entity = entityParam;
    }

    if (userIdParam && userIdParam !== "ALL") {
      where.userId = userIdParam;
    }

    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) {
        where.createdAt.gte = startOfDay(new Date(startDateParam));
      }
      if (endDateParam) {
        where.createdAt.lte = endOfDay(new Date(endDateParam));
      }
    }

    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim();
      where.OR = [
        { action: { contains: q } },
        { entity: { contains: q } },
        { entityId: { contains: q } },
        { ipAddress: { contains: q } },
        { user: { email: { contains: q } } },
        { user: { employee: { name: { contains: q } } } },
      ];
    }

    // Export CSV jika diminta
    if (exportParam === "csv") {
      const allLogs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              employee: { select: { name: true, department: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3000,
      });

      const csvHeaders = ["Waktu (WIB)", "Pengguna / Email", "Nama Pegawai", "Bagian", "Role", "Aksi", "Entitas", "Target ID", "IP Address", "Data Baru / Catatan"];
      const csvRows = allLogs.map((log) => [
        '"' + new Date(log.createdAt).toLocaleString("id-ID") + '"',
        '"' + (log.user?.email || "Unknown") + '"',
        '"' + (log.user?.employee?.name || "-") + '"',
        '"' + (log.user?.employee?.department || "-") + '"',
        '"' + (log.user?.role || "-") + '"',
        '"' + log.action + '"',
        '"' + (log.entity || "-") + '"',
        '"' + (log.entityId || "-") + '"',
        '"' + (log.ipAddress || "-") + '"',
        '"' + ((log.newData || "")).replace(/"/g, '""') + '"',
      ]);

      const csvContent = "\uFEFF" + [csvHeaders.join(","), ...csvRows.map((r) => r.join(","))].join("\r\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="audit_log_sams_' + Date.now() + '.csv"',
        },
      });
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [
      logs,
      total,
      countToday,
      countAttendance,
      countManagement,
      distinctActions,
      distinctEntities,
      adminUsers,
    ] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              employee: {
                select: {
                  name: true,
                  department: true,
                  nip: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd },
            tenantId: session.user.tenantId
        },
      }),
      prisma.auditLog.count({
        where: {
          action: {
            in: [
              "CHECKIN",
              "CHECKOUT",
              "APPROVE_ATTENDANCE",
              "REJECT_ATTENDANCE",
              "CREATE_LEAVE_REQUEST",
              "APPROVE_LEAVE_REQUEST",
              "REJECT_LEAVE_REQUEST",
            ],
          },
            tenantId: session.user.tenantId
        },
      }),
      prisma.auditLog.count({
        where: {
          action: {
            in: [
              "CREATE_EMPLOYEE",
              "UPDATE_EMPLOYEE",
              "DELETE_EMPLOYEE",
              "IMPORT_EMPLOYEES",
              "UPDATE_SETTINGS",
              "RESET_PASSWORD",
            ],
          },
            tenantId: session.user.tenantId
        },
      }),
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ["action"],
          where: { tenantId: session.user.tenantId }
    }),
      prisma.auditLog.findMany({
        select: { entity: true },
        where: { entity: { not: null },
            tenantId: session.user.tenantId
        },
        distinct: ["entity"],
      }),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          employee: { select: { name: true } },
        },
        orderBy: { email: "asc" },
          where: { tenantId: session.user.tenantId }
    }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      stats: {
        total,
        today: countToday,
        attendance: countAttendance,
        management: countManagement,
      },
      actions: distinctActions.map((a: any) => a.action).filter(Boolean).sort(),
      entities: distinctEntities.map((e: any) => e.entity).filter(Boolean).sort(),
      users: adminUsers,
    });
  } catch (err) {
    console.error("GET /api/audit-log error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
