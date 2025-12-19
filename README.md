# Pole App — MVP bootstrap (Step 0)

Base Next.js + Prisma setup derived from the provided markdown specs (roles, positions, courses, injuries, mini-jeu).

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- NextAuth (Credentials) + middleware RBAC (student/teacher/admin)
- Vitest + Testing Library (unit smoke)

## Setup rapide
1) `npm install` (à la racine)  
2) `.env` : `DATABASE_URL` doit pointer vers un Postgres (ex: `postgresql://USER:PASSWORD@localhost:5432/poleapp?schema=public`), `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (http://localhost:3000 en dev).  
3) `npm run db:seed` — applique le schéma + seed (école, users, positions).  
4) `npm run dev` — app sur http://localhost:3000.

Postgres local (option rapide, Docker) :
```bash
docker run -d --name poleapp-postgres -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=poleapp -p 5432:5432 postgres:16
```
Puis dans `.env` : `DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/poleapp?schema=public"`

Option docker-compose (web + postgres) :
```bash
docker-compose up --build
# la webapp sera sur http://localhost:3000
```
La commande web lance `npm run db:push && npm run db:seed` avant `npm run start`.

Scripts utiles :
- `npm run db:push` : synchro schéma.
- `npm run db:seed` : push + seed.
- `npm test` : Vitest.
- `npm run lint`

## Auth (Step 1)
- Route login : `/login` (Credentials provider).
- Middleware RBAC protège : `/app/student`, `/app/teacher`, `/app/admin` (+ `/student|/teacher|/admin` pour la suite).
- Redirection auto selon rôle : admin → `/app/admin`, teacher → `/app/teacher`, student → `/app/student`.
- Besoin d’un `NEXTAUTH_SECRET` dans `.env` (+ `NEXTAUTH_URL` recommandé). Exemple dans `.env.example`.

## Positions (Step 2)
- Liste publique `/positions` avec filtres type/niveau et détail `/positions/[id]`.
- Gating élève : stub affiché (gratuit vs premium), en attente de la logique “débloqué”.
- Prof/Admin : création via `/teacher/positions/new` (form zod + server action) et liste rapide `/teacher/positions`.

## Blessures (Step 3)
- Élève : `/app/student/injuries` (CRUD blessures, toggle actif/inactif).
- Prof : `/app/teacher/students` + `/app/teacher/students/[id]` (consultation blessures élèves de l’école).
- Seed : 1 blessure active pour student1.

## Progression (Step 4)
- Élève : `/app/student/progress` (vue progression par position, accès complet si premium, sinon positions vues).
- Prof : mise à jour progression sur `/app/teacher/students/[id]` (statut, niveau, commentaire, piste : prise en compte des blessures visibles).

## Déploiement Render
- Fichier `render.yaml` fourni (web service + Postgres). Render va créer la base `poleapp-db` et injecter `DATABASE_URL`.
- Build command : `npm install && npx prisma generate && npm run build` (rootDir=web). Start : `npm run start`.
- Post-deploy : `npm run db:push && npm run db:seed` pour préparer la base distante.
- Variables à prévoir : `NEXTAUTH_SECRET` (auto-généré dans render.yaml), `NEXTAUTH_URL` (`https://<service>.onrender.com`).

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
- Changelog : voir `CHANGELOG.md`.
