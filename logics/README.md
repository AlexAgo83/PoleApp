# Pole App — Pack Markdown (Backlog + Instructions Codex) — v0.8.1
> Doit rester à jour avec le projet (backlogs, changelog, modèles, routes).

## Contenu principal
- `backlog/`: backlogs par Step/feature (S000–S007, Cloudinary, Mapbox…)
- `models/03_DATA_MODEL.md`: modèle de données à jour (Prisma/Postgres)
- `models/04_ROUTES_AND_SCREENS.md`: écrans & routes actuelles
- `models/05_SEED_CONTENT.md`: rappel seed (comptes fixes, écoles, cours)
- `instructions/`: consignes Codex/Render (02_CODEX_INSTRUCTIONS.md, 02_RENDER_INSTRUCTIONS.md)
- `foundry/`: DRY plans (ex. facturation) et autres docs support
- `CHANGELOG.md`: journal des versions
- `README.md`: ce fichier

## État produit (v0.8.1)
- Auth/RBAC + profils (élève/prof/admin) avec préférences (cœurs) prof/élève.
- Positions : progression/blessures/mini-jeux + upload vidéo Cloudinary authentifié (URL signées), muscles/articulations reliés, filtres multi-disciplines.
- Cours : présence/attente, notes, générateur (règles d’enchaînement, raisons, favoris), badges “appliqué”.
- Agendas semaine inline (Admin/Teacher/Student) + bouton “Semaine actuelle”.
- Facturation : `Invoice` + UI admin (statuts, export CSV) + lecture prof ; achats élèves (packs/abos/presets) listés côté admin/prof.
- Partenaires : CRUD + liens sponsorisés + tracking PartnerEvent (clic/achat).
- Presets/combos vidéo : CRUD admin/prof, catalogue élève, achat en crédits/premium, images + vidéos.

## Stack / scripts
- Next.js App Router, Prisma Postgres, NextAuth Credentials, Tailwind.
- Scripts : `npm run db:migrate:deploy` (via ci-migrate-deploy), `npm run db:push`, `npm run dev`, `npm run start:render`.
- Seed idempotent : 2 écoles, comptes fixes (admin/teacher/student1/2, mdp `change-me-password`), studios/photos, cours démo, progression/blessures/favoris, disciplines Pole/Pole Exotic/Souplesse/Pilates/Conditioning, muscles/articulations liés, positions attribuées à des profs seedés et cours répartis entre profs sans collisions.

## À maintenir
- Tenir à jour : backlogs, changelog, modèles (`models/03_DATA_MODEL.md`), routes (`models/04_ROUTES_AND_SCREENS.md`), instructions.
- Références internes : privilégier les fichiers sous `logics/models/` et `logics/instructions/` (anciens chemins `logics/0x_*.md` supprimés).
