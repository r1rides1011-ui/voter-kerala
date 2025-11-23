import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getUser } from "@/lib/models/user";
import type { NextAuthOptions } from "next-auth";
import { UAParser } from "ua-parser-js";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },

      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await getUser(credentials.username);
        if (!user) return null;

        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

        // Read user-agent SAFELY (no TS error)
        const uaString = req?.headers?.["user-agent"] ?? "";
        const parser = new UAParser(uaString);
        const device = parser.getResult();

        // Send device + user info to JWT
        return {
          id: user._id!.toString(),
          username: user.username,
          role: user.role,
          device // 🔥 ADD DEVICE HERE (no TS error)
        };
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 60,
    updateAge: 0
  },

  callbacks: {
    // JWT callback
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.device = user.device; // 🔥 device saved
      }
      return token;
    },

    // Session callback
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "admin" | "user";
      session.user.username = token.username as string;

      // 🛡 Device Binding HERE:
      session.user.device = token.device;

      return session;
    }
  },

  pages: {
    signIn: "/login"
  }
};
