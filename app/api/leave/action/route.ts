import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leaveId, action, adminNotes } = await req.json();

    if (!leaveId || !action) {
      return NextResponse.json({ error: "leaveId dan action wajib diisi" }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
    }

    const existing = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          include: { user: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Data pengajuan tidak ditemukan" }, { status: 404 });
    }

    // Proteksi idempotensi: Jika sudah disetujui atau ditolak, tidak bisa diubah kembali
    if (existing.status !== "PENDING" || existing.approvedAt) {
      return NextResponse.json(
        { error: "Pengajuan izin/cuti ini sudah divalidasi sebelumnya dan tidak dapat diubah lagi" },
        { status: 400 }
      );
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const cleanedNotes = typeof adminNotes === "string" && adminNotes.trim() ? adminNotes.trim() : null;

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: newStatus,
        adminNotes: cleanedNotes,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: action + "_LEAVE_REQUEST",
        entity: "LeaveRequest",
        entityId: leaveId,
        oldData: JSON.stringify({ status: existing.status }),
        newData: JSON.stringify({ status: newStatus, adminNotes: cleanedNotes }),
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    // Notifikasi ke pegawai
    if (existing.employee?.user) {
      const typeLabel = existing.leaveType;
      const title = action === "APPROVE" ? "Pengajuan Izin/Cuti Disetujui" : "Pengajuan Izin/Cuti Ditolak";
      const message =
        action === "APPROVE"
          ? "Pengajuan " + typeLabel + " Anda telah disetujui" + (cleanedNotes ? " (Catatan: " + cleanedNotes + ")" : "")
          : "Pengajuan " + typeLabel + " Anda ditolak" + (cleanedNotes ? " (Alasan: " + cleanedNotes + ")" : "");

      await prisma.notification.create({
        data: {
          userId: existing.employee.user.id,
          type: "LEAVE_STATUS",
          title,
          message,
        },
      });
    }

    return NextResponse.json({ success: true, record: updated });
  } catch (err) {
    console.error("POST /api/leave/action error:", err);
    return NextResponse.json({ error: "Gagal memproses validasi pengajuan" }, { status: 500 });
  }
}
