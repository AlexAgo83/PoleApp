# 02 — Instructions pour CODEX (phase produit)

Objectif : faire évoluer une **web app** (responsive) livrée en v0.4.4 (Steps 0→9) vers un produit complet, en gardant la qualité produit sur chaque Step :
- Base positions
- Fiches cours / fiches élève
- Blessures
- Mini-jeu photo→nom
- Rôles & accès

## Mode produit — règles pour toute nouvelle Step
- Tests renforcés : units + intégration/contract lorsque des appels réseau/DB changent; couvrir RBAC et migrations (backfill + rollback).
- Observabilité : logging structuré, métriques/health checks actionnables, alertes pour erreurs/latences; traces sur actions sensibles (auth, seed, cours, progression).
- Fiabilité/perf : requêtes Prisma indexées/paginées, budgets Core Web Vitals (TTFB/LCP/CLS), feature flags/dark launch pour nouvelles surfaces.
- Sécurité/PII : secrets hors code, vérif inputs (zod), durcir RBAC, audit trail à instrumenter sur les actions écoles/prof.
- Delivery : migrations rétro-compatibles, scripts idempotents, docs/changelog mis à jour, seed cohérent avec les nouvelles features.

> CODEX : avance **étape par étape**. À chaque étape :
> 1) implémenter,
> 2) ajouter tests minimaux,
> 3) seed data,
> 4) capture “ce qui est fait” dans un changelog.

---

## Stack & conventions (implémentation actuelle)

- Next.js (App Router) + TypeScript
- Prisma + PostgreSQL (provider Postgres)
- NextAuth (credentials) + middleware RBAC (paths `/app/*`)
- Tailwind CSS
- Zod pour validation
- React Hook Form (optionnel) pour forms
- Testing: Vitest (unit)
- Run dev : `npm run dev` (ou `docker compose watch` pour hot-reload conteneur, target `dev` avec code + schema embarqués, sans bind mount)
- Si Turbopack panique : supprimer `.next`/`.turbo` puis forcer Webpack avec `NEXT_USE_TURBOPACK=0 npm run dev` (ou la variable dans Docker/Render).
- DB : `npm run db:push` puis `npm run db:seed` (les scripts pointent sur `prisma/schema.prisma`)
- Seed : 2 écoles (École 1/École 2) + 5 profs et 10 élèves par école (mot de passe `change-me-password`, premium 1/2) + comptes fixes admin/teacher/student1/2
- Deploy : `render.yaml` (service web + Postgres), build `npm install && npx prisma generate && npm run build`, start `npm run start`

Structure proposée :
- `/app` routes
- `/lib` helpers (auth, rbac, db, seed)
- `/components` UI
- `/prisma` schema + seed

---

Les Steps 0→9 ci-dessous constituent le socle livré (tag `v0.4.4`). S’appuyer dessus comme référence, mais appliquer les règles “Mode produit” ci-dessus pour toute évolution.

## Step 0 — Bootstrap projet (doit compiler)

**Tâches**
- Init Next.js TS + Tailwind
- Prisma init + SQLite
- Script seed (positions + 1 school + 1 teacher + 2 students)
- Pages: `/` + `/health`

**Definition of done**
- `npm run dev` OK
- `npm run db:seed` OK
- Home affiche liens vers modules

---

## Step 1 — Auth + RBAC

**Tâches**
- NextAuth credentials (email+password hash)
- Modèle User + School + Membership
- Middleware RBAC :
  - STUDENT: accès à ses pages
  - TEACHER: accès aux pages prof + élèves de son école
  - SCHOOL_ADMIN: accès admin école

**DoD**
- Login/Logout fonctionnels
- 3 comptes seed (admin/teacher/student) + switch facile
- Pages protégées : `/app/student`, `/app/teacher`, `/app/admin`

---

## Step 2 — Positions (CRUD + browse)

**Tâches**
- Modèles Position + Media + Taxonomies
- Routes :
  - `/positions` (liste + filtre)
  - `/positions/[id]` (détail)
  - `/teacher/positions/new` + edit (prof)
- “Access gating” :
  - Student free : seulement positions “unlocked”
  - Student premium : tout

