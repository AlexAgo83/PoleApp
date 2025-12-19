# Changelog

## 2025-12-19 — Step 0 (Bootstrap)
- Création du projet Next.js (App Router, Tailwind) avec homepage orientée modules + lien `/health`.
- Ajout Prisma + SQLite : schéma complet (users, school, positions, médias, progression, cours, blessures).
- Scripts DB robustifiés (`db:push`, `db:seed`) avec fallback chemin absolu SQLite.
- Seed idempotent : 1 école, 4 comptes (admin/teacher/2 students), 10 positions + médias placeholder, types de blessure, progression exemple.
- Tests Vitest : `getHealth` + route `/health`.

## 2025-12-19 — Step 1 (Auth + RBAC)
- NextAuth Credentials configuré (`/api/auth/[...nextauth]`) avec validation bcrypt + Prisma.
- Middleware RBAC protège `/app/*` (+ `/student|/teacher|/admin`), redirige login ou access denied.
- Pages protégées : `/app/student`, `/app/teacher`, `/app/admin` + routing rôle `/app`.
- Page `/login` avec presets seed, redirection selon rôle, bouton signout global.
- Types NextAuth étendus, helper RBAC (`lib/rbac.ts`), README mis à jour.

## 2025-12-19 — Step 2 (Positions browse + création prof)
- Liste `/positions` avec filtres type/niveau, cartes avec médias seed et détail `/positions/[id]`.
- Détail inclut infos, tips, contre-indications, gating élève (stub free/premium) et lien création.
- Prof/Admin : création via `/teacher/positions/new` (zod + server action + Prisma), listing rapide `/teacher/positions`.
- Home mise à jour pour marquer Step 2 livré.

## 2025-12-19 — Déploiement Render (PostgreSQL)
- Prisma basculé sur PostgreSQL (provider) et scripts DB simplifiés.
- `.env.example` mis à jour (Postgres + NextAuth). `.env` exemple local Postgres.
- Ajout `render.yaml` (web service Next + base Postgres, postdeploy db:push + db:seed).
- Pages positions forcées en dynamique pour éviter besoin DB au build local.

## 2025-12-19 — Dockerisation
- Ajout Dockerfile multi-stage (Next + Prisma) à la racine.
- Ajout docker-compose (web + Postgres) pour un run local : `docker-compose up --build`.
- `.dockerignore` pour alléger l’image.

## 2025-12-19 — Step 3 (Blessures)
- Élève : page `/app/student/injuries` (liste + création + édition/suppression, toggle actif/inactif).
- Prof : vues `/app/teacher/students` et `/app/teacher/students/[id]` pour consulter les blessures des élèves de l’école.
- Seed : blessure active ajoutée pour student1 (épaule).

## 2025-12-19 — Step 4 (Progression)
- Élève : `/app/student/progress` affiche progression par position (accès complet si premium, sinon positions vues).
- Prof : `/app/teacher/students/[id]` enrichi avec mise à jour progression (statut, niveau, commentaire) par position.

## 2025-12-19 — Step 5 (Cours - en cours)
- Formulaire création cours `/app/teacher/courses/new` (date/titre, élèves, positions, notes élève×position) avec mise à jour progression automatique.
- Liste stub des cours `/app/teacher/courses` (dernier 20).
