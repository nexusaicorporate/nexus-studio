const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

async function main() {
  const adapter = new PrismaPg({ connectionString: 'postgresql://postgres:postgres@localhost:5432/nexus_studio' });
  const prisma = new PrismaClient({ adapter });

  const h1 = await bcrypt.hash('ZMCw486!75276', 12);
  await prisma.user.upsert({
    where: { email: 'cscannell@nexusaigear.com' },
    update: { groups: ['admin', 'dev'] },
    create: { email: 'cscannell@nexusaigear.com', password: h1, plan: 'free', groups: ['admin', 'dev'] }
  });
  console.log('Admin user seeded');

  const h2 = await bcrypt.hash('TestUser123!', 12);
  await prisma.user.upsert({
    where: { email: 'test-studio@nexusaigear.com' },
    update: { groups: ['dev', 'studio-plan', 'nsfw-plan'] },
    create: { email: 'test-studio@nexusaigear.com', password: h2, plan: 'free', groups: ['dev', 'studio-plan', 'nsfw-plan'] }
  });
  console.log('Test user seeded');

  await prisma.$disconnect();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
