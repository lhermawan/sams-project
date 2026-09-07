import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes & PWA assets — always accessible
  const publicRoutes = [
    "/login",
    "/manifest.json",
    "/manifest.webmanifest",
    "/sw.js",
    "/icon.svg",
    "/apple-touch-icon.png",
    "/favicon.ico",
  ];
  if (
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/api/settings") ||
    pathname === "/api/employees/template"
  ) {
    // If already logged in, redirect to appropriate dashboard
    if (pathname === "/login" && session) {
      const role = session.user?.role;
      return NextResponse.redirect(
        new URL(role === "ADMIN" ? "/admin/dashboard" : "/dashboard", req.url)
      );
    }
    return NextResponse.next();
  }

  // Not authenticated — redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session.user?.role;

  // Admin-only routes
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Employee-only routes (root /dashboard, /attendance, /history, /calendar, /profile, /leave)
  const employeeRoutes = ["/dashboard", "/attendance", "/history", "/calendar", "/profile", "/leave"];
  if (employeeRoutes.some((r) => pathname.startsWith(r)) && role !== "EMPLOYEE") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/settings|api/employees/template|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|icon.svg|apple-touch-icon.png|icons|uploads).*)",
  ],
};
