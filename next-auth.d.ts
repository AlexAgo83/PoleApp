import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      schoolId?: string | null;
      isPremium?: boolean;
      credits?: number;
    };
  }

  interface User {
    role: Role;
    schoolId?: string | null;
    isPremium?: boolean;
    credits?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    schoolId?: string | null;
    isPremium?: boolean;
    credits?: number;
  }
}
