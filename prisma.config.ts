import path from "node:path";
import { defineConfig } from "prisma/config";

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/nexus_studio";

export default defineConfig({
  schema: path.join(process.cwd(), "prisma", "schema.prisma"),
  datasource: {
    url: connectionString,
  },
  migrations: {
    seed: "node prisma/seed.js",
  },
});
