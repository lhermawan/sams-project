import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const nextAuth = NextAuth({
  trustHost: true,
  useSecureCookies: false,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        impersonationToken: { label: "Impersonation", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantDomain: { label: "Tenant Domain", type: "text" },
      },
      async authorize(credentials, req) {
        // --- IMPERSONATION LOGIC ---
        if ((credentials as any)?.impersonationToken) {
          const { decode } = require("next-auth/jwt");
          try {
            const decoded = await decode({
              token: (credentials as any).impersonationToken as string,
              secret: process.env.NEXTAUTH_SECRET || "default_secret",
              salt: "impersonate",
            });

            if (decoded && decoded.impersonateTenantId) {
              const tenant = await prisma.tenant.findUnique({
                where: { id: decoded.impersonateTenantId as string },
              });

              if (tenant) {
                const realAdmin = await prisma.user.findFirst({
                  where: { tenantId: tenant.id, role: "ADMIN" },
                  include: { employee: true },
                });

                if (realAdmin) {
                  return {
                    id: realAdmin.id,
                    email: realAdmin.email,
                    role: "ADMIN",
                    tenantId: tenant.id,
                    tenantDomain: tenant.subdomain,
                    isActive: true,
                    employeeId: realAdmin.employee?.id || null,
                    department: realAdmin.employee?.department || null,
                    photoUrl: realAdmin.employee?.photoUrl || null,
                    name: realAdmin.employee?.name || `Admin ${tenant.name}`,
                  };
                } else {
                  return {
                    id: "superadmin-impersonator-" + tenant.id,
                    email: "admin@" + tenant.subdomain + ".niskala.id",
                    role: "ADMIN",
                    tenantId: tenant.id,
                    tenantDomain: tenant.subdomain,
                    isActive: true,
                    employeeId: null,
                    department: null,
                    photoUrl: null,
                    name: `Admin ${tenant.name}`,
                  };
                }
              }
            }
          } catch (err) {
            console.error("Impersonation error:", err);
            return null;
          }
          return null;
        }

        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim().toLowerCase();
        const tenantDomain = (credentials.tenantDomain as string)?.trim() || null;

        let user;

        if (tenantDomain === "super-admin" || !tenantDomain) {
          // Super admin login attempt
          user = await prisma.user.findFirst({
            where: { email, role: "SUPER_ADMIN" },
            include: { employee: true, tenant: true },
          });
        } else {
          // Tenant login attempt (case-insensitive for subdomain and email)
          const tenant = await prisma.tenant.findFirst({
            where: {
              OR: [
                { subdomain: tenantDomain },
                { subdomain: { equals: tenantDomain, mode: "insensitive" } },
              ],
            },
          });
          if (!tenant || !tenant.isActive) return null;

          user = await prisma.user.findUnique({
            where: {
              tenantId_email: {
                tenantId: tenant.id,
                email: email,
              },
            },
            include: { employee: true, tenant: true },
          });
        }

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        // Log the login (safe)
        try {
          await prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              action: "LOGIN",
              entity: "User",
              entityId: user.id,
            },
          });
        } catch (logErr) {
          console.error("Audit log error on login:", logErr);
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantDomain: user.tenant?.subdomain || null,
          name: user.employee?.name ?? user.email,
          employeeId: user.employee?.id ?? null,
          department: user.employee?.department ?? null,
          photoUrl: user.employee?.photoUrl ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return new URL(url, baseUrl).toString();
      try {
        const urlObj = new URL(url);
        const baseObj = new URL(baseUrl);
        if (urlObj.origin === baseObj.origin) return url;
        if (urlObj.hostname.endsWith(".localhost") || urlObj.hostname === "localhost") return url;
        if (urlObj.hostname.endsWith(".niskala.id")) return url;
      } catch (e) {
        return baseUrl;
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || "";
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenantDomain = (user as any).tenantDomain;
        token.employeeId = (user as any).employeeId;
        token.department = (user as any).department;
        token.photoUrl = (user as any).photoUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantDomain = token.tenantDomain as string | null;
        session.user.employeeId = token.employeeId as string | null;
        session.user.department = token.department as string | null;
        session.user.photoUrl = token.photoUrl as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;
