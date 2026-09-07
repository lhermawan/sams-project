import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET all schedules
export async function GET() {
  try {
    const schedules = await prisma.workSchedule.findMany({
      orderBy: { effectiveFrom: "desc" },
    });
    return NextResponse.json(schedules);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST create schedule
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { name, startTime, endTime, toleranceMin, effectiveFrom, effectiveTo } = body;

    if (!name || !startTime || !endTime || !effectiveFrom) {
      return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
    }

    // Deactivate old active schedules
    if (body.setActive) {
      await prisma.workSchedule.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const schedule = await prisma.workSchedule.create({
      data: {
        name,
        startTime,
        endTime,
        toleranceMin: toleranceMin ?? 15,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive: body.setActive ?? true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_SCHEDULE",
        entity: "WorkSchedule",
        entityId: schedule.id,
        newData: JSON.stringify(body),
      },
    });

    return NextResponse.json({ success: true, schedule }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
