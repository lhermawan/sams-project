import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find active attendance
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: session.user.employeeId,
        checkOutTime: null,
      },
      orderBy: { checkInTime: "desc" },
    });

    if (!activeAttendance) {
      return NextResponse.json({ success: true, reports: [] });
    }

    const reports = await prisma.periodicReport.findMany({
      where: {
        attendanceId: activeAttendance.id,
      },
      include: {
        photos: true,
      },
      orderBy: { checkpointSequence: "asc" },
    });

    return NextResponse.json({
      success: true,
      attendanceId: activeAttendance.id,
      reports,
    });
  } catch (err: any) {
    console.error("GET /api/reports/periodic error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
