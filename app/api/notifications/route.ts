import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const where: any = { userId: session.user.id };
    if (unreadOnly) where.isRead = false;
    if (session.user.role !== "SUPER_ADMIN" && session.user.tenantId) {
      where.tenantId = session.user.tenantId;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        ...where,
        isRead: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH — mark as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, markAllRead } = body;

    const baseWhere: any = { userId: session.user.id };
    if (session.user.role !== "SUPER_ADMIN" && session.user.tenantId) {
      baseWhere.tenantId = session.user.tenantId;
    }

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { ...baseWhere, isRead: false },
        data: { isRead: true },
      });
    } else if (id) {
      await prisma.notification.updateMany({
        where: { ...baseWhere, id },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/notifications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
