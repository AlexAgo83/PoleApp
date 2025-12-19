# 02 — Instructions pour CODEX (prototype step-by-step)

Objectif : prototyper rapidement une **web app** (responsive) validant le MVP :
- Base positions
- Fiches cours / fiches élève
- Blessures
- Mini-jeu photo→nom
- Rôles & accès

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
- Run dev : `npm run dev` (ou `docker compose watch` pour hot-reload conteneur)
- DB : `npm run db:push` puis `npm run db:seed`
- Deploy : `render.yaml` (service web + Postgres), build `npm install && npx prisma generate && npm run build`, start `npm run start`

Structure proposée :
- `/app` routes
- `/lib` helpers (auth, rbac, db, seed)
- `/components` UI
- `/prisma` schema + seed

---

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

## Règles de qualité (obligatoires)

- Pas de “gros refacto” : petites PR/commits par step
- Chaque page doit afficher :
  - états loading/error
  - permissions denied proprement
- Aucun secret en dur
- Seed data stable (idempotent)

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
