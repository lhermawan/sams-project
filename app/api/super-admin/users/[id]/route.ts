import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hindari menghapus akun sendiri
    if (id === session.user.id) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun Anda sendiri" }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: { employee: true, tenant: true },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Catat ke AuditLog sebelum user dihapus
    await prisma.auditLog.create({
      data: {
        tenantId: userToDelete.tenantId,
        userId: session.user.id,
        action: "DELETE_USER",
        entity: "User",
        entityId: userToDelete.id,
        newData: JSON.stringify({
          email: userToDelete.email,
          role: userToDelete.role,
          employeeName: userToDelete.employee?.name || null,
          tenant: userToDelete.tenant?.name,
        }),
      },
    });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Super Admin delete user error:", error);
    return NextResponse.json({ error: error.message || "Gagal menghapus user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (id === session.user.id && body.isActive === false) {
      return NextResponse.json({ error: "Tidak dapat menonaktifkan akun Anda sendiri" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { employee: true, tenant: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const updateData: any = {};
    if (typeof body.isActive !== "undefined") {
      updateData.isActive = Boolean(body.isActive);
    }

    let passwordToReturn: string | null = null;
    const rawPassword = body.password?.trim();
    if (rawPassword) {
      if (rawPassword.length < 6) {
        return NextResponse.json({ error: "Password terlalu pendek (minimal 6 karakter)" }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(rawPassword, 12);
      passwordToReturn = rawPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { employee: true, tenant: true },
    });

    // Jika isActive diubah dan user ini terhubung ke profil Pegawai (Employee), sinkronkan statusnya
    if (typeof body.isActive !== "undefined" && user.employee) {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: { isActive: Boolean(body.isActive) },
      });
    }

    // Catat ke AuditLog jika reset password
    if (rawPassword) {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: session.user.id,
          action: "RESET_PASSWORD",
          entity: "User",
          entityId: user.id,
          newData: JSON.stringify({
            email: user.email,
            role: user.role,
            resetBy: "SUPER_ADMIN",
            employeeName: user.employee?.name || null,
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      email: updatedUser.email,
      name: updatedUser.employee?.name || updatedUser.email,
      password: passwordToReturn,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
    });
  } catch (error: any) {
    console.error("Super Admin update user error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengupdate user" }, { status: 500 });
  }
}