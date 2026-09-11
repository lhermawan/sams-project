const { PrismaClient } = require("@prisma/client");

async function test() {
  const prisma = new PrismaClient();
  const credentials = { email: "employee@mbg.niskala.id", password: "password", tenantDomain: "mbg" };
  
  const tenantDomain = credentials.tenantDomain?.trim() || null;
  console.log("tenantDomain:", tenantDomain);
  
  if (tenantDomain === "super-admin" || !tenantDomain) {
    console.log("SUPER ADMIN PATH");
  } else {
    console.log("TENANT PATH");
  }
}
test();
