import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/nexus_studio";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const NEXUS_SECRET = "ZMCw486!75276";

async function main() {
  console.log("Adding Modal providers to database...");

  // LLM Provider (OpenAI-compatible)
  const llmProvider = await prisma.provider.upsert({
    where: { id: "modal-llm" },
    update: {},
    create: {
      id: "modal-llm",
      name: "Modal LLM",
      kind: "openai",
      baseUrl: "https://cscannell-65199--nexus-llm-serve.modal.run/v1",
      apiKey: NEXUS_SECRET,
      models: ["modal-llm"],
      selectedModel: "modal-llm",
    },
  });
  console.log("✅ LLM Provider added:", llmProvider.name);

  // Image Provider (Modal)
  const imageProvider = await prisma.provider.upsert({
    where: { id: "modal-image" },
    update: {},
    create: {
      id: "modal-image",
      name: "Modal Image",
      kind: "modal",
      baseUrl: "https://cscannell-65199--nexus-image-imagemodel-web.modal.run",
      apiKey: NEXUS_SECRET,
      models: ["modal"],
      selectedModel: "modal",
    },
  });
  console.log("✅ Image Provider added:", imageProvider.name);

  // Video Provider (Modal)
  const videoProvider = await prisma.provider.upsert({
    where: { id: "modal-video" },
    update: {},
    create: {
      id: "modal-video",
      name: "Modal Video",
      kind: "modal",
      baseUrl: "https://cscannell-65199--nexus-video-web.modal.run",
      apiKey: NEXUS_SECRET,
      models: ["modal"],
      selectedModel: "modal",
    },
  });
  console.log("✅ Video Provider added:", videoProvider.name);

  console.log("\n✅ All Modal providers configured!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
