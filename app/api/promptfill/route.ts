import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const row = await prisma.userSettings.findUnique({ where: { userId } });
  const data = row?.data as any;
  return NextResponse.json(data?.promptfill ?? {});
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  let promptfillData: any;
  try {
    promptfillData = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const row = await prisma.userSettings.findUnique({ where: { userId } });
  const existingData = (row?.data as any) ?? {};

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, data: { ...existingData, promptfill: promptfillData } },
    update: { data: { ...existingData, promptfill: promptfillData } },
  });

  return NextResponse.json({ ok: true });
}
