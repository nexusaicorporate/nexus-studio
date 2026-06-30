import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - list all users (admin only)
export async function GET() {
  const session = await auth();
  const groups: string[] = (session?.user as any)?.groups ?? [];
  if (!groups.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    select: { id: true, email: true, plan: true, groups: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

// POST - create user (admin only)
export async function POST(req: Request) {
  const session = await auth();
  const groups: string[] = (session?.user as any)?.groups ?? [];
  if (!groups.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { email, password, plan, userGroups } = await req.json();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "User already exists." }, { status: 409 });
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, plan: plan ?? "free", groups: userGroups ?? [] },
  });
  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}

// PATCH - update user groups/plan (admin only)
export async function PATCH(req: Request) {
  const session = await auth();
  const groups: string[] = (session?.user as any)?.groups ?? [];
  if (!groups.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, plan, userGroups } = await req.json();
  const user = await prisma.user.update({
    where: { id },
    data: { ...(plan !== undefined && { plan }), ...(userGroups !== undefined && { groups: userGroups }) },
  });
  return NextResponse.json({ id: user.id, plan: user.plan, groups: user.groups });
}

// DELETE - delete user (admin only)
export async function DELETE(req: Request) {
  const session = await auth();
  const groups: string[] = (session?.user as any)?.groups ?? [];
  if (!groups.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await req.json();
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
