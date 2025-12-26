/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  run("npx prisma db push --schema prisma/schema.prisma");
  run("node scripts/ensure-super-admin.js");
}

main();
