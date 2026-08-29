import { NextAuthOptions } from "next-auth";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    {
      id: "linkedin",
      name: "LinkedIn",
      type: "oauth",
      issuer: "https://www.linkedin.com/oauth",
      jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      authorization: {
        url: "https://www.linkedin.com/oauth/v2/authorization",
        params: { scope: "openid profile email w_member_social" },
      },
      token: "https://www.linkedin.com/oauth/v2/accessToken",
      userinfo: "https://api.linkedin.com/v2/userinfo",
      client: { token_endpoint_auth_method: "client_secret_post" },
      idToken: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      const dbUser = await prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name ?? undefined },
        create: { email: user.email, name: user.name ?? undefined },
      });

      await prisma.linkedInAccount.upsert({
        where: { userId: dbUser.id },
        update: {
          accessToken: account.access_token!,
          expiresAt: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
          linkedInUrn: `urn:li:person:${account.providerAccountId}`,
        },
        create: {
          userId: dbUser.id,
          accessToken: account.access_token!,
          expiresAt: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
          linkedInUrn: `urn:li:person:${account.providerAccountId}`,
        },
      });

      return true;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};