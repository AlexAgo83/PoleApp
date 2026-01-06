#!/usr/bin/env bash
set -euo pipefail

# Dump a Postgres database to ./dump/<name>_YYYYMMDD_HHMMSS.sql
# Requires: PGPASSWORD in env + PGHOST/PGUSER/PGDATABASE (or a URL passed via --url)

usage() {
  cat <<'EOF'
Usage: scripts/db-dump.sh [--url postgres_url] [--name label] [--zip]

Options:
  --url   Full Postgres URL (postgresql://user:pass@host:port/db). If omitted, uses PG* env vars.
  --name  Label for the dump file (default: db)
  --zip   Create a password-protected zip (ZIP_PASSWORD env required).

Notes:
  - Do NOT use this against production without explicit approval.
  - Dump files are written under ./dump and should not be git-added.
EOF
}

URL=""
NAME="db"
DO_ZIP=0

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
    --zip)
      DO_ZIP=1
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

if [[ -n "$URL" ]]; then
  pg_dump "$URL" > "$OUTFILE"
else
  : "${PGHOST:?PGHOST required if --url not provided}"
  : "${PGUSER:?PGUSER required if --url not provided}"
  : "${PGDATABASE:?PGDATABASE required if --url not provided}"
  pg_dump -h "$PGHOST" -U "$PGUSER" "$PGDATABASE" > "$OUTFILE"
fi

echo "Dump written to $OUTFILE"

if [[ $DO_ZIP -eq 1 ]]; then
  : "${ZIP_PASSWORD:?ZIP_PASSWORD env required for --zip}"
  ZIPFILE="${OUTFILE}.zip"
  # shellcheck disable=SC1117
  zip -P "$ZIP_PASSWORD" "$ZIPFILE" "$OUTFILE"
  echo "Encrypted zip written to $ZIPFILE"
  rm -f "$OUTFILE"
fi
