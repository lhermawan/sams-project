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

    if (body.isActive) {
      await prisma.workSchedule.updateMany({
        where: { isActive: true, NOT: { id } },
        data: { isActive: false },
      });
    }

    const updated = await prisma.workSchedule.update({
      where: { id },
      data: {
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        toleranceMin: body.toleranceMin,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ success: true, schedule: updated });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await prisma.workSchedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
