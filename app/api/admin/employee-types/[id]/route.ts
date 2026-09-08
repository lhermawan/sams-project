import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const type = await prisma.employeeType.findFirst({
      where: { id,
          tenantId: session.user.tenantId
    },
      include: {
        shifts: true,
        workSchedules: { orderBy: { dayOfWeek: "asc" } },
        rules: { orderBy: { priority: "asc" } },
        _count: { select: { employees: true } },
      },
    });

    if (!type) {
      return NextResponse.json({ error: "Jenis pegawai tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: type });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, scheduleType, isActive } = body;

    const oldType = await prisma.employeeType.findFirst({ where: { id,
        tenantId: session.user.tenantId
    } });
    if (!oldType) {
      return NextResponse.json({ error: "Jenis pegawai tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.employeeType.update({
      where: { id,
          tenantId: session.user.tenantId
    },
      data: {
        name: name ? name.trim() : oldType.name,
        description: description !== undefined ? description : oldType.description,
        scheduleType: scheduleType || oldType.scheduleType,
        isActive: isActive !== undefined ? isActive : oldType.isActive,
          tenantId: session.user.tenantId
    },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_EMPLOYEE_TYPE",
        entity: "EmployeeType",
        entityId: id,
        oldData: JSON.stringify(oldType),
        newData: JSON.stringify(updated),
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
          tenantId: session.user.tenantId
    },
    });

    return NextResponse.json({
      success: true,
      message: "Data jenis pegawai berhasil diperbarui.",
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, payload } = body;

    // 1. UPDATE RULE CONFIGURATION
    if (action === "UPDATE_RULE") {
      const { ruleType, configuration, isActive, executionStage, priority } = payload;
      const rule = await prisma.attendanceRule.upsert({
        where: {
          tenantId_employeeTypeId_ruleType: { tenantId: session.user.tenantId,
            employeeTypeId: id,
            ruleType,
          },
            tenantId: session.user.tenantId
        },
        update: {
          configuration: typeof configuration === "object" ? JSON.stringify(configuration) : configuration,
          isActive: isActive !== undefined ? isActive : true,
          executionStage: executionStage || "CHECK_IN",
          priority: priority ?? 0,
            tenantId: session.user.tenantId
        },
        create: {
          employeeTypeId: id,
          ruleType,
          executionStage: executionStage || "CHECK_IN",
          priority: priority ?? 0,
          configuration: typeof configuration === "object" ? JSON.stringify(configuration) : configuration,
          isActive: isActive !== undefined ? isActive : true,
            tenantId: session.user.tenantId
        },
      });

      return NextResponse.json({ success: true, message: `Rule ${ruleType} berhasil diperbarui.`, data: rule });
    }

    // 2. UPSERT SHIFT FOR THIS EMPLOYEE TYPE
    if (action === "UPSERT_SHIFT") {
      const { shiftId, code, name, startTime, endTime, isCrossDay, is24Hours, durationMinutes, toleranceMin } = payload;
      let shift;
      if (shiftId) {
        shift = await prisma.shift.update({
          where: { id: shiftId,
              tenantId: session.user.tenantId
        },
          data: {
            code,
            name,
            startTime,
            endTime,
            isCrossDay: !!isCrossDay,
            is24Hours: !!is24Hours,
            durationMinutes: durationMinutes ?? 720,
            toleranceMin: toleranceMin ?? 15,
              tenantId: session.user.tenantId
        },
        });
      } else {
        shift = await prisma.shift.create({
          data: {
            employeeTypeId: id,
            code,
            name,
            startTime,
            endTime,
            isCrossDay: !!isCrossDay,
            is24Hours: !!is24Hours,
            durationMinutes: durationMinutes ?? 720,
            toleranceMin: toleranceMin ?? 15,
              tenantId: session.user.tenantId
        },
        });
      }
      return NextResponse.json({ success: true, message: "Shift berhasil disimpan.", data: shift });
    }

    // 3. UPDATE WORK SCHEDULES FOR NON-SHIFT
    if (action === "UPDATE_SCHEDULES") {
      const { schedules } = payload; // array of { id?, dayOfWeek, isWorkDay, startTime, endTime }
      for (const item of schedules) {
        if (item.id) {
          await prisma.workSchedule.update({
            where: { id: item.id,
                tenantId: session.user.tenantId
            },
            data: {
              isWorkDay: item.isWorkDay,
              startTime: item.startTime,
              endTime: item.endTime,
                tenantId: session.user.tenantId
            },
          });
        }
      }
      return NextResponse.json({ success: true, message: "Jadwal harian berhasil diperbarui." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const count = await prisma.employee.count({
      where: { employeeTypeId: id,
          tenantId: session.user.tenantId
    },
    });

    if (count > 0) {
      return NextResponse.json(
        { error: `Tidak dapat menghapus. Masih ada ${count} pegawai terhubung dengan jenis pegawai ini. Nonaktifkan saja jika tidak digunakan.` },
        { status: 400 }
      );
    }

    await prisma.employeeType.delete({
      where: { id,
          tenantId: session.user.tenantId
    },
    });

    return NextResponse.json({ success: true, message: "Jenis pegawai berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
