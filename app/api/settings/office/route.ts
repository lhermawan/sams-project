import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const location = await prisma.officeLocation.findFirst({
      where: { isActive: true },
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
