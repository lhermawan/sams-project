import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, password, tenantId, role, name, nip, department, position, employeeTypeId } = body;

    if (!email || !password || !tenantId) {
      return NextResponse.json({ error: "Email, password, and tenant are required" }, { status: 400 });
    }

    if (role === "EMPLOYEE") {
      if (!name || !nip || !department || !position || !employeeTypeId) {
        return NextResponse.json({ error: "Semua data profil pegawai wajib diisi" }, { status: 400 });
      }
    }

    // Check if user already exists in this tenant
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: email.trim().toLowerCase() } }
    });

    if (existing) {
      return NextResponse.json({ error: "Email/Username sudah digunakan di mitra ini" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;
    if (role === "EMPLOYEE") {
      user = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          tenantId,
          role: "EMPLOYEE",
          isActive: true,
          employee: {
            create: {
              name,
              nip,
              department,
              position,
              employeeTypeId,
              isActive: true,
            }
          }
        }
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          tenantId,
          role: role || "ADMIN",
          isActive: true,
        }
      });
    }

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}
