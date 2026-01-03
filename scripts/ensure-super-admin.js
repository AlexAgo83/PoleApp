/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const prisma = new PrismaClient();
  const isProd = process.env.NODE_ENV === "production";
  const email = process.env.SUPER_ADMIN_EMAIL || (isProd ? undefined : "superadmin@poleapp.test");
  const seedPassword = process.env.DATABASE_SEED_PWD;
  const password = process.env.SUPER_ADMIN_PASSWORD || seedPassword || (isProd ? undefined : undefined);
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

  if (!email || !password) {
    console.warn("ensure-super-admin skipped: SUPER_ADMIN_EMAIL/PASSWORD (or DATABASE_SEED_PWD) required.");
    await prisma.$disconnect();
    return;
  }

  try {
    const existing = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
    if (existing) {
      console.log("Super admin already exists.");
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
    console.log("Super admin created/ensured.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Failed to ensure super admin", err);
  process.exit(1);
});
