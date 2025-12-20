import { defineConfig } from "@prisma/client";

export default defineConfig({
  schema: "prisma/schema.prisma",
  seed: "tsx prisma/seed.ts",
});
