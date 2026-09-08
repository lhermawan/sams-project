import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attendanceId, action, adminNotes } = await req.json();
    // action: "APPROVE" | "REJECT" | "CORRECT"

    if (!attendanceId || !action) {
      return NextResponse.json({ error: "attendanceId dan action wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.attendance.findFirst({
      where: { id: attendanceId,
          tenantId: session.user.tenantId
    },
    });
    if (!existing) {
      return NextResponse.json({ error: "Data absensi tidak ditemukan" }, { status: 404 });
    }

    // Allow Admin to validate or update validation decision freely

    const statusMap: Record<string, "VALID" | "REJECTED" | "CORRECTED"> = {
      APPROVE: "VALID",
      REJECT: "REJECTED",
      CORRECT: "CORRECTED",
    };

    const newStatus = statusMap[action];
    if (!newStatus) {
      return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
    }

    const cleanedNotes = typeof adminNotes === "string" && adminNotes.trim() ? adminNotes.trim() : null;

    const updated = await prisma.attendance.update({
      where: { id: attendanceId,
          tenantId: session.user.tenantId
    },
      data: {
        status: newStatus,
        adminNotes: cleanedNotes,
        validatedBy: session.user.id,
        validatedAt: new Date(),
          tenantId: session.user.tenantId
    },
    });

    // Notify employee
    const employee = await prisma.employee.findFirst({
      where: { id: updated.employeeId,
          tenantId: session.user.tenantId
    },
      include: { user: true },
    });

    if (employee) {
      const msgMap: Record<string, string> = {
        APPROVE: `Absensi Anda telah disetujui${cleanedNotes ? ` (Catatan: ${cleanedNotes})` : ""}`,
        REJECT: `Absensi Anda ditolak${cleanedNotes ? ` (Alasan: ${cleanedNotes})` : ""}`,
        CORRECT: `Absensi Anda dikoreksi${cleanedNotes ? ` (Catatan: ${cleanedNotes})` : ""}`,
      };
      await prisma.notification.create({
        data: {
          userId: employee.userId,
          type: "VALIDATION_REQUEST",
          title: action === "APPROVE" ? "Absensi Disetujui" : action === "REJECT" ? "Absensi Ditolak" : "Absensi Dikoreksi",
          message: msgMap[action],
            tenantId: session.user.tenantId
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `${action}_ATTENDANCE`,
        entity: "Attendance",
        entityId: attendanceId,
        oldData: JSON.stringify({ status: existing.status }),
        newData: JSON.stringify({ status: newStatus, adminNotes }),
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
          tenantId: session.user.tenantId
    },
    });

    return NextResponse.json({ success: true, attendance: updated });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
