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

    const secret = process.env.NEXTAUTH_SECRET || "default_secret";
    
    // Generate a secure JWT using next-auth/jwt encode
    const token = await encode({
      token: { 
        impersonateTenantId: tenantId,
        exp: Math.floor(Date.now() / 1000) + 60
      },
      salt: "impersonate",
      secret
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
