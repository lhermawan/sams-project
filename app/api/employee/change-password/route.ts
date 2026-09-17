import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Password saat ini, password baru, dan konfirmasi password wajib diisi." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password baru minimal 6 karakter." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Konfirmasi password baru tidak cocok dengan password baru." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Akun pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    // Verifikasi password saat ini
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Password saat ini yang Anda masukkan salah." },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Password baru tidak boleh sama dengan password saat ini." },
        { status: 400 }
      );
    }

    // Hash password baru dan update
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Catat Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: "CHANGE_PASSWORD",
          entity: "User",
          entityId: user.id,
        },
      });
    } catch (auditErr) {
      console.error("Audit log change password error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Password berhasil diubah. Silakan gunakan password baru pada login berikutnya.",
    });
  } catch (error: any) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan server saat mengganti password." },
      { status: 500 }
    );
  }
}
