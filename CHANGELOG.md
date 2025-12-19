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

## 2025-12-19 — Step 5 (Cours)
- Formulaire création cours `/app/teacher/courses/new` (date/titre, élèves, positions, notes élève×position) avec mise à jour progression automatique.
- Liste des cours `/app/teacher/courses` (dernier 20) + historique élève `/app/student/courses`.

## 2025-12-19 — Step 6 (Mini-jeu)
- Route élève `/app/student/game` : quiz photo → nom (10 questions) sur les positions débloquées (ou toute la base si premium).
- Résumé score + correction détaillée en fin de partie; fallback message si <4 positions disponibles.
- Home mise à jour (modules + timeline) pour signaler Step 6 livrée.

## 2025-12-19 — Step 7 (Admin école)
- Dashboard admin `/app/admin` : stats école (utilisateurs par rôle, premium, cours, positions, blessures actives) + actions rapides.
- Gestion utilisateurs `/app/admin/users` : création prof/élève/admin (mot de passe, premium), mise à jour rôle/premium/nom, suppression (protégée si dépendances).
- Home/README mis à jour pour marquer l’étape livrée.

## 2025-12-19 — Step 8 (Navigation unifiée par rôle)
- Bandeau session/role/Accueil/Mon espace/logout harmonisé sur toutes les pages (élève, Professeur, Admin) avec badges session/rôle + CTA retour/connexion.
- Unification des écrans Positions : design Professeur appliqué à `/positions` (2 colonnes vignettes, bandeau visible, retour contextuel `from`), bouton “Éditer” réservé Professeur/Admin, création/édition via `/teacher/positions/new|[id]/edit`.
- Terminologie harmonisée (“Professeur”), marges panels normalisées, home mise à jour (steps, modules, nouveautés) pour refléter la nouvelle navigation par rôle.

## 2025-12-20 — Profil utilisateur & polish UI
- Ajout page profil `/app/profile` (consultation email/rôle/école/abonnement, édition du nom d’affichage) + server action `updateProfileAction`.
- Dashboards élève/prof : salutation personnalisée (prénom/nom/email fallback) avec bouton “Éditer” renvoyant vers le profil.
- Homepage modules : pastilles rôle/étape déplacées sous la description pour plus de lisibilité.

## 2025-12-21 — Maintenance & release v0.2.1
- Version bump `0.2.1` (README, homepage, package.json).

## 2025-12-21 — Pagination & release v0.2.0
- Version bump `0.2.0` (README, homepage, package.json).
- Pagination (10 items/page) généralisée : cours élève/prof, progression élève, blessures élève, liste élèves prof, liste cours prof (tri date desc).
- Navigation / positions : liste 2 colonnes partagée, bannière session/role/accueil partout, retour contextuel `from` préservé.
- Modules homepage : carte Profile ajoutée, “Status build” et “Modules” repliables par défaut, bandeau mis à jour.
- Changelogs/Routes/Backlog synchronisés (steps 0→8 livrées, Step 9 Discovery QA pilotée dans `01_BACKLOG_STEP_009.md`).
- Suites à cadrer après Step 9 : journal d’audit, contre-indications, badges/UX.

## 2025-12-22 — Step 9 (Discovery QA — navigation & login)
- Bannière session/rôle + Accueil/Mon espace/Logout ajoutée aux vues positions hors layout (`/positions/[id]`, création/édition position prof) + icône maison sur le bandeau des espaces.
- Page création de position refactorisée en serveur + formulaire client pour appliquer le RBAC avant affichage et offrir un retour rapide vers la liste.
- Page login enrichie avec des CTA de création de compte (élève/prof/admin) et rappel freemium/premium en attendant l’onboarding complet.
- Inscription self-serve élève via `/signup` (email + mot de passe + école, premium optionnel). Prof/Admin restent créés côté école.

## Roadmap prochaine
- Step 9 — Discovery QA : plan détaillé dans `01_BACKLOG_STEP_009.md` (navigation cohérente, pagination, profils/home).
- À cadrer ensuite : journal d’audit, contre-indications position/blessure, badges & polish UX.
