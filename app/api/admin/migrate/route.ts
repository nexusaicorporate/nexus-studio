import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Move all library data from sourceId to destId
export async function POST(req: Request) {
  const session = await auth();
  const groups: string[] = (session?.user as any)?.groups ?? [];
  if (!groups.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sourceId, destId } = await req.json();
  if (!sourceId || !destId) {
    return NextResponse.json({ error: "sourceId and destId are required." }, { status: 400 });
  }

  const [prompts, templates, banks, ingredients] = await Promise.all([
    prisma.prompt.updateMany({ where: { userId: sourceId }, data: { userId: destId } }),
    prisma.template.updateMany({ where: { userId: sourceId }, data: { userId: destId } }),
    prisma.bank.updateMany({ where: { userId: sourceId }, data: { userId: destId } }),
    prisma.ingredient.updateMany({ where: { userId: sourceId }, data: { userId: destId } }),
  ]);

  return NextResponse.json({
    ok: true,
    migrated: {
      prompts: prompts.count,
      templates: templates.count,
      banks: banks.count,
      ingredients: ingredients.count,
    },
  });
}
