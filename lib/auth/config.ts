import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Line from "next-auth/providers/line";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { singleSessionAdapter } from "./adapter";
import { isAdminEmail } from "./admin";

// Auth.js v5:Google + LINE Login,database session(單一裝置登入見 adapter.ts)。
// LINE 注意:需在 LINE Developers 申請 email 權限,否則拿不到 email(程式各處已容忍 null)。

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: singleSessionAdapter(PrismaAdapter(prisma)),
  session: { strategy: "database", maxAge: 30 * 24 * 3600 },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Line({
      clientId: process.env.AUTH_LINE_ID,
      clientSecret: process.env.AUTH_LINE_SECRET,
      checks: ["state"],
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.isAdmin = isAdminEmail(user.email);
      return session;
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
});
