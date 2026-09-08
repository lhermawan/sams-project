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

    const { name, subdomain, adminEmail, adminPassword } = await req.json();

    if (!name || !subdomain || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: "Semua field harus diisi" }, { status: 400 });
    }

    // Check if subdomain already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain: subdomain.toLowerCase().trim() },
    });

    if (existingTenant) {
      return NextResponse.json({ error: "Subdomain sudah digunakan" }, { status: 400 });
    }

    // Note: We don't check globally for adminEmail because emails are scoped per tenant.
    // However, it's good practice to ensure it's not conflicting with SUPER_ADMIN? It shouldn't anyway.

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const newTenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        subdomain: subdomain.toLowerCase().trim(),
        isActive: true,
        users: {
          create: {
            email: adminEmail.trim().toLowerCase(),
            password: hashedPassword,
            role: "ADMIN",
            isActive: true,
          }
        }
      },
      include: {
        users: true,
      }
    });

    return NextResponse.json({ success: true, tenant: newTenant }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create tenant:", error);
    return NextResponse.json({ error: "Gagal membuat tenant" }, { status: 500 });
  }
}
