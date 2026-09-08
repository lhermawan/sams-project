import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import EditTenantForm from "./EditTenantForm";

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id },
  });

  if (!tenant || tenant.subdomain === "app") {
    redirect("/super-admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <EditTenantForm tenant={tenant} />
      </div>
    </div>
  );
}
