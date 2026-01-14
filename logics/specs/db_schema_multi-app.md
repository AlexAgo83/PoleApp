# DB partagée — schémas par app & reset ciblé
[Aligné v0.15.x | Portée: infra DB/ops PoleApp + autres apps partageant le même Postgres]

## Objectif
Permettre à PoleApp et aux autres apps d’utiliser une seule instance Postgres sans interférence, via un schéma dédié par app et une procédure de reset du schéma PoleApp sans toucher les autres.

## Périmètre (in/out)
- (in) Connexion Postgres avec `schema=<app>` dans `DATABASE_URL` (local, Docker, Render).
- (in) Commandes CLI : `db:push`, `db:seed`, `db:reset:schema`, `db:schema:ensure`.
- (in) Garde-fous prod/public pour le reset.
- (out) Partage de tables/données entre apps ; multi-tenant via RLS ; gouvernance users cross-app.

## Règles fonctionnelles
- Chaque app doit déclarer un schéma dédié dans `DATABASE_URL` (ex : `?schema=poleapp`). Aucune app ne doit pointer sur `public` en prod.
- Les commandes DB PoleApp n’agissent que sur le schéma ciblé par `DATABASE_URL`. Les autres schémas (autres apps) restent intacts.
- Reset : `db:reset:schema` drop + recreate uniquement le schéma ciblé, relance `db:push`, puis le seed. Refus si `NODE_ENV=production` ou `schema=public`, sauf `SCHEMA_RESET_FORCE=1`.
- Seed : `db:seed` utilise `tsx prisma/seed.ts` (pas `prisma db seed`). Échec si `DATABASE_SEED_PWD` absent.
- `db:push` crée le schéma si manquant (`db:schema:ensure`) avant de synchroniser Prisma.

## UX cible
- Ops/dev voient des commandes claires dans README/CLI. Reset renvoie des logs explicites (schéma ciblé, garde-fous).
- Aucun impact sur les autres apps : pas de drop global, pas de migration cross-schémas.

## Données / technique
- URL type : `postgresql://USER:PASSWORD@HOST:5432/poleapp?schema=poleapp`.  
  - Docker (`docker-compose.yml`) et `.env.example` sont déjà alignés sur `schema=poleapp`.  
  - Render : la `connectionString` fournie ne contient pas `schema=` ; surcharger avec `?schema=poleapp` dans l’UI ou via override env.
- Scripts npm :  
  - `db:schema:ensure` → crée le schéma si absent.  
  - `db:push` → ensure-schema puis `prisma db push`.  
  - `db:seed` → `tsx prisma/seed.ts`.  
  - `db:reset:schema` → drop/recreate schéma, `db:push`, `db:seed`, avec garde-fous.
- `start-auto.js` continue de pousser le schéma et seed uniquement si base vide (0 école, ≤1 user).
- Les autres apps doivent utiliser leur propre schéma (ex : `?schema=app2`) et éviter `public`.

## Tests & QA
- Local/Docker : `DATABASE_URL=...schema=poleapp npm run db:reset:schema` → vérifier via psql que seules les tables `poleapp.*` existent et que le seed crée 30 users / 2 schools.
- Render/staging : vérifier que `DATABASE_URL` inclut bien `schema=...` avant un déploiement ; exécuter `npm run db:push` ciblé pour confirmer le schéma.
- Garde-fou : tenter `schema=public` sans `SCHEMA_RESET_FORCE` doit échouer.

## Risques / points ouverts
- Erreur de schéma dans `DATABASE_URL` → reset sur le mauvais schéma (risque limité par regex et refus `public`, mais reste sensible si mauvais nom). Double-check avant reset.
- Seed destructif en prod : garder `SCHEMA_RESET_FORCE` à `0` par défaut et n’utiliser le reset qu’en environnement contrôlé.
- Pas de migrations versionnées : dépendance forte à `db push`; surveiller la compatibilité si d’autres apps utilisent des migrations classiques.
