import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import BottomNav from "@/components/employee/BottomNav";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || session.user.role !== "EMPLOYEE") {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">
        {/* Main content with bottom padding for nav */}
        <main className="pb-20">{children}</main>
        <BottomNav />
      </div>
    </SessionProvider>
  );
}
