# Pole App — Pack Markdown (Backlog + Instructions Codex) — v0.12.11
> Doit rester à jour avec le projet (backlogs, changelog, modèles, routes).

## Contenu principal
- `backlog/`: backlogs par Step/feature (SXXX, Cloudinary, Mapbox…)
- `discovery/`: QA & QE (à compléter)
- `models/03_DATA_MODEL.md`: modèle de données à jour (Prisma/Postgres)
- `models/04_ROUTES_AND_SCREENS.md`: écrans & routes actuelles
- `models/05_SEED_CONTENT.md`: rappel seed (comptes fixes, écoles, cours)
- `instructions/`: consignes Codex/Render (02_CODEX_INSTRUCTIONS.md, 02_RENDER_INSTRUCTIONS.md)
- `knowledge/`: (à compléter)
- `foundry/`: DRY plans (ex. facturation) et autres docs support
- `CHANGELOG.md`: journal des versions
- `README.md`: ce fichier

## Phase produit (v0.12.x)
- Fiabilité/ops : migrations Prisma déployées (fallback db push désactivé en prod), seed idempotent, pagination 10 items par défaut.
- Observabilité : `/health`, logs Prisma ; audit trail à poursuivre sur actions sensibles.
- Sécurité/PII : RBAC middleware, validations zod serveur, secrets hors code, Cloudinary via signatures serveur.
- Perf/UX : budgets web (TTFB/CLS/LCP), images Cloudinary transformées, filtres persistés par utilisateur.

## État produit (v0.12.11)
- Auth/RBAC : NextAuth Credentials, middleware par rôle, redirections home par rôle, signup élève ouvert (premium optionnel).
- Profil : salutation/bandeau session, page `/app/profile` (email/rôle/école, prénom/nom/âge/photo), préférences prof/élève (cœurs) visibles sur fiche publique prof.
- Positions : progression/blessures (CRUD, pagination 10), mini-jeu, muscles/articulations liés, filtres multi-disciplines, vidéos Cloudinary authentifiées (signées).
- Cours & agendas : listes + détail alignés élève/prof/admin, agendas semaine/mois (élève/teacher/admin) avec filtres persistés, ICS dynamique avec timezone + alarme, annulation rembourse crédits et nettoie factures liées.
- Facturation/achats : `Invoice` par cours (admin : statuts, export CSV, backfill), lecture prof, achats élèves (packs/abos/presets) visibles côté admin/prof.
- Presets/combos : CRUD admin/prof, catalogue élève, achat crédits/premium, images/vidéos Cloudinary, filtres étendus + reset, pagination unique.
- Partenaires : CRUD + tracking clic/achat (PartnerEvent) + redirections partenaires.
- Notifications : menu cloche (supprimer/clear all, compteur), déduplication par user/kind/course, limite 50 en fetch.
- Média/Cloudinary : avatars (contrôles poids/résolution, fallback seed), headers/photos cours/studios/écoles/presets, placeholders, signatures et destruction via API.
- Seeds dev : comptes fixes (admin/teacher/student1/2, mdp `poleapp123`), 2 écoles (photos `sc_*`), studios, partenaires, 30 positions (vidéos Cloudinary), 40 cours avec factures, crédits 500/élève, disciplines Pole/Exotic/Souplesse/Pilates/Conditioning, muscles/articulations, presets avec médias.

## Stack / scripts
- Next.js 16 App Router, React 19, TypeScript, Tailwind v4.
- Prisma + PostgreSQL, NextAuth Credentials.
- Docker (multi-stage) + docker-compose ; déploiement Render via `render.yaml`.
- Scripts clés : `npm run db:migrate:deploy`, `npm run db:push`, `npm run db:seed`, `npm run dev`, `npm run start:render`.

## À maintenir
- Tenir à jour : backlogs (`backlog/*.md`), changelog, modèles (`models/03_DATA_MODEL.md`), routes (`models/04_ROUTES_AND_SCREENS.md`), instructions.
- Références internes : privilégier les fichiers sous `models/`, `backlog/` et `instructions/`
