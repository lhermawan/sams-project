const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const notifs = await prisma.notification.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  console.log(JSON.stringify(notifs, null, 2));
}
main().finally(() => prisma.$disconnect());
