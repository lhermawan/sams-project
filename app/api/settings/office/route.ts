import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({error:"Unauthorized"}, {status:401});

  try {
    const location = await prisma.officeLocation.findFirst({
      where: { isActive: true,
          tenantId: session.user.tenantId
    },
    });

    if (!location) {
      // Return defaults if not configured yet
      return NextResponse.json({
        latitude: -6.2088,
        longitude: 106.8456,
        radius: 100,
        name: "Kantor Pusat",
      });
    }

    return NextResponse.json({
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius,
      name: location.name,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
