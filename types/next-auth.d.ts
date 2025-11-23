import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    username: string;
    role: "admin" | "user";
    device?: any;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: "admin" | "user";
      device?: any;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "admin" | "user";
    device?: any;
  }
}
