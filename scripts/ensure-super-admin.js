/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const prisma = new PrismaClient();
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@poleapp.test";
  const password = process.env.SUPER_ADMIN_PASSWORD || "poleapp123";
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

  try {
    const existing = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
    if (existing) {
      console.log(`Super admin already exists (${existing.email}).`);
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.SUPER_ADMIN,
        isPremium: true,
        name,
      },
    });
    console.log(`Super admin created with email ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Failed to ensure super admin", err);
  process.exit(1);
});
