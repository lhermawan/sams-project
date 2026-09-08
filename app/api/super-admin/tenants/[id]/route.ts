import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((await params).id === "app" || !(await params).id) {
      return NextResponse.json({ error: "Cannot delete system tenant" }, { status: 400 });
    }

    await prisma.tenant.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tenant error:", error);
    return NextResponse.json({ error: "Gagal menghapus tenant" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isActive } = await req.json();

    if ((await params).id === "app") {
      return NextResponse.json({ error: "Cannot modify system tenant" }, { status: 400 });
    }

    await prisma.tenant.update({
      where: { id: (await params).id },
      data: { isActive },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update tenant error:", error);
    return NextResponse.json({ error: "Gagal mengupdate tenant" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, subdomain } = await req.json();

    if ((await params).id === "app") {
      return NextResponse.json({ error: "Cannot modify system tenant" }, { status: 400 });
    }

    if (!name || !subdomain) {
      return NextResponse.json({ error: "Name and subdomain are required" }, { status: 400 });
    }

    // Check if new subdomain conflicts with another tenant
    const existing = await prisma.tenant.findFirst({
      where: {
        subdomain: subdomain.toLowerCase(),
        id: { not: (await params).id }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Subdomain sudah digunakan oleh tenant lain" }, { status: 400 });
    }

    await prisma.tenant.update({
      where: { id: (await params).id },
      data: { name, subdomain: subdomain.toLowerCase() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update tenant error:", error);
    return NextResponse.json({ error: "Gagal mengupdate tenant" }, { status: 500 });
  }
}
