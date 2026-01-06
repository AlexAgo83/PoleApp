#!/usr/bin/env bash
set -euo pipefail

# Dump a Postgres database to ./dump/<name>_YYYYMMDD_HHMMSS.sql
# Requires: PGPASSWORD in env + PGHOST/PGUSER/PGDATABASE (or a URL passed via --url)
# Safety: refuses to run on prod hosts (e.g. *.render.com) unless ALLOW_PROD_DUMP=1.

usage() {
  cat <<'EOF'
Usage: scripts/db-dump.sh [--url postgres_url] [--name label] [--encrypt]

Options:
  --url   Full Postgres URL (postgresql://user:pass@host:port/db). If omitted, uses PG* env vars.
  --name  Label for the dump file (default: db)
  --encrypt   Encrypt the dump with gpg symmetric mode (ZIP_PASSWORD env required).

Notes:
  - Do NOT use this against production without explicit approval.
  - Dump files are written under ./dump and should not be git-added.
EOF
}

URL=""
NAME="db"
DO_ENCRYPT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      URL="$2"
      shift 2
      ;;
    --name)
      NAME="$2"
      shift 2
      ;;
    --encrypt)
      DO_ENCRYPT=1
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

TS=$(date +%Y%m%d_%H%M%S)
OUTDIR="dump"
mkdir -p "$OUTDIR"
OUTFILE="$OUTDIR/${NAME}_${TS}.sql"

sanitized_url="${URL#EXTERNAL=}"

detect_host() {
  if [[ -n "$sanitized_url" ]]; then
    printf '%s\n' "$sanitized_url" | sed -e 's,^postgresql://,,;s,^postgres://,,;' | cut -d@ -f2 | cut -d/ -f1
  else
    printf '%s\n' "${PGHOST:-}"
  fi
}

HOSTNAME=$(detect_host)
if [[ "$HOSTNAME" =~ render\.com$ ]] && [[ "${ALLOW_PROD_DUMP:-0}" != "1" ]]; then
  echo "Refusé : cible détectée comme prod ($HOSTNAME). Exporte ALLOW_PROD_DUMP=1 pour forcer." >&2
  exit 1
fi

if [[ -n "$sanitized_url" ]]; then
  pg_dump "$sanitized_url" > "$OUTFILE"
else
  : "${PGHOST:?PGHOST required if --url not provided}"
  : "${PGUSER:?PGUSER required if --url not provided}"
  : "${PGDATABASE:?PGDATABASE required if --url not provided}"
  pg_dump -h "$PGHOST" -U "$PGUSER" "$PGDATABASE" > "$OUTFILE"
fi

echo "Dump written to $OUTFILE"

if [[ $DO_ENCRYPT -eq 1 ]]; then
  : "${ZIP_PASSWORD:?ZIP_PASSWORD env required for --encrypt}"
  pass_file=$(mktemp)
  printf '%s' "$ZIP_PASSWORD" > "$pass_file"
  GPG_FILE="${OUTFILE}.gpg"
  gpg --batch --yes --symmetric --passphrase-file "$pass_file" --output "$GPG_FILE" "$OUTFILE"
  rm -f "$pass_file" "$OUTFILE"
  echo "Encrypted file written to $GPG_FILE (gpg symmetric)."
fi
