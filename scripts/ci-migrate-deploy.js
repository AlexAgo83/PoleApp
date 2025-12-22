/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

const MIGRATION_NAME = "20251223010000_add_course_recommendation";

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function tryResolve() {
  try {
    run(`npx prisma migrate resolve --schema prisma/schema.prisma --applied ${MIGRATION_NAME}`);
  } catch (err) {
    console.warn(`skip resolve (${MIGRATION_NAME}): ${err?.message || err}`);
  }
}

function main() {
  tryResolve();
  try {
    run("npx prisma migrate deploy --schema prisma/schema.prisma");
    return;
  } catch (err) {
    console.warn("migrate deploy failed, attempting db push as fallback");
    console.warn(err?.message || err);
  }
  run("npx prisma db push --schema prisma/schema.prisma");
}

main();
