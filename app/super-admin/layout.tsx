import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Building2, LogOut, Settings, Users } from "lucide-react";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-indigo-600">
            <Building2 className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight">SAMS Hub</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-medium text-sm">
            <Building2 className="w-5 h-5" />
            Tenants
          </Link>
          <Link href="/users" className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium text-sm">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium text-sm opacity-50 cursor-not-allowed">
            <Settings className="w-5 h-5" />
            Global Settings
          </Link>
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Super Admin</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <form action="/api/auth/signout" method="POST">
             <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium text-sm transition-colors">
               <LogOut className="w-5 h-5" />
               Log Out
             </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden bg-white h-16 border-b border-gray-200 flex items-center px-4 justify-between">
           <div className="flex items-center gap-2 text-indigo-600">
            <Building2 className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight">SAMS Hub</span>
          </div>
          <form action="/api/auth/signout" method="POST">
             <button type="submit" className="p-2 text-red-600">
               <LogOut className="w-5 h-5" />
             </button>
          </form>
        </header>
        {children}
      </main>
    </div>
  );
}
