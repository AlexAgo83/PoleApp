# 02 — Instructions pour CODEX (phase produit)
> Aligné v0.12.11

## Mode produit — règles pour toute nouvelle implémentation
- Tests renforcés : units + intégration/contract lorsque des appels réseau/DB changent; couvrir RBAC et migrations (backfill + rollback).
- Observabilité : logging structuré, métriques/health checks actionnables, alertes pour erreurs/latences; traces sur actions sensibles (auth, seed, cours, progression).
- Fiabilité/perf : requêtes Prisma indexées/paginées, budgets Core Web Vitals (TTFB/LCP/CLS), feature flags/dark launch pour nouvelles surfaces.
- Sécurité/PII : secrets hors code, vérif inputs (zod), durcir RBAC, audit trail à instrumenter sur les actions écoles/prof.
- Delivery : migrations rétro-compatibles, scripts idempotents, docs/changelog mis à jour, seed cohérent avec les nouvelles features.
- Média : quand on ouvrira les uploads (prof/élève/cours), intégrer Cloudinary (ou équivalent) avec upload signé et stockage des URLs en base.

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
- Run dev : `npm run dev` (ou `docker compose watch`), `NEXT_USE_TURBOPACK=0` si panics.
- Si Turbopack panique : supprimer `.next`/`.turbo` puis forcer Webpack.
- DB : `npm run db:push` puis `npm run db:seed` (schema `prisma/schema.prisma`).
- Seed v0.12.11 : 2 écoles (photos Cloudinary `sc_*` + URL par défaut), 5 profs + 10 élèves/école (500 crédits, premium 1/2), 30 positions (muscles + disciplines Pole/Pole Exotic/Souplesse/Pilates/Conditioning) avec vidéos Cloudinary authentifiées, 20 cours/école (durées multiples de 15 min — 30/45/60/75/90 — avec factures) avec photos Cloudinary `co_*`, favoris prof/élève, partenaire Amazon (4 liens produits), presets seed (images/vidéos Cloudinary). Comptes fixes admin/teacher/student1/2/super-admin (`DATABASE_SEED_PWD`).
- Deploy : Render (service web + Postgres), build `npm install && npm run db:migrate:deploy && npm run build` (script `ci-migrate-deploy` fallback db push si pas de migrations), start `npm run start:render` (db push + seed uniquement si DB considérée vide : 0 école et ≤1 user).

## Tests obligatoires avant tout déploiement (local/CI)
- `npm test` (Vitest)
- `npm run lint` (ESLint : corriger ou justifier les warnings)
- `npm run build` (Next.js + Prisma generate)

Ces trois commandes doivent passer avant chaque push ou déploiement Render pour réduire le risque de casse prod.

Structure proposée :
- `/app` routes
- `/lib` helpers (auth, rbac, db, seed)
- `/components` UI
- `/prisma` schema + seed