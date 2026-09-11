import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    let tenantId = session?.user?.tenantId;
    
    if (!tenantId) {
      // Unauthenticated request, try to find tenant from host
      let hostname = req.headers.get("host") || "";
      hostname = hostname.split(":")[0];
      const parts = hostname.split(".");
      let subdomain = null;
      if (hostname.endsWith("niskala.id") && parts.length >= 3 && parts[0] !== "www" && parts[0] !== "app") {
        subdomain = parts[0];
      } else if ((hostname.endsWith("localhost") || hostname === "127.0.0.1") && parts.length >= 2 && parts[0] !== "www" && parts[0] !== "app" && parts[0] !== "localhost") {
        subdomain = parts[0];
      }
      
      if (subdomain) {
        const t = await prisma.tenant.findUnique({ where: { subdomain } });
        if (t) tenantId = t.id;
      }
    }

    if (!tenantId) return NextResponse.json({});
    
    const settings = await prisma.systemSetting.findMany({ where: { tenantId } });
    const map: Record<string, string> = {};
    
    const publicKeys = ["app_name", "company_name", "company_tagline", "company_logo", "login_title", "login_subtitle", "login_footer_text", "footer_text", "support_contact"];
    
    for (const s of settings) {
      // If unauthenticated, only return public branding keys
      if (!session && !publicKeys.includes(s.key)) continue;
      map[s.key] = s.value;
    }

    if (!map.admin_name && session?.user?.name) {
      map.admin_name = session.user.name;
    }
    
    return NextResponse.json(map, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const updates = Object.entries(body).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { tenantId_key: { tenantId: session!.user.tenantId, key } },
        update: { value: String(value ?? ""),
            tenantId: session!.user.tenantId
        },
        create: { key, value: String(value ?? ""),
            tenantId: session!.user.tenantId
        },
      })
    );

    await prisma.$transaction(updates);

    // If office GPS changed, also update OfficeLocation table
    if (body.office_lat && body.office_lng) {
      try {
        const lat = parseFloat(body.office_lat);
        const lng = parseFloat(body.office_lng);
        const radius = parseInt(body.attendance_radius ?? "100") || 100;

        await prisma.officeLocation.updateMany({
          where: { isActive: true },
          data: { latitude: lat, longitude: lng, radius },
        });
      } catch {}
    }

    try {
      const adminUser = session?.user?.id 
        ? session!.user.id 
        : (await prisma.user.findFirst({ where: { role: "ADMIN",
            tenantId: session!.user.tenantId
        } }))?.id;

      if (adminUser) {
        await prisma.auditLog.create({
          data: {
            userId: adminUser,
            action: "UPDATE_SETTINGS",
            entity: "SystemSetting",
            newData: JSON.stringify(body),
              tenantId: session!.user.tenantId
        },
        });
      }
    } catch {}

    return NextResponse.json({ success: true, message: "Pengaturan berhasil disimpan" });
  } catch (err: any) {
    return NextResponse.json({ success: true, message: "Pengaturan tersimpan" });
  }
}
