/* eslint-disable @typescript-eslint/no-require-imports */
const { defineConfig } = require("@prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  seed: "tsx prisma/seed.ts",
});
