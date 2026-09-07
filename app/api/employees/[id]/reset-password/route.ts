import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee || !employee.user) {
      return NextResponse.json({ error: "Pegawai atau akun tidak ditemukan" }, { status: 404 });
    }

    // Use custom password if provided, or generate a random one
    let passwordToSet = body.newPassword?.trim();
    if (!passwordToSet) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
      let randomSuffix = "";
      for (let i = 0; i < 4; i++) {
        randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      passwordToSet = `Sams@${Math.floor(1000 + Math.random() * 9000)}${randomSuffix}`;
    }

    const hashedPassword = await bcrypt.hash(passwordToSet, 12);

    await prisma.user.update({
      where: { id: employee.userId },
      data: { password: hashedPassword },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "RESET_PASSWORD",
        entity: "Employee",
        entityId: employee.id,
        newData: JSON.stringify({ email: employee.user.email }),
      },
    });

    return NextResponse.json({
      success: true,
      email: employee.user.email,
      name: employee.name,
      password: passwordToSet,
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Gagal mereset password" }, { status: 500 });
  }
}
