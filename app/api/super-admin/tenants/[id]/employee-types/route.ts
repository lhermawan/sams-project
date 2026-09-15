import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = params.id;

    const employeeTypes = await prisma.employeeType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true }
    });

    return NextResponse.json({ employeeTypes });
  } catch (error: any) {
    console.error("Fetch employee types error:", error);
    return NextResponse.json({ error: "Failed to fetch employee types" }, { status: 500 });
  }
}
