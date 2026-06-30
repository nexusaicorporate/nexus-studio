"use server";

import { prisma } from "@/lib/prisma";

export async function getAdminData() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, plan: true, groups: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    totalUsers: users.length,
    planCounts: users.reduce((acc, user) => {
      acc[user.plan] = (acc[user.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    groupCounts: users.reduce((acc, user) => {
      user.groups.forEach((g: string) => { acc[g] = (acc[g] || 0) + 1; });
      return acc;
    }, {} as Record<string, number>),
  };

  return { users, stats };
}

export async function updateUserProfile(userId: string, data: { plan?: string; groups?: string[] }) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.plan !== undefined && { plan: data.plan }),
      ...(data.groups !== undefined && { groups: data.groups }),
    },
  });
  return { success: true };
}

export async function deleteAdminUser(id: string) {
  await prisma.user.delete({ where: { id } });
  return { success: true };
}

export async function migrateUserData(sourceId: string, targetId: string, deleteSource: boolean = false) {
  await Promise.all([
    prisma.prompt.updateMany({ where: { userId: sourceId }, data: { userId: targetId } }),
    prisma.template.updateMany({ where: { userId: sourceId }, data: { userId: targetId } }),
    prisma.bank.updateMany({ where: { userId: sourceId }, data: { userId: targetId } }),
    prisma.ingredient.updateMany({ where: { userId: sourceId }, data: { userId: targetId } }),
  ]);
  if (deleteSource) await prisma.user.delete({ where: { id: sourceId } });
  return { success: true };
}
