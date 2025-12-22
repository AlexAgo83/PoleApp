# Pole App — Produit v0.5.1 (Steps 0 → 9)

Web app Next.js (App Router) pour gérer positions, élèves, cours, progression et mini-jeux, avec navigation par rôle et pagination. Steps 0→9 livrées (Discovery QA incluse) et tag `v0.5.1` en cours. Phase produit enclenchée : fiabilité/ops, sécurité, observabilité, perf et préparation billing/credits deviennent obligatoires dans chaque Step. Uploads médias prévus via Cloudinary (cf. backlog dédié).

## Phase produit — exigences transverses
- Tests renforcés (units + intégration/contract quand pertinent), migrations rétro-compatibles avec backfill et garde-fous données. Seed idempotent.
- Observabilité : logging structuré, métriques/health checks actionnables, alertes pour erreurs/latences, traces sur actions sensibles.
- Fiabilité/perf : budgets (TTFB/CLS/LCP côté web), pagination 10 items par défaut, requêtes Prisma indexées, feature flags/dark launch.
- Sécurité/PII : secrets hors code, RBAC déjà en place, audit trail à intégrer sur actions sensibles, validations zod côté serveur.
- Média : intégrer Cloudinary quand on ouvrira les uploads (avatars, photos cours/positions), avec signatures côté serveur et stockage des URLs/public_id.

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
- Page profil `/app/profile` : consultation email/rôle/école, édition prénom/nom/âge/photo (placeholder si vide).
- Prof : diplômes + positions préférées éditables (multi-sélection) et visibles sur la fiche publique.
- Fiche prof publique `/app/teachers/[id]` (photo/diplômes/positions préférées), accessible aux élèves ayant eu cours avec ce prof (`/app/student/teachers`).
- Homepage “Modules” épurée (panels statut/nouveautés retirés) et inclut la carte Profile.
- Panneaux de filtres : repliés par défaut avec état mémorisé localement (localStorage).

## École (élève)
- Page école `/app/student/school` enrichie : studios/partenaires et agenda de l’école (vues semaine/mensuelle, filtres studio/prof/date/recherche/« mes cours », légende code couleur, prochains cours).
- Liens rapides vers la liste/agenda élève et navigation mois/semaine sans scroll horizontal en mobile.

## Positions
- `/positions` : liste 2 colonnes (élève/prof/admin) + bandeau + retour contextuel `from`.
- Détail `/positions/[id]` partageable; bouton “Éditer” pour Professeur/Admin.
- CRUD : `/teacher/positions/new` et `/teacher/positions/[id]/edit` (Professeur/Admin).
- Médias : image placeholder si absent, vignettes 2 colonnes sur la liste.

## Blessures & progression
- Élève : `/app/student/injuries` (CRUD, pagination 10) ; `/app/student/progress` (pagination 10).
- Prof/Admin : blessures et progression visibles/editables sur `/app/teacher/students/[id]`; retour vers la liste.

## Cours / Facturation
- Prof/Admin : `/app/teacher/courses` (tri décroissant, pagination 10), création `/new`, détail, édition, photos optionnelles (placeholder si absent) et bouton “Voir le cours”. Agenda mensuel + vue semaine (enseignant/admin) avec filtres persistés.
- Facturation admin : `/app/admin/billing` (Invoice par cours, filtres date/prof/studio/statut, export CSV, actions statut/montant/note, backfill factures manquantes).
- Facturation prof : `/app/teacher/billing` (lecture seule des factures de ses cours, filtres date/studio/statut).
- Élève : `/app/student/courses` historique (pagination 10) + détail, mêmes layouts/photos et CTA ; agenda semaine/mois dédié (`/app/student/courses/agenda`) aligné mobile/desktop.
- Détail cours correct par id; updates progression lors de la création/édition.

## Mini-jeu
- `/app/student/game` : quiz photo → nom sur positions débloquées (ou toutes si premium).

## Admin école
- `/app/admin` : stats école, actions rapides, vue semaine des cours de l’école.
- `/app/admin/users` : CRUD users (rôle, premium, mot de passe), pastilles rôle/premium harmonisées, pagination.
- `/app/admin/studios` et `/app/admin/partners` : filtres persistés, cellules remaniées, pagination.
- `/app/admin/teachers` : liste profs avec filtres persistés.

## Pagination (v0.2.2)
- Listes dynamiques paginées par 10 : cours élève/prof, progression élève, blessures élève, liste élèves prof/admin.

## Santé & diagnostics
- `/health` (200 OK), logs DB Prisma.
- En cas de panics Turbopack : supprimer `.next/.turbo` et/ou `NEXT_USE_TURBOPACK=0`.

## Seeds (dev)
- Comptes : `admin@poleapp.test`, `teacher@poleapp.test`, `student1@poleapp.test`, `student2@poleapp.test` (`change-me-password`).
- Généré : 2 écoles, 5 professeurs + 10 élèves/école, cours de démo, positions/médias, blessures types.

## Déploiement Render
- Build : `npm install && npm run db:migrate:deploy && npm run build` (migrations squashées en init, pas de baseline nécessaire sur DB neuve).
- Start : `npm run start:render` (start-auto : migrate deploy → fallback db push → seed si base vide → start). Identifiants seed : `admin@poleapp.test / change-me-password`.
- Variables : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NODE_VERSION=20`.
- Prisma : config dans `prisma.config.js` (seed `tsx prisma/seed.ts`).
- Cache build : pour éviter l’avertissement “No build cache found”, activer le cache de build sur Render (Persistent build cache) ou conserver `.next/cache` entre builds. Si warning “middleware” : migrer vers `proxy` à terme.

## Quick wins (perf/UX)
1) Move list images (courses/users/teachers) to `next/image` with `loading="lazy"`, explicit sizes, and placeholders to reduce CLS and transfer size.
2) Add Prisma indexes on filtered columns: `user(role, isPremium)`, `user(email, name)`, `course(schoolId, date, teacherId, studioId)` to speed up lists/agenda.
3) Limit Prisma `select` to fields actually rendered in lists (users/courses/studios) to reduce payload and speed up rendering.

## Changelog
- v0.4.6 : Panel filtres persistés par utilisateur, panels création admin repliables, harmonisation UI studios/partenaires/utilisateurs, versioning bump et préparations Cloudinary.
- v0.4.5 : Profils enrichis (photo, âge, diplômes, positions préférées prof) + fiches prof publiques accessibles aux élèves. Cours avec photos optionnelles, listes/détails alignés élèves/profs, filtres studios/partenaires/admin, avatars dans les listes (élèves/profs/users).
- v0.4.4 : Steps 0→9 livrées (Discovery QA terminée), passage en phase produit et tag `v0.4.4` figé comme baseline.
- v0.2.2 : filtres admin/positions/élèves, UI filtres harmonisée, pagination 10 items, page profil et navigation role-based. Voir `CHANGELOG.md`.
