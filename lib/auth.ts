import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

// This config handles *app login only*. Connecting Spotify/YouTube for playlist
// import is a separate, hand-rolled OAuth flow with its own token storage
// (see lib/providers/* and the ConnectedAccount model) so that login scopes stay
// minimal and a music connection can be revoked without affecting sign-in.
export const { handlers, auth, signIn, signOut } = NextAuth({
  // The adapter's types target the legacy `@prisma/client` output, which Prisma 7's
  // `prisma-client` generator no longer produces (ours lands in app/generated/prisma).
  // The runtime shape is identical, so bridge the nominal type gap via the adapter's
  // own parameter type rather than importing a type that can't resolve.
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Login only wants identity. The YouTube connect flow requests
      // youtube.readonly separately so signing in never prompts for it.
      authorization: {
        params: { scope: "openid email profile", prompt: "select_account" },
      },
    }),
    Resend({
      // apiKey is inferred from AUTH_RESEND_KEY
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    }),
  ],
  callbacks: {
    session({ session, user }) {
      // Expose the DB user id so server components can query Profile/Playlist.
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
