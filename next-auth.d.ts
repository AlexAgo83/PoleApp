import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      schoolId?: string | null;
      isPremium?: boolean;
    };
  }

  interface User {
    role: Role;
    schoolId?: string | null;
    isPremium?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    schoolId?: string | null;
    isPremium?: boolean;
  }
}
