import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, plan: user.plan, groups: user.groups };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const g = (user as any).groups || [];
        let p = (user as any).plan || "free";
        if (g.includes("studio")) p = "studio";
        else if (g.includes("pro")) p = "pro";
        token.plan = p;
        token.groups = g;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { plan: true, groups: true },
          });
          
          let p = token.plan as string || "free";
          let g = (token.groups as string[]) || [];
          
          if (dbUser) {
            p = dbUser.plan || "free";
            g = dbUser.groups || [];
          }
          
          if (g.includes("studio")) {
            p = "studio";
          } else if (g.includes("pro")) {
            p = "pro";
          }
          
          (session.user as any).plan = p;
          (session.user as any).groups = g;
        } catch {
          let p = token.plan as string || "free";
          let g = (token.groups as string[]) || [];
          if (g.includes("studio")) p = "studio";
          else if (g.includes("pro")) p = "pro";
          
          (session.user as any).plan = p;
          (session.user as any).groups = g;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: { strategy: "jwt" },
});
