import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

// GET single employee
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const employee = await prisma.employee.findFirst({
      where: { id,
          tenantId: session.user.tenantId
    },
      include: {
        user: { select: { email: true, isActive: true } },
        employeeType: { select: { id: true, code: true, name: true } },
        employeeShifts: { include: { shift: true }, where: { isActive: true } },
      },
    });

    if (!employee) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(employee);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT — update employee
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, nip, department, position, phone, address, isActive, email, employeeTypeId } = body;

    const employee = await prisma.employee.findFirst({
      where: { id,
          tenantId: session.user.tenantId
    },
      include: { user: true },
    });
    if (!employee) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    // Validate NIP uniqueness if changed
    if (nip && nip !== employee.nip) {
      const existingNip = await prisma.employee.findFirst({
        where: { nip, NOT: { id },
            tenantId: session.user.tenantId
        },
      });
      if (existingNip) {
        return NextResponse.json({ error: "ID Pegawai sudah digunakan oleh pegawai lain" }, { status: 400 });
      }
    }

    // Validate Email uniqueness if changed
    if (email && email !== employee.user.email) {
      const existingUser = await prisma.user.findFirst({
        where: { email, NOT: { id: employee.userId },
            tenantId: session.user.tenantId
        },
      });
      if (existingUser) {
        return NextResponse.json({ error: "Email sudah digunakan oleh akun lain" }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: employee.userId,
            tenantId: session.user.tenantId
        },
        data: { email,
            tenantId: session.user.tenantId
        },
      });
    }

    const updated = await prisma.employee.update({
      where: { id,
          tenantId: session.user.tenantId
    },
      data: {
        name,
        nip: nip ?? employee.nip,
        department,
        position,
        phone,
        address,
        isActive: typeof isActive !== "undefined" ? isActive : employee.isActive,
        employeeTypeId: typeof employeeTypeId !== "undefined" ? (employeeTypeId || null) : employee.employeeTypeId,
          tenantId: session.user.tenantId
    },
    });

    // Update user active status if changed
    if (typeof isActive !== "undefined") {
      await prisma.user.update({
        where: { id: employee.userId,
            tenantId: session.user.tenantId
        },
        data: { isActive,
            tenantId: session.user.tenantId
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_EMPLOYEE",
        entity: "Employee",
        entityId: employee.id,
        newData: JSON.stringify({
          name: updated.name,
          nip: updated.nip,
          department: updated.department,
          position: updated.position,
          isActive: updated.isActive,
        }),
          tenantId: session.user.tenantId
    },
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error: " + (err.message ?? "") }, { status: 500 });
  }
}

// DELETE — deactivate (soft delete) or permanent delete
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";

    const employee = await prisma.employee.findFirst({
      where: { id,
          tenantId: session.user.tenantId
    },
      include: { user: true },
    });
    if (!employee) return NextResponse.json({ error: "Pegawai tidak ditemukan" }, { status: 404 });

    if (permanent) {
      await prisma.$transaction([
        prisma.attendance.deleteMany({ where: { employeeId: id,
            tenantId: session.user.tenantId
        } }),
        prisma.employeeShift.deleteMany({ where: { employeeId: id,
            tenantId: session.user.tenantId
        } }),
        prisma.leaveRequest.deleteMany({ where: { employeeId: id,
            tenantId: session.user.tenantId
        } }),
        prisma.employee.delete({ where: { id,
            tenantId: session.user.tenantId
        } }),
        prisma.user.delete({ where: { id: employee.userId,
            tenantId: session.user.tenantId
        } }),
      ]);

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_EMPLOYEE_PERMANENT",
          entity: "Employee",
          entityId: id,
          newData: JSON.stringify({ name: employee.name, nip: employee.nip }),
            tenantId: session.user.tenantId
        },
      });

      return NextResponse.json({ success: true, permanent: true });
    } else {
      await prisma.$transaction([
        prisma.employee.update({ where: { id,
            tenantId: session.user.tenantId
        }, data: { isActive: false,
            tenantId: session.user.tenantId
        } }),
        prisma.user.update({ where: { id: employee.userId,
            tenantId: session.user.tenantId
        }, data: { isActive: false,
            tenantId: session.user.tenantId
        } }),
      ]);

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DEACTIVATE_EMPLOYEE",
          entity: "Employee",
          entityId: id,
          newData: JSON.stringify({ name: employee.name, isActive: false }),
            tenantId: session.user.tenantId
        },
      });

      return NextResponse.json({ success: true, permanent: false });
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal menghapus pegawai: " + (err.message ?? "Server error") }, { status: 500 });
  }
}
