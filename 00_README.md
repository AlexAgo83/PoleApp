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
- DB **SQLite** + **Prisma** (facile à migrer).
- Auth **NextAuth** (ou Clerk si vous préférez) + RBAC.
- UI **Tailwind** + composants simples.
- Stockage médias : local en dev, abstraction prête pour S3/Cloudinary ensuite.

> Si vous voulez partir direct sur du mobile, remplacez Next.js par Expo/React Native,
> mais le MVP “data + flows” est plus rapide à valider côté web.
