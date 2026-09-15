import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find employees whose email does not end with exactly @5758inc.id
    const employees = await prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        NOT: {
          email: {
            endsWith: "@5758inc.id"
          }
        }
      }
    });

    let updatedCount = 0;

    for (const emp of employees) {
      const parts = emp.email.split("@");
      let baseUsername = parts[0];
      if (!baseUsername) continue;
      
      baseUsername = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);
      if (!baseUsername) baseUsername = "user";

      let newEmail = `${baseUsername}@5758inc.id`;
      let counter = 1;

      // Ensure uniqueness globally or within tenant?
      // Actually, since tenantId and email is a unique constraint, let's check within tenant
      while (await prisma.user.findUnique({ where: { tenantId_email: { tenantId: emp.tenantId, email: newEmail } } })) {
        newEmail = `${baseUsername}${counter}@5758inc.id`;
        counter++;
      }

      await prisma.user.update({
        where: { id: emp.id },
        data: { email: newEmail }
      });
      updatedCount++;
    }

    return NextResponse.json({ success: true, count: updatedCount });
  } catch (error: any) {
    console.error("Normalize emails error:", error);
    return NextResponse.json({ error: "Gagal menormalisasi email" }, { status: 500 });
  }
}
