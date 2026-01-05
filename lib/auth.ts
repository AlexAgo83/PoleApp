import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "./prisma";
import { defaultHomeForRole } from "./rbac";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authorizeCredentials(credentials: unknown) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
      schoolId: true,
      isPremium: true,
      credits: true,
      verifiedAt: true,
      disabledAt: true,
    },
  });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  if (user.disabledAt) {
    throw new Error("Compte désactivé, contactez l’admin.");
  }
  if (!user.verifiedAt) {
    throw new Error("Compte non vérifié, consulte ton email ou renvoie un mail de vérification.");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: user.role,
    schoolId: user.schoolId,
    isPremium: user.isPremium,
    credits: user.credits,
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authorizeCredentials(credentials);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as Role;
        token.schoolId = user.schoolId;
        token.isPremium = user.isPremium;
        const userWithCredits = user as { credits?: number };
        token.credits = userWithCredits.credits ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role;
        session.user.schoolId = token.schoolId as string | null | undefined;
        session.user.isPremium = Boolean(token.isPremium);
        session.user.id = token.sub ?? "";
        session.user.credits = Number(token.credits ?? 0);
      }
      return session;
    },
    async redirect({ baseUrl, url }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user }) {
      // Placeholder for audit/logging later.
      console.info("User signed in", { userId: user.id, role: user.role });
    },
  },
};

export function homeForUserRole(role?: Role | null) {
  return defaultHomeForRole(role);
}
