# Pole App — Pack Markdown (Backlog + Instructions Codex)

Date: 2025-12-19

Ce dossier contient :
- `01_BACKLOG.md` : backlog structuré (epics → features → user stories → critères d’acceptation).
- `02_CODEX_INSTRUCTIONS.md` : consignes “pas à pas” pour que CODEX prototype le projet.
- `03_DATA_MODEL.md` : modèle de données (MVP + évolutions).
- `04_ROUTES_AND_SCREENS.md` : écrans clés + routes + états.
- `05_SEED_CONTENT.md` : contenu de seed (positions, types, niveaux) pour démarrer vite.

## Périmètre MVP visé
- Base de données des positions (photos/vidéos + attributs).
- Fiche élève (progression par position) + blessures.
- Fiche cours (présence + positions vues + commentaires).
- Mini-jeu de révision (Photo → Nom) + score/badges simples.
- Auth + rôles (Élève / Prof / École admin).

## Hypothèses techniques (prototype rapide)
- Web app **Next.js** (responsive) pour itérer vite (mobile ensuite).
- DB **PostgreSQL** + **Prisma** (provider Postgres en place, seed idempotent).
- Auth **NextAuth** (Credentials) + middleware RBAC.
- UI **Tailwind** + composants simples.
- Stockage médias : local en dev, abstraction prête pour S3/Cloudinary ensuite.

## Mise en route (implémentation actuelle)
- Env local : `.env` avec `DATABASE_URL` Postgres, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- Scripts : `npm run db:push`, `npm run db:seed`, `npm run dev`.
- Docker : `docker compose watch` (web en mode dev + Postgres) ou `docker-compose up --build`.
- Déploiement Render : `render.yaml` (service web + base Postgres auto), build `npm install && npx prisma generate && npm run build`, start `npm run start`, seed via `npm run db:push && npm run db:seed`.

> Si vous voulez partir direct sur du mobile, remplacez Next.js par Expo/React Native,
> mais le MVP “data + flows” est plus rapide à valider côté web.
