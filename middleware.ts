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

  let tenant: string | null = null;
  if (hostname.endsWith(".niskala.id")) {
    const prefix = hostname.slice(0, -".niskala.id".length);
    if (prefix && prefix !== "www" && prefix !== "app") {
      tenant = prefix;
    }
  } else if (hostname.includes(".localhost") || hostname.endsWith(".localhost")) {
    const prefix = hostname.split(".localhost")[0];
    if (prefix && prefix !== "www" && prefix !== "app" && prefix !== "localhost") {
      tenant = prefix;
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
    // Protected route: requires authentication
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
      // Super admin domain route validation: must be SUPER_ADMIN
      if (role !== "SUPER_ADMIN") {
        if (session.user.tenantDomain) {
          const isLocal = hostname.endsWith("localhost") || hostname === "127.0.0.1";
          const targetHost = isLocal
            ? `${session.user.tenantDomain}.localhost:3000`
            : `${session.user.tenantDomain}.niskala.id`;
          const destPath = session.user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
          return NextResponse.redirect(new URL(`http://${targetHost}${destPath}`, req.url));
        }
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  }

  // --- Domain Rewriting Logic ---
  if (tenant) {
    return NextResponse.rewrite(new URL("/" + tenant + path, req.url));
  }

  if (pathname === "/login") {
    return NextResponse.rewrite(new URL("/app/login", req.url));
  }

  return NextResponse.rewrite(new URL("/super-admin" + (pathname === "/" ? "/dashboard" : path), req.url));
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|uploads|icons|favicon.ico).*)"
  ],
};
