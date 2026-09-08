import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST — assign employee to shift
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { employeeId, shiftId, effectiveFrom } = await req.json();
    if (!employeeId || !shiftId) {
      return NextResponse.json({ error: "employeeId dan shiftId wajib diisi" }, { status: 400 });
    }

    // Deactivate existing shift for this employee
    await prisma.employeeShift.updateMany({
      where: { employeeId, isActive: true },
      data: { isActive: false, effectiveTo: new Date() },
    });

    const assignment = await prisma.employeeShift.create({
      data: {
        employeeId,
        shiftId,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        isActive: true,
          tenantId: session.user.tenantId
    },
    });

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE — unassign employee from shift
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { assignmentId } = await req.json();
    await prisma.employeeShift.update({
      where: { id: assignmentId,
          tenantId: session.user.tenantId
    },
      data: { isActive: false, effectiveTo: new Date(),
          tenantId: session.user.tenantId
    },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
