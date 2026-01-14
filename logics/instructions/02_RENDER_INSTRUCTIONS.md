# Bonnes pratiques avant push Render
> Aligné v0.12.11 (prod Render)

- **Schéma Prisma** : il n’y a pas de migrations versionnées. Toute évolution du schéma doit être poussée via `prisma db push`. Toujours tester en local (`npm run db:push && npm run db:seed && npm run build`) avant de pousser. La connexion doit inclure le schéma applicatif (`.../poleapp?schema=poleapp`) pour ne pas toucher d’autres apps partageant la même base.
- **Commande build Render** : `npm install && npm run db:migrate:deploy && npm run build`. `db:migrate:deploy` appelle `ci-migrate-deploy` (fait un `prisma db push` + crée le super-admin).
- **Commande start Render** : `npm run start:render`. Ce script :
  - force le schéma (`npm run db:push`),
  - régénère le client Prisma,
  - seed **uniquement si la base est vide** (0 école et ≤1 user, ce qui ignore le super-admin isolé),
  - refuse de démarrer si la base reste vide.
- **Variables Render à vérifier** : `DATABASE_URL` (Postgres Render), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `DATABASE_SEED_PWD`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`. Sans `DATABASE_URL`, le build échoue dès Prisma.
- **Turbopack** : en cas de panic, nettoyer `.next/.turbo` et lancer `NEXT_USE_TURBOPACK=0 npm run build` (déjà forcé à 0 dans `start-auto`).
- **Middleware** : Next.js signale la dépréciation de `middleware.ts`; prévoir un passage à `proxy` pour supprimer l’avertissement.

## Reset de schéma applicatif (DB partagée)
- Commande : `npm run db:reset:schema`. Drop + recreate du schéma pris dans `DATABASE_URL`, `db:push`, puis seed. Refus automatique en prod ou si le schéma vaut `public` sans `SCHEMA_RESET_FORCE=1`.
- Usage : uniquement si vous voulez repartir d’une base seedée pour PoleApp sans toucher les autres schémas de la même base. Vérifier `DATABASE_URL` avant de lancer.

## Changer le schéma Prisma (procédure courte)
1) Modifier `prisma/schema.prisma` (ex: indexes, colonnes Cloudinary), puis `npx prisma generate`.
2) Vérifier en local : `npm run db:push && npm run db:seed && npm run build`.
3) Synchroniser la prod avant déploiement : `DATABASE_URL="<render-url>" npx prisma db push` (pas de `--accept-data-loss`).
4) Commiter le schéma (pas de dossier migrations à ce stade) et pousser : Render rejouera `db push` et le seed ne tournera que si la base est vide.

## Tests obligatoires avant tout déploiement Render
- `npm test`
- `npm run lint`
- `npm run build`

Ces trois commandes doivent passer localement ou en CI avant d’initier un déploiement Render.

## En cas de divergence prod
- Si une colonne manque (P2022/P3005), exécuter `DATABASE_URL="..." npx prisma db push` sur la base Render puis relancer un build.
- Pas de reseed automatique : pour reseeder, vider la base (aucune école, max un user) ou la recréer puis redéployer.
