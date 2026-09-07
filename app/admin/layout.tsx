import { SessionProvider } from "next-auth/react";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </SessionProvider>
  );
}
