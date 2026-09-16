import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const originalSuperAdminId = (session?.user as any)?.originalSuperAdminId;

    if (!session || !originalSuperAdminId) {
      return NextResponse.json({ error: "No active impersonation session found." }, { status: 400 });
    }

    const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "sams-super-secret-key-2026-production-grade";
    
    // Generate a secure JWT using next-auth/jwt encode valid for 1 hour
    const token = await encode({
      token: { 
        superAdminId: originalSuperAdminId,
      },
      maxAge: 3600,
      salt: "revert",
      secret: AUTH_SECRET,
    });
    console.log("[IMPERSONATE REVERT] Generated token for superAdminId:", originalSuperAdminId);

    return NextResponse.json({ token });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate revert token" }, { status: 500 });
  }
}
