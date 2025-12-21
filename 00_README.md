# Pole App — Pack Markdown (Backlog + Instructions Codex) — v0.4.6 (baseline produit)

Date: 2025-12-24 (MAJ v0.4.6)

Ce dossier contient :
- `01_BACKLOG.md` : backlog structuré (epics → features → user stories → critères d’acceptation).
- `01_BACKLOG_CLOUDINARY.md` : backlog dédié à l’intégration Cloudinary (uploads médias).
- `02_CODEX_INSTRUCTIONS.md` : consignes “pas à pas” pour que CODEX prototype le projet.
- `03_DATA_MODEL.md` : modèle de données (MVP + évolutions).
- `04_ROUTES_AND_SCREENS.md` : écrans clés + routes + états.
- `05_SEED_CONTENT.md` : contenu de seed (positions, types, niveaux) pour démarrer vite.
- `06_QA_S001.md` : plan de test QA.
- `06_QA_S002.md` : retours QA (session 2025-12-21 01:00).
- `06_QA_S003.md` : retours QA (session 2025-12-21 01:10).
- `06_QA_S004.md` : retours QA (session 2025-12-21 01:15).
- `01_BACKLOG_S002.md` : backlog tiré des retours QA S002.
- `01_BACKLOG_S003.md` : backlog programme “Remise en forme” (notes S003).
- `01_BACKLOG_S004.md` : backlog générateur de cours (notes S004).
- `CHANGELOG.md` : journal des changements.
- `README.md` : vue produit synthétique.

## Arborescence des fichiers .md
- `00_README.md` (index)
- `01_BACKLOG.md`
- `01_BACKLOG_CLOUDINARY.md`
- `01_BACKLOG_STEP_009.md`
- `02_CODEX_INSTRUCTIONS.md`
- `02_RENDER_INSTRUCTIONS.md`
- `03_DATA_MODEL.md`
- `04_ROUTES_AND_SCREENS.md`
- `05_SEED_CONTENT.md`
- `06_QA_S001.md`
- `06_QA_S002.md`
- `06_QA_S003.md`
- `06_QA_S004.md`
- `CHANGELOG.md`
- `README.md`

## Fonctionnalités livrées (baseline produit v0.4.6)
- Base positions (médias + attributs), fiche élève (progression + blessures), fiche cours (présence + positions vues + commentaires).
- Mini-jeu de révision photo→nom (score + gating premium).
- Auth + rôles (Élève / Prof / École admin) + navigation unifiée par rôle.
- Pagination/filtres harmonisés, profil utilisateur (âge/photo), fiches prof publiques, photos cours avec placeholders, seed idempotent.

## Phase produit — exigences transverses
- Inclure fiabilité/observabilité/sécurité/perf dans chaque Step (tests au-delà du MVP, alerting/logging/metrics, migrations rétro-compatibles).
- Traiter l’intégrité données (backfill/garde-fous Prisma), feature flags/dark launch pour les nouvelles surfaces.
- Préparer billing/credits et audit trail (école/admin) dans les designs.

## Stack actuelle (base produit)
- Web app **Next.js** (responsive) pour itérer vite (mobile ensuite).
- DB **PostgreSQL** + **Prisma** (provider Postgres en place, seed idempotent).
- Auth **NextAuth** (Credentials) + middleware RBAC.
- UI **Tailwind** + composants simples.
- Stockage médias : local en dev, abstraction prête pour S3/Cloudinary ensuite.

## Progression des Steps
- Step 0 → 8 : livrées (bootstrap, auth/RBAC, positions, blessures, progression, cours, mini-jeu, admin école, navigation unifiée par rôle + homepage “Profile”).
- v0.2.2 : filtres admin/positions/élèves, harmonisation UI des filtres, pagination (10 items), page profil utilisateur et navigation par rôle.
- **Step 9 (terminée)** : Discovery QA — voir synthèse dans `01_BACKLOG_STEP_009.md`.
- **Basculé en phase produit** : tag `v0.4.6` figé comme baseline; prochaines Steps à aborder sous l’angle produit (fiabilité, sécurité, observabilité, billing/credits).

## Mise en route (implémentation actuelle)
- Env local : `.env` avec `DATABASE_URL` Postgres, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- Scripts : `npm run db:push`, `npm run db:seed`, `npm run dev`.
- Docker : `docker compose watch` (reco hot-reload sans bind mount, build target `dev` avec code + schéma Prisma embarqués) ou `docker-compose up --build` (rebuild nécessaire pour prendre le code). Si un lock watch existe : `docker compose down` puis relancer.
- Déploiement Render : `render.yaml` (service web + base Postgres auto), build `npm install && npx prisma db push && npx prisma generate && npm run build`, start `npm run db:push && npm run db:seed && npm run start` (seed idempotent).
- Turbopack : des panics peuvent survenir avec le cache. Si ça arrive, supprimer `.next`/`.turbo` puis lancer `NEXT_USE_TURBOPACK=0 npm run dev` (ou ajouter la variable dans Docker/Render).

## Seed (dev)
- Comptes fixes : admin/teacher/student1/student2 (`change-me-password`), rattachés à École 1.
- Généré : 2 écoles (École 1, École 2) + 5 profs et 10 élèves par école (mot de passe `change-me-password`, premium 1/2) + 1 cours de démo par école (prof 1 + 3 élèves + 2 positions).

> Si vous voulez partir direct sur du mobile, remplacez Next.js par Expo/React Native,
> mais la base “données + flows” est déjà validée côté web (v0.4.6).
