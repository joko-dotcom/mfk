import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { MembershipTier, UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { seller: true },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          membershipTier: user.membershipTier,
          sellerId: user.seller?.id ?? null,
          sellerVerified: user.seller?.verified ?? false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role: UserRole }).role;
        token.membershipTier = (user as { membershipTier: MembershipTier })
          .membershipTier;
        token.sellerId = (user as { sellerId: string | null }).sellerId;
        token.sellerVerified = (user as { sellerVerified: boolean }).sellerVerified;
      }
      if (trigger === "update" && token.uid) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.uid as string },
          include: { seller: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.membershipTier = fresh.membershipTier;
          token.sellerId = fresh.seller?.id ?? null;
          token.sellerVerified = fresh.seller?.verified ?? false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.uid as string;
        session.user.role = token.role as UserRole;
        session.user.membershipTier = token.membershipTier as MembershipTier;
        session.user.sellerId = (token.sellerId as string | null) ?? null;
        session.user.sellerVerified = Boolean(token.sellerVerified);
      }
      return session;
    },
  },
};
