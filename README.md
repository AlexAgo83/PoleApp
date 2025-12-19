# Pole App — MVP bootstrap (Step 0)

Base Next.js + Prisma setup derived from the provided markdown specs (roles, positions, courses, injuries, mini-jeu).

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite (dev)
- Vitest + Testing Library (unit smoke)

## Setup rapide
1) `npm install`  
2) `.env` : pointer `DATABASE_URL` vers le chemin absolu du fichier SQLite (exemple actuel : `file:/Users/alexandreagostini/Library/Mobile Documents/com~apple~CloudDocs/Documents/Workspace/PoleApp/web/prisma/dev.db`). Les chemins relatifs via `file:./prisma/dev.db` posent problème sur ce poste.  
3) `npm run db:seed` — applique le schéma + seed (école, users, positions).  
4) `npm run dev` — app sur http://localhost:3000.

Scripts utiles :
- `npm run db:push` : synchro schéma (force le chemin DB absolu automatiquement).
- `npm run db:seed` : push + seed.
- `npm test` : Vitest.
- `npm run lint`

## Comptes seed (mot de passe : `change-me-password`)
- admin@poleapp.test — SCHOOL_ADMIN (premium)
- teacher@poleapp.test — TEACHER
- student1@poleapp.test — STUDENT (gratuit)
- student2@poleapp.test — STUDENT (premium)

## Contenu seed
- 1 école (“Pole Pilot School”).
- 10 positions (types/niveaux/grips + image placeholder) + 1 progression élève “Jasmine”.
- 5 injury types.

## Healthcheck
- `GET /health` retourne `{ status: "ok", timestamp, uptimeSeconds }`.

## Notes
- DB ignorée par git (`prisma/dev.db`).
- Changelog : voir `CHANGELOG.md`.
