import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import NewUserForm from "./NewUserForm";

export default async function NewUserPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  // Get active tenants for dropdown
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, subdomain: { not: "app" } },
    select: { id: true, name: true, subdomain: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <NewUserForm tenants={tenants} />
      </div>
    </div>
  );
}
