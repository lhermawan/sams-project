import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Root "/" redirects based on role
export default async function RootPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  redirect("/dashboard");
}
