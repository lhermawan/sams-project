import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const url = req.nextUrl;
  const { pathname } = url;
  const session = req.auth;
  
  let hostname = req.headers.get("host") || "";
  hostname = hostname.split(":")[0];

  const searchParams = req.nextUrl.searchParams.toString();
  const path = pathname + (searchParams.length > 0 ? "?" + searchParams : "");

  const parts = hostname.split(".");
  let tenant = null;
  
  if (hostname.endsWith("niskala.id")) {
    if (parts.length >= 3 && parts[0] !== "www" && parts[0] !== "app") {
      tenant = parts[0];
    }
  } else if (hostname.endsWith("localhost") || hostname === "127.0.0.1") {
    if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "app" && parts[0] !== "localhost") {
      tenant = parts[0];
    }
  }

  // --- Auth & Role Redirection Logic ---
  const publicRoutes = ["/login", "/impersonate", "/manifest.json", "/manifest.webmanifest", "/sw.js", "/icon.svg", "/favicon.ico"];
  const isPublic = publicRoutes.includes(pathname) || pathname.startsWith("/icons/") || pathname.startsWith("/api/");

  if (isPublic) {
    if (pathname === "/login" && session) {
      const role = session.user?.role;
      if (role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/dashboard", req.url));
      return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin/dashboard" : "/dashboard", req.url));
    }
  } else {
    // Protected route
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = session.user?.role;
    
    if (tenant) {
      // Tenant route validation
      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      const employeeRoutes = ["/dashboard", "/attendance", "/history", "/calendar", "/profile", "/leave"];
      if (employeeRoutes.some((r) => pathname.startsWith(r)) && role !== "EMPLOYEE") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
    } else {
      // Super admin route validation
      if (role !== "SUPER_ADMIN") {
        // If normal user accesses app.niskala.id, redirect to their tenant (if known) or login
        if (session.user.tenantDomain) {
           return NextResponse.redirect(new URL(`http://${session.user.tenantDomain}.niskala.id/dashboard`, req.url));
        }
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  }

  // --- Domain Rewriting Logic ---
  if (tenant) {
    return NextResponse.rewrite(new URL("/" + tenant + path, req.url));
  }

  return NextResponse.rewrite(new URL("/super-admin" + (pathname === "/" ? "/dashboard" : path), req.url));
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)"
  ],
};
