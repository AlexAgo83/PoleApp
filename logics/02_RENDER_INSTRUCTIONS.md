# Bonnes pratiques avant push Render

- **Schéma Prisma à jour** : si le schéma change (ex. ajout de `School.website`), faire `DATABASE_URL=... npx prisma db push` sur un env local raccordé à la base Render avant de pousser. Sinon les colonnes manquantes provoquent des erreurs au runtime.
- **Nouvelles colonnes** (v0.4.6) : `User.age`, `User.avatarUrl`, `User.diplomas`, table `TeacherFavoritePosition`, `Course.maxSeats`, `Course.costCredits`, `Course.photoUrl`. Appliquer `DATABASE_URL="..." npx prisma db push` (ou `npm run db:migrate:deploy` si une baseline existe) avant déploiement Render.
- **Génération Prisma** : après modification du schéma, lancer `npx prisma generate` pour que le client soit à jour (Render le refera, mais cela détecte les soucis tôt).
- **Build de validation** : exécuter `npm run build` en local. En cas de panics Turbopack, nettoyer `.next/.turbo` et utiliser `NEXT_USE_TURBOPACK=0 npm run build`.
- **Variables d’environnement** : vérifier que `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` sont définies dans Render. Sans `DATABASE_URL`, Prisma échouera dès le chargement.
- **Cache Next/Turbopack** : éviter de pousser avec des caches corrompus; si des panics apparaissent, supprimer `.next` et refaire le build avant push.
- **Middleware** : la convention `middleware.ts` est dépréciée; quand on sera prêt, basculer vers `proxy` pour supprimer l’avertissement de build.

## Commandes Render actuelles (prod)

À renseigner dans Render (service web) :
- **Build command** : `npm install && npm run db:baseline:render && npm run db:migrate:deploy && npm run build`
  - But : baseliner la DB existante (P3005) puis appliquer les migrations. Une fois le baseline passé, tu pourras revenir à `npm install && npm run db:migrate:deploy && npm run build`.
- **Start command** : `npm run start:render`
  - `start:render` utilise `start-auto` : tente `db:migrate:deploy` (fallback `db:push`), puis **seed uniquement si la base est vide** (aucun `User`), vérifie l’état, puis lance `next start`. Pas de reseed si des données existent. En cas de base neuve, cela injecte les données de démo (admin@poleapp.test / change-me-password, etc.).
  - Si le baseline n’est pas encore appliqué, utiliser temporairement `npm run db:baseline:render && npm run db:migrate:deploy && npm run build` côté build pour éviter P3005.

## Procédure Render lorsqu’on change le schéma Prisma

1) **Préparer localement**
   - Modifier `prisma/schema.prisma`.
   - Générer le client : `npx prisma generate`.
   - Créer la migration : `npx prisma migrate dev --name <nom>` (ça met à jour votre BDD locale).
   - Lancer `npm run build` pour vérifier que le client est à jour.

2) **Valider sur la base Render avant le déploiement**
   - Se munir de la vraie `DATABASE_URL` Render.
   - Appliquer les migrations : `DATABASE_URL="<render-url>" npx prisma migrate deploy`.
   - Si vous n’avez pas de migrations et souhaitez juste synchroniser le schéma, utiliser `DATABASE_URL="..." npx prisma db push` (à éviter en production si cela supprime des colonnes).
   - Vérifier l’état : `DATABASE_URL="..." npx prisma migrate status`.
   - Pour cette version (maxSeats / costCredits / photoUrl sur Course + age/avatar/diplomas/TeacherFavoritePosition), lancer `npm run db:migrate:deploy` avec la `DATABASE_URL` Render avant le déploiement, puis `npx prisma generate`. Si la base Render ne possède pas d’historique, rester sur `db push` (commande build dans `render.yaml`).

3) **Commiter et pousser**
   - Commiter le schéma et le dossier `prisma/migrations/`.
   - Pousser sur Render. Le build passe avec `db push` (commande actuelle). Dès que possible, prévoir un baselining pour revenir à `migrate deploy`.

4) **En cas de rollback ou data loss**
   - Ne jamais passer `--accept-data-loss` sur la base Render sans sauvegarde.
   - Sauvegarder la base avant toute migration destructrice (dump Postgres).

5) **Rappels rapides**
   - Si une colonne manque en prod (erreur P2022), appliquer la migration ou `db push` immédiatement sur Render avant de redéployer.
   - Après modification du schéma, regénérer le client Prisma partout où vous développez (`npx prisma generate`).
