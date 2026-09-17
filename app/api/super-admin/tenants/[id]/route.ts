import { createManyNotifications } from "@/lib/notification";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = (await params).id;
    if (tenantId === "app" || !tenantId) {
      return NextResponse.json({ error: "Cannot delete system tenant" }, { status: 400 });
    }

    const tenantToDelete = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, subdomain: true },
    });

    await prisma.tenant.delete({
      where: { id: tenantId },
    });

    // Notify Super Admins
    try {
      const superAdmins = await prisma.user.findMany({
        where: { role: "SUPER_ADMIN", isActive: true },
        select: { id: true, tenantId: true },
      });
      if (superAdmins.length > 0) {
        await createManyNotifications({
          data: superAdmins.map((sa) => ({
            tenantId: sa.tenantId,
            userId: sa.id,
            type: "TENANT_UPDATED",
            title: "Mitra Dihapus",
            message: `Mitra "${tenantToDelete?.name || tenantId}" (${tenantToDelete?.subdomain || "-"}) telah dihapus dari sistem.`,
            data: JSON.stringify({ url: "/super-admin/dashboard" }),
          })),
        });
      }
    } catch (notifErr) {
      console.warn("Gagal membuat notifikasi delete tenant:", notifErr);
    }

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
    const tenantId = (await params).id;

    if (tenantId === "app") {
      return NextResponse.json({ error: "Cannot modify system tenant" }, { status: 400 });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive },
    });

    // Notify Super Admins
    try {
      const superAdmins = await prisma.user.findMany({
        where: { role: "SUPER_ADMIN", isActive: true },
        select: { id: true, tenantId: true },
      });
      if (superAdmins.length > 0) {
        await createManyNotifications({
          data: superAdmins.map((sa) => ({
            tenantId: sa.tenantId,
            userId: sa.id,
            type: "TENANT_UPDATED",
            title: "Status Mitra Diperbarui",
            message: `Status mitra "${updatedTenant.name}" diubah menjadi ${isActive ? "Aktif" : "Nonaktif"}.`,
            data: JSON.stringify({ url: "/super-admin/dashboard" }),
          })),
        });
      }
    } catch (notifErr) {
      console.warn("Gagal membuat notifikasi status tenant:", notifErr);
    }

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
    const tenantId = (await params).id;

    if (tenantId === "app") {
      return NextResponse.json({ error: "Cannot modify system tenant" }, { status: 400 });
    }

    if (!name || !subdomain) {
      return NextResponse.json({ error: "Name and subdomain are required" }, { status: 400 });
    }

    // Check if new subdomain conflicts with another tenant
    const existing = await prisma.tenant.findFirst({
      where: {
        subdomain: subdomain.toLowerCase(),
        id: { not: tenantId }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Subdomain sudah digunakan oleh tenant lain" }, { status: 400 });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { name, subdomain: subdomain.toLowerCase() },
    });

    // Notify Super Admins
    try {
      const superAdmins = await prisma.user.findMany({
        where: { role: "SUPER_ADMIN", isActive: true },
        select: { id: true, tenantId: true },
      });
      if (superAdmins.length > 0) {
        await createManyNotifications({
          data: superAdmins.map((sa) => ({
            tenantId: sa.tenantId,
            userId: sa.id,
            type: "TENANT_UPDATED",
            title: "Data Mitra Diperbarui",
            message: `Informasi mitra "${updatedTenant.name}" (${updatedTenant.subdomain}) telah diperbarui.`,
            data: JSON.stringify({ url: "/super-admin/dashboard" }),
          })),
        });
      }
    } catch (notifErr) {
      console.warn("Gagal membuat notifikasi update data tenant:", notifErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update tenant error:", error);
    return NextResponse.json({ error: "Gagal mengupdate tenant" }, { status: 500 });
  }
}
