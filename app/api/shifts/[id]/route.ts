import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const updated = await prisma.shift.update({
      where: { id },
      data: {
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        isCrossDay: body.isCrossDay,
        toleranceMin: body.toleranceMin,
        isActive: body.isActive,
      },
    });
    return NextResponse.json({ success: true, shift: updated });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET employees assigned to this shift
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const assignments = await prisma.employeeShift.findMany({
      where: { shiftId: id, isActive: true },
      include: { employee: { select: { id: true, name: true, department: true, nip: true } } },
      orderBy: { effectiveFrom: "desc" },
    });
    return NextResponse.json(assignments);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
