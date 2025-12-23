/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

const MIGRATIONS_TO_RESOLVE = [
  "20251223010000_add_course_recommendation",
  "20251224103000_recommendation_forced_flags",
];

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function tryResolve() {
  for (const name of MIGRATIONS_TO_RESOLVE) {
    try {
      run(`npx prisma migrate resolve --schema prisma/schema.prisma --applied ${name}`);
    } catch (err) {
      console.warn(`skip resolve (${name}): ${err?.message || err}`);
    }
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
