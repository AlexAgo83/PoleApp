# 05 — Seed content (MVP)

## Taxonomies

### Types
- SPIN
- TRICK
- TRANSITION
- WARMUP
- STRENGTH

### Niveaux requis (exemple simple)
- BEGINNER
- INTERMEDIATE
- ADVANCED

### Grips (exemple)
- CUP
- TWIST
- TRUE
- FOREARM
- ELBOW
- OTHER

## Injury types (exemples)
- Épaule
- Poignet
- Coude
- Bas du dos
- Genou

## Positions (exemples — placeholder)
> 10 positions “fake” suffisent pour le prototype.
Chaque position doit avoir au moins 1 image (placeholder URL) pour le jeu.

Exemple (format libre):
1. Fireman Spin — SPIN — BEGINNER — grips: TRUE
2. Chair Spin — SPIN — BEGINNER — grips: TRUE
3. Back Hook Spin — SPIN — INTERMEDIATE — grips: TRUE
4. Jasmine — TRICK — INTERMEDIATE — grips: CUP
5. Gemini — TRICK — INTERMEDIATE — grips: CUP
6. Scorpio — TRICK — ADVANCED — grips: CUP
7. Front Hook Transition — TRANSITION — BEGINNER
8. Basic Climb — STRENGTH — BEGINNER
9. Shoulder Mount Prep — STRENGTH — INTERMEDIATE (contre-indication épaule)
10. Warmup Flow 1 — WARMUP — BEGINNER

## Comptes seed (mot de passe `poleapp123`)
- admin@poleapp.test — SCHOOL_ADMIN (premium)
- teacher@poleapp.test — TEACHER
- student1@poleapp.test — STUDENT (free)
- student2@poleapp.test — STUDENT (premium)

## Écoles et utilisateurs générés
- 2 écoles créées : **École 1** et **École 2**.
- Pour chaque école : **5 profs** (`teacherX.ecole-1@poleapp.test`, `teacherX.ecole-2@poleapp.test`) et **10 élèves** (`studentX.ecole-1@poleapp.test`, `studentX.ecole-2@poleapp.test`), mot de passe `poleapp123`, premium pour 1 élève sur 2. Les noms affichés sont génériques (`Teacher X`, `Student X`).
- Les comptes fixes ci-dessus sont rattachés à **École 1**.
- 1 cours de démo créé par école (prof 1 + 3 élèves + 2 positions).

## Commandes de seed
- `npm run db:push` : synchro schéma Postgres.
- `npm run db:seed` : push + seed (idempotent). Lancé automatiquement par `docker-compose` et `render.yaml`.
