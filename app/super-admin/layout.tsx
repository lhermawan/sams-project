import { SessionProvider } from "next-auth/react";
import SuperAdminLayoutClient from "@/components/super-admin/SuperAdminLayoutClient";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <SuperAdminLayoutClient>{children}</SuperAdminLayoutClient>
    </SessionProvider>
  );
}
