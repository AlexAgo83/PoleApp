import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });

try {
  run("npm run db:migrate:deploy");
} catch (err) {
  const output = (err?.stderr || err?.stdout || "").toString();
  if (output.includes("P3005")) {
    console.warn("P3005 detected: falling back to `npm run db:push`");
    run("npm run db:push");
  } else {
    throw err;
  }
}

run("npm run start");
