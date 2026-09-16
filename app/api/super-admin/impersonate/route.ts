import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

    return NextResponse.json({ token });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
