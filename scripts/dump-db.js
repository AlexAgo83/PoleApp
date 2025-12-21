/**
 * Helper pour dumper la base Render en local/CI.
 * Usage :
 *   DATABASE_URL="postgres://user:pass@host:port/db" node scripts/dump-db.js > backup.sql
 *
 * Pré-requis : pg_dump installé (ou utilisez docker postgres:16).
 * Attention : ne versionnez jamais backup.sql dans le repo.
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquante. Exemple : postgres://user:pass@host:port/db");
  process.exit(1);
}

// pg_dump écrit sur stdout ; redirigez dans un fichier.
execSync(`pg_dump "${url}"`, { stdio: "inherit" });
