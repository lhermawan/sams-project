import { PrismaClient } from "@prisma/client";
import { runSeed } from "./seed/seeder";

const prisma = new PrismaClient();

async function main() {
  await runSeed(prisma);
}

main()
  .catch((e) => {
    console.error("? Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
