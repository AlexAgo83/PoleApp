# Pole App — MVP v0.2.2 (Steps 0 → 8)

Web app Next.js (App Router) pour gérer positions, élèves, cours, progression et mini-jeu, avec navigation par rôle et pagination. Step 9 (Discovery QA) en préparation — plan dans `01_BACKLOG_STEP_009.md`.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- NextAuth (Credentials) + middleware RBAC
- Docker (multi-stage) + docker-compose
- Render : `render.yaml` (web + Postgres)

## Démarrage local
```bash
npm install
cp .env.example .env        # remplir DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npm run db:push
npm run db:seed
npm run dev                 # ou NEXT_USE_TURBOPACK=0 npm run dev si panics
```

### Docker
- Hot reload conseillé : `docker compose watch` (si lock, `docker compose down` puis relancer).
- Rebuild complet : `docker-compose up --build`.

## Auth & rôles
- Login: `/login` (presets seed).
- Rôles: `STUDENT`, `TEACHER`, `SCHOOL_ADMIN`.
- RBAC: middleware protège `/app/...`; redirections selon rôle après login; logout renvoie à la home.
- Inscription self-serve élève : `/signup` (email + mot de passe + école, premium optionnel). Prof/Admin restent créés par l’école.

## Navigation / Profile (Step 8)
- Bandeau session/rôle avec `Accueil`, `Mon espace`, `Se déconnecter` sur toutes les pages.
- Salutation “Bonjour <prénom|nom|email>” + bouton “Éditer” → `/app/profile`.
- Page profil `/app/profile` : consultation email/rôle/école, édition prénom/nom (affichage app).
- Homepage “Modules” inclut la carte Profile.

## Positions
- `/positions` : liste 2 colonnes (élève/prof/admin) + bandeau + retour contextuel `from`.
- Détail `/positions/[id]` partageable; bouton “Éditer” pour Professeur/Admin.
- CRUD : `/teacher/positions/new` et `/teacher/positions/[id]/edit` (Professeur/Admin).

## Blessures & progression
- Élève : `/app/student/injuries` (CRUD, pagination 10) ; `/app/student/progress` (pagination 10).
- Prof/Admin : blessures et progression visibles/editables sur `/app/teacher/students/[id]`; retour vers la liste.

## Cours
- Prof/Admin : `/app/teacher/courses` (tri décroissant, pagination 10), création `/new`, détail, édition.
- Élève : `/app/student/courses` historique (pagination 10) + détail.
- Détail cours correct par id; updates progression lors de la création/édition.

## Mini-jeu
- `/app/student/game` : quiz photo → nom sur positions débloquées (ou toutes si premium).

## Admin école
- `/app/admin` : stats école, actions rapides.
- `/app/admin/users` : CRUD users (rôle, premium, mot de passe).

## Pagination (v0.2.2)
- Listes dynamiques paginées par 10 : cours élève/prof, progression élève, blessures élève, liste élèves prof/admin.

## Santé & diagnostics
- `/health` (200 OK), logs DB Prisma.
- En cas de panics Turbopack : supprimer `.next/.turbo` et/ou `NEXT_USE_TURBOPACK=0`.

## Seeds (dev)
- Comptes : `admin@poleapp.test`, `teacher@poleapp.test`, `student1@poleapp.test`, `student2@poleapp.test` (`change-me-password`).
- Généré : 2 écoles, 5 professeurs + 10 élèves/école, cours de démo, positions/médias, blessures types.

## Déploiement Render
- Build : `npm install && npx prisma generate && npm run build`
- Start : `npm run start`
- Post-deploy : `npm run db:push && npm run db:seed`
- Variables : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NODE_VERSION=20`.

## Changelog
- v0.2.2 : filtres admin/positions/élèves, UI filtres harmonisée, pagination 10 items, page profil et navigation role-based. Voir `CHANGELOG.md`.
