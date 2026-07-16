import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.systemMetadata.upsert({
    where: { key: "platform.foundation" },
    update: { value: "sprint-1" },
    create: {
      key: "platform.foundation",
      value: "sprint-1",
    },
  });
}

main()
  .catch(() => {
    console.error("Database seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
