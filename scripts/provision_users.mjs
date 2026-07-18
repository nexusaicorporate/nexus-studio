// Provision the admin + test users directly into Postgres via Prisma.
// Stack is NextAuth (credentials) + Prisma + Postgres — NO Supabase.
//
// Passwords come from env so no secret is committed. Example:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' \
//   TEST_EMAIL=test@example.com TEST_PASSWORD='...' \
//   node scripts/provision_users.mjs
//
// Add-ons are stored on User.groups as "<addon>-plan" (e.g. "nsfw-plan"),
// exactly like the Stripe webhook writes them. There is no `addons` column.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/nexus_studio";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cscannell@nexusaigear.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TEST_EMAIL = process.env.TEST_EMAIL || "test-studio@nexusaigear.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!ADMIN_PASSWORD || !TEST_PASSWORD) {
  console.error(
    "Set ADMIN_PASSWORD and TEST_PASSWORD env vars before running (they are not hardcoded).",
  );
  process.exit(1);
}

async function upsertUser(email, password, plan, groups) {
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    // Don't reset an existing user's password on re-run; only sync plan/groups.
    update: { plan, groups },
    create: { email, password: hash, plan, groups },
  });
  console.log(`  ✓ ${email} → plan=${plan} groups=[${groups.join(", ")}]`);
}

async function main() {
  console.log("Provisioning users into Postgres (Prisma)...");
  // Admin: full admin + dev access.
  await upsertUser(ADMIN_EMAIL, ADMIN_PASSWORD, "studio", ["admin", "dev"]);
  // Test user: Studio plan + NSFW add-on (nsfw-plan) + dev group.
  await upsertUser(TEST_EMAIL, TEST_PASSWORD, "studio", ["dev", "nsfw-plan"]);
  console.log("Provisioning complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
