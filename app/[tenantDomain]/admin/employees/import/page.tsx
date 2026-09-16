import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImportEmployeesClient from "./ImportEmployeesClient";

export default async function ImportEmployeesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <ImportEmployeesClient />
      </div>
    </div>
  );
}
