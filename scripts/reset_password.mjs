import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/nexus_studio";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "cscannell@nexusaigear.com";
  const password = "ZMCw486!75276";
  const hash = await bcrypt.hash(password, 12);

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { password: hash }
  });

  console.log(`Successfully updated password for ${updatedUser.email}!`);
}

main()
  .catch((e) => {
    console.error("Error setting password:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
