import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      roles: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    organizationId: string;
    roles: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    organizationId?: string;
    roles?: string[];
  }
}
