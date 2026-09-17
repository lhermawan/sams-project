import { createManyNotifications } from "@/lib/notification";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encode } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });

    const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "sams-super-secret-key-2026-production-grade";
    
    // Generate a secure JWT using next-auth/jwt encode valid for 1 hour
    const token = await encode({
      token: { 
        impersonateTenantId: tenantId,
        superAdminId: session.user.id,
      },
      maxAge: 3600,
      salt: "impersonate",
      secret: AUTH_SECRET,
    });
    console.log("[IMPERSONATE] Generated token for tenantId:", tenantId);

    // Notify Super Admins
    try {
      const targetTenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, subdomain: true },
      });

      const superAdmins = await prisma.user.findMany({
        where: { role: "SUPER_ADMIN", isActive: true },
        select: { id: true, tenantId: true },
      });

      if (superAdmins.length > 0) {
        await createManyNotifications({
          data: superAdmins.map((sa) => ({
            tenantId: sa.tenantId,
            userId: sa.id,
            type: "SECURITY_ALERT",
            title: "Aktivitas Impersonasi Akun",
            message: `Super Admin (${session.user.name || session.user.email || "Admin"}) memulai sesi impersonasi ke mitra "${targetTenant?.name || tenantId}".`,
            data: JSON.stringify({ url: "/super-admin/dashboard" }),
          })),
        });
      }
    } catch (notifErr) {
      console.warn("Gagal membuat notifikasi impersonate:", notifErr);
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