**DoD**
- Un prof peut créer/éditer une position
- Un élève voit liste/détail selon ses droits
- UI simple et lisible

---

## Step 3 — Blessures élève

**Tâches**
- Modèles InjuryType + StudentInjury
- UI élève: `/app/student/injuries`
- UI prof: visible sur fiche élève

**DoD**
- CRUD blessures (actif/inactif)
- Permissions OK
- Seed: 1 blessure active pour un élève

---

## Step 4 — Fiche élève (progression par position)

**Tâches**
- Modèle StudentPositionProgress
- UI :
  - `/app/student/progress` (mes positions + états)
  - `/app/teacher/students/[id]` (profil + progression + blessures)
- Ops :
  - Prof peut modifier (niveau+statut+commentaire) pour une position

**DoD**
- Mise à jour OK
- Affichage propre (table + filtres)
- Historique simple (dernier état) pour MVP

---

## Step 5 — Fiche cours (création + impact progression)

**Tâches**
- Modèles Course + CourseAttendance + CoursePosition + CourseNote
- UI prof:
  - `/app/teacher/courses/new` (date, élèves, positions)
  - formulaire de notes élève x position
- À la validation :
  - Créer le cours
  - Créer notes
  - Upsert progression (position vue → IN_PROGRESS ou PASSED selon note)

**DoD**
- Créer un cours en < 2 minutes
- Vérifier que la progression élève est mise à jour automatiquement
- Student voit l’historique de cours `/app/student/courses`

---

## Step 6 — Mini-jeu (Photo → Nom)

**Tâches**
- Route `/app/student/game`
- Générer une session de 10 questions depuis pool autorisé
- UI quiz :
  - image
  - 4 choix (dont 1 correct)
  - score + récap fin
- Stocker GameSession + GameAnswer (optionnel MVP, mais utile)

**DoD**
- Jeu jouable de bout en bout
- Score calculé
- Pool correct (student = unlocked positions)

---

## Step 7 — Admin école (pilot)

**Tâches**
- `/app/admin/users` CRUD users (dans la school)
- `/app/admin` dashboard stats simples

**DoD**
- L’école pilote peut onboarder facilement profs/élèves

---

## Step 8 — Navigation par rôle (bandeau + espaces)

**Tâches**
- Harmoniser le bandeau (session, rôle, Accueil, Mon espace, logout) sur les pages clés.
- Afficher modules/actions par rôle (élève/professeur/admin) sur la homepage et les dashboards.
- Assurer les retours “← Retour” redirigent vers la bonne vue d’origine (positions, cours, etc.).

**DoD**
- Navigation cohérente pour les 3 rôles (CTA visibles, wording professeur).
- Retour vers la bonne liste après un détail (ex: positions prof/admin).
- Homepage liste les modules par rôle + health badge.

---

## Step 9 — Discovery QA (P1)

**Tâches**
- Suivre le plan détaillé `01_BACKLOG_STEP_009.md` (navigation/bandeaux, positions unifiées, context back, pagination/tri, profils et modules).
- Traiter le lot de retours QA regroupés dans la phase “Discovery QA”.
- Revérifier les écrans clés (home/modules, positions, cours, élèves, progression, profil) et corriger les usages `params`/`searchParams` sync.

**DoD**
- Retours QA appliqués et re-testés sur les écrans concernés selon `01_BACKLOG_STEP_009.md`.

---

## Règles de qualité (obligatoires)

- Pas de “gros refacto” : petites PR/commits par step
- Chaque page doit afficher :
  - états loading/error
  - permissions denied proprement
- Aucun secret en dur
- Seed data stable (idempotent)
- Migrations sécurisées (rétro-compatibles + rollback), observabilité active (logs/metrics), tests couvrant le RBAC et les parcours critiques.

---

## Livrables attendus

- Repo qui tourne en local
- Script seed
- README setup
- Screenshots (optionnel) ou mini walkthrough

---

## Notes (qu’on ne négocie pas)

- La vidéo live/VOD : **hors MVP** (à stubber seulement).
- Le générateur de cours : **V2** (après données fiables).
