import type { MembershipTier, UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      membershipTier: MembershipTier;
      sellerId: string | null;
      sellerVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    membershipTier: MembershipTier;
    sellerId: string | null;
    sellerVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: UserRole;
    membershipTier?: MembershipTier;
    sellerId?: string | null;
    sellerVerified?: boolean;
  }
}
