import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const duePosts = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    include: { user: { include: { linkedInAccount: true } } },
  });

  const results = [];

  for (const post of duePosts) {
    if (!post.user.linkedInAccount) {
      await prisma.post.update({ where: { id: post.id }, data: { status: "FAILED" } });
      results.push({ id: post.id, status: "failed", reason: "no linkedin account" });
      continue;
    }

    const body = {
      author: post.user.linkedInAccount.linkedInUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: post.content },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${post.user.linkedInAccount.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      await prisma.post.update({ where: { id: post.id }, data: { status: "FAILED" } });
      results.push({ id: post.id, status: "failed" });
      continue;
    }

    const linkedInPostId = res.headers.get("x-restli-id") ?? undefined;
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "PUBLISHED", publishedAt: new Date(), linkedInPostId },
    });
    results.push({ id: post.id, status: "published" });
  }

  return NextResponse.json({ processed: results.length, results });
}