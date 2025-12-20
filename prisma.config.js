const { defineConfig } = require("@prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  seed: "tsx prisma/seed.ts",
});
