import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "15");
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");
    const deptParam = searchParams.get("department");
    const employeeIdParam = searchParams.get("employeeId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const searchParam = searchParams.get("search");

    const isAdmin = session.user.role === "ADMIN";
    const where: any = { tenantId: session.user.tenantId };

    if (!isAdmin) {
      if (!session.user.employeeId) {
        return NextResponse.json({ error: "Data pegawai tidak ditemukan" }, { status: 403 });
      }
      where.employeeId = session.user.employeeId;
    } else {
      if (employeeIdParam) {
        where.employeeId = employeeIdParam;
      }
      if (deptParam) {
        where.employee = { ...where.employee, department: { contains: deptParam } };
      }
    }

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam;
    }

    if (typeParam && typeParam !== "ALL") {
      where.leaveType = typeParam;
    }

    if (startDateParam || endDateParam) {
      if (startDateParam && endDateParam) {
        where.OR = [
          {
            startDate: { lte: endOfDay(new Date(endDateParam)) },
            endDate: { gte: startOfDay(new Date(startDateParam)) },
          },
        ];
      } else if (startDateParam) {
        where.endDate = { gte: startOfDay(new Date(startDateParam)) };
      } else if (endDateParam) {
        where.startDate = { lte: endOfDay(new Date(endDateParam)) };
      }
    }

    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim();
      where.employee = {
        ...where.employee,
        OR: [
          { name: { contains: q } },
          { nip: { contains: q } },
          { department: { contains: q } },
        ],
      };
    }

    const baseWhereForStats: any =
      !isAdmin && session.user.employeeId ? { employeeId: session.user.employeeId } : {};

    const [
      records,
      total,
      statsTotal,
      statsPending,
      statsApproved,
      statsRejected,
      distinctDepts,
      allEmployees,
    ] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              nip: true,
              department: true,
              position: true,
              phone: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.count({ where: baseWhereForStats }),
      prisma.leaveRequest.count({ where: { ...baseWhereForStats, status: "PENDING",
          tenantId: session.user.tenantId
    } }),
      prisma.leaveRequest.count({ where: { ...baseWhereForStats, status: "APPROVED",
          tenantId: session.user.tenantId
    } }),
      prisma.leaveRequest.count({ where: { ...baseWhereForStats, status: "REJECTED",
          tenantId: session.user.tenantId
    } }),
      isAdmin
        ? prisma.employee.findMany({
            select: { department: true },
            where: { department: { not: "" },
                tenantId: session.user.tenantId
            },
            distinct: ["department"],
          })
        : Promise.resolve([]),
      isAdmin
        ? prisma.employee.findMany({
            select: { id: true, name: true, nip: true, department: true },
            where: { isActive: true,
                tenantId: session.user.tenantId
            },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

    const departments = Array.from(
      new Set(distinctDepts.map((d: any) => d.department?.trim()).filter(Boolean))
    ).sort();

    return NextResponse.json({
      records,
      total,
      page,
      limit,
      stats: {
        total: statsTotal,
        pending: statsPending,
        approved: statsApproved,
        rejected: statsRejected,
      },
      departments,
      employees: allEmployees,
    });
  } catch (err) {
    console.error("GET /api/leave error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { leaveType, startDate, endDate, reason, attachmentUrl } = body;
    let employeeId = body.employeeId;

    const isAdmin = session.user.role === "ADMIN";

    if (!isAdmin) {
      employeeId = session.user.employeeId;
    }

    if (!employeeId) {
      return NextResponse.json({ error: "Pegawai wajib ditentukan" }, { status: 400 });
    }

    if (!leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "Jenis izin/cuti, tanggal mulai, tanggal selesai, dan alasan wajib diisi" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json(
        { error: "Tanggal mulai tidak boleh melebihi tanggal selesai" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId,
          tenantId: session.user.tenantId
    },
      include: { user: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Data pegawai tidak ditemukan" }, { status: 404 });
    }

    const newLeave = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType,
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        attachmentUrl: attachmentUrl || null,
        status: "PENDING",
          tenantId: session.user.tenantId
    },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nip: true,
            department: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_LEAVE_REQUEST",
        entity: "LeaveRequest",
        entityId: newLeave.id,
        newData: JSON.stringify({
          employeeName: employee.name,
          leaveType,
          startDate,
          endDate,
          reason,
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
          tenantId: session.user.tenantId
    },
    });

    // Notifikasi
    if (!isAdmin) {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true,
            tenantId: session.user.tenantId
        },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            tenantId: session.user.tenantId,
            userId: admin.id,
            type: "LEAVE_REQUEST",
            title: "Pengajuan Izin/Cuti Baru",
            message: employee.name + " (" + employee.department + ") mengajukan " + leaveType + " mulai " + start.toLocaleDateString("id-ID"),
          })),
        });
      }
    } else {
      await prisma.notification.create({
        data: {
          userId: employee.userId,
          type: "LEAVE_REQUEST",
          title: "Pengajuan Izin/Cuti Didaftarkan",
          message: "Pengajuan " + leaveType + " Anda telah didaftarkan oleh admin untuk periode " + start.toLocaleDateString("id-ID") + " s.d " + end.toLocaleDateString("id-ID"),
            tenantId: session.user.tenantId
        },
      });
    }

    return NextResponse.json({ success: true, record: newLeave }, { status: 201 });
  } catch (err) {
    console.error("POST /api/leave error:", err);
    return NextResponse.json({ error: "Gagal menyimpan pengajuan izin/cuti" }, { status: 500 });
  }
}
