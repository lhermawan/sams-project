import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ImportUsersClient from "./ImportUsersClient";

export default async function ImportUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, subdomain: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <ImportUsersClient tenants={tenants} />
      </div>
    </div>
  );
}
