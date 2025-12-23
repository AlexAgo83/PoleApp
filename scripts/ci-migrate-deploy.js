/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  try {
    run("npx prisma migrate deploy --schema prisma/schema.prisma");
    run("node scripts/ensure-super-admin.js");
    return;
  } catch (err) {
    console.warn("migrate deploy failed, attempting db push as fallback");
    console.warn(err?.message || err);
  }
  run("npx prisma db push --schema prisma/schema.prisma");
  run("node scripts/ensure-super-admin.js");
}

main();
