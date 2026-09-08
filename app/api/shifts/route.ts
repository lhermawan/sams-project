import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({error:"Unauthorized"}, {status:401});

  try {
    const shifts = await prisma.shift.findMany({
      include: {
        _count: { select: { employeeShifts: { where: { isActive: true } } } },
      },
      orderBy: { name: "asc" },
        where: { tenantId: session.user.tenantId }
    });
    return NextResponse.json(shifts);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({error:"Unauthorized"}, {status:401});

  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { name, code, startTime, endTime, isCrossDay, toleranceMin } = body;

    if (!name || !code || !startTime || !endTime) {
      return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
    }

    const existing = await prisma.shift.findFirst({ where: { code,
        tenantId: session.user.tenantId
    } });
    if (existing) {
      return NextResponse.json({ error: "Kode shift sudah digunakan" }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        name,
        code: code.toUpperCase(),
        startTime,
        endTime,
        isCrossDay: isCrossDay ?? false,
        toleranceMin: toleranceMin ?? 15,
        isActive: true,
          tenantId: session.user.tenantId
    },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_SHIFT",
        entity: "Shift",
        entityId: shift.id,
        newData: JSON.stringify(body),
          tenantId: session.user.tenantId
    },
    });

    return NextResponse.json({ success: true, shift }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
