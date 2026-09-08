import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const types = await prisma.employeeType.findMany({
      include: {
        shifts: true,
        workSchedules: { orderBy: { dayOfWeek: "asc" } },
        rules: { orderBy: { priority: "asc" } },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { createdAt: "asc" },
        where: { tenantId: session.user.tenantId }
    });

    return NextResponse.json({ success: true, data: types });
  } catch (err: any) {
    console.error("GET /api/admin/employee-types error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code, name, description, scheduleType } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "Kode dan Nama Jenis Pegawai wajib diisi." },
        { status: 422 }
      );
    }

    const existing = await prisma.employeeType.findFirst({
      where: { code: code.toUpperCase().trim(),
          tenantId: session.user.tenantId
    },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Kode jenis pegawai '${code}' sudah digunakan.` },
        { status: 400 }
      );
    }

    const newType = await prisma.employeeType.create({
      data: {
        code: code.toUpperCase().trim(),
        name: name.trim(),
        description: description?.trim() || null,
        scheduleType: scheduleType === "SHIFT" ? "SHIFT" : "NON_SHIFT",
        isActive: true,
          tenantId: session.user.tenantId
    },
    });

    // Seed default schedule structure based on type
    if (newType.scheduleType === "NON_SHIFT") {
      const defaultDays = [
        { dayOfWeek: 1, name: "Senin", isWorkDay: true, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 2, name: "Selasa", isWorkDay: true, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 3, name: "Rabu", isWorkDay: true, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 4, name: "Kamis", isWorkDay: true, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 5, name: "Jumat", isWorkDay: true, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 6, name: "Sabtu", isWorkDay: false, startTime: null, endTime: null },
        { dayOfWeek: 7, name: "Minggu", isWorkDay: false, startTime: null, endTime: null },
      ];

      for (const d of defaultDays) {
        await prisma.workSchedule.create({
          data: {
            employeeTypeId: newType.id,
            name: `Jadwal ${d.name}`,
            dayOfWeek: d.dayOfWeek,
            isWorkDay: d.isWorkDay,
            startTime: d.startTime,
            endTime: d.endTime,
              tenantId: session.user.tenantId
        },
        });
      }
    }

    // Seed default Late Rule & Location Rule
    await prisma.attendanceRule.createMany({
      data: [
        {
          employeeTypeId: newType.id,
          ruleType: "LATE_TOLERANCE",
          executionStage: "CHECK_IN",
          priority: 1,
          configuration: JSON.stringify({
            gracePeriodMinutes: 15,
            maxLateMinutes: 60,
            actionOnExceedMax: "ALLOW_FLAG_EXCESSIVE_LATE",
          }),
            tenantId: session.user.tenantId
        },
        {
          employeeTypeId: newType.id,
          ruleType: "LOCATION",
          executionStage: "CHECK_IN",
          priority: 2,
          configuration: JSON.stringify({
            enforceGeofence: true,
            radiusMeters: 100,
          }),
            tenantId: session.user.tenantId
        },
      ],
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_EMPLOYEE_TYPE",
        entity: "EmployeeType",
        entityId: newType.id,
        newData: JSON.stringify(newType),
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
          tenantId: session.user.tenantId
    },
    });

    return NextResponse.json({
      success: true,
      message: "Jenis pegawai berhasil dibuat.",
      data: newType,
    });
  } catch (err: any) {
    console.error("POST /api/admin/employee-types error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
