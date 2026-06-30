import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("ZMCw486!75276", 12);
  const admin = await prisma.user.upsert({
    where: { email: "cscannell@nexusaigear.com" },
    update: { groups: ["admin", "dev"] },
    create: {
      email: "cscannell@nexusaigear.com",
      password: adminPassword,
      plan: "free",
      groups: ["admin", "dev"],
    },
  });
  console.log(`✅ Admin user: ${admin.email} (${admin.id})`);

  // Test user
  const testPassword = await bcrypt.hash("TestUser123!", 12);
  const testUser = await prisma.user.upsert({
    where: { email: "test-studio@nexusaigear.com" },
    update: { groups: ["dev", "studio-plan", "nsfw-plan"] },
    create: {
      email: "test-studio@nexusaigear.com",
      password: testPassword,
      plan: "free",
      groups: ["dev", "studio-plan", "nsfw-plan"],
    },
  });
  console.log(`✅ Test user: ${testUser.email} (${testUser.id})`);

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
