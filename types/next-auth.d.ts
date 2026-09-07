import type { NextAuthConfig } from "next-auth";

// Extend the default session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      employeeId: string | null;
      department: string | null;
      photoUrl: string | null;
    };
  }

  interface User {
    role: string;
    employeeId: string | null;
    department: string | null;
    photoUrl: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    employeeId: string | null;
    department: string | null;
    photoUrl: string | null;
  }
}
