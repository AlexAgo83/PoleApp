# Auth & accès publics — login/signup/reset/verify
[Aligné v0.14.0 | Compréhension: 90% | Confiance: 85% | Avancement: 100% | Portée: flux auth + middleware RBAC]

## Objectif
- Décrire les flux d’auth (login/signup/reset/verify) et le middleware RBAC actuellement en place.

## Périmètre (in/out)
- (in) Routes publiques : `/`, `/login`, `/signup`, `/health`.
- (in) Auth Credentials NextAuth + middleware rôle/école sur `/app/*`, `/teacher/*`, `/admin/*`, `/super-admin*`.
- (in) Vérification email obligatoire, reset password, blocage des comptes désactivés.
- (out) Social login, 2FA, magic links.

## Règles fonctionnelles
- Rôles : STUDENT | TEACHER | SCHOOL_ADMIN | SUPER_ADMIN ; redirection home par rôle.
- Signup : champs prénom/nom/email/password + confirmation ; bouton œil pour MDP ; post-submit “Compte créé. Vérifie ton email…”.
- Vérification email : token valable 24h ; renvoi limité (3/24h) ; login refusé si `unverified` ; super-admin peut forcer la vérif/renvoi mail.
- Reset password : refus si compte `unverified` ou désactivé.
- Désactivation utilisateur : login refusé ; non assignable.
- Callback/`from` : chemins internes uniquement (nettoyés).
- Filtrage école : données app filtrées par `schoolId` de l’utilisateur ; super-admin bypass.

## UX cible
- `/login` : email/MDP, message si non vérifié/désactivé, CTA renvoi mail vérif (rate-limit).
- `/signup` : double champ MDP + icônes œil, message de confirmation.
- `/auth/verify` : affiche succès/échec, redirige vers home rôle.
- Reset : page demande email, message explicite si bloqué.

## Données / technique
- NextAuth Credentials ; middleware rôle.
- Modèle `User` : `verifiedAt`, `forcedVerifiedBy?`, `disabledAt/By?`, `role`, `schoolId`, `passwordHash`.
- `EmailVerificationToken` (validité 24h) ; rate-limit renvoi 3/24h.
- APIs : `/api/auth/[...nextauth]`, `/api/auth/reset`, `/auth/verify`.
- Sanitisation `callbackUrl/from` (pas de protocole externe/`//`).

## Tests & QA
- Signup : double MDP + œil + mail envoyé.
- Vérification : lien 24h, renvoi rate-limit, login bloqué si non vérifié ; force verify débloque.
- Reset : refus si non vérifié/désactivé ; OK sinon.
- Login : refus si non vérifié/désactivé ; redirection rôle OK ; callback nettoyé.
- Middleware : accès aux espaces selon rôle ; filtre schoolId appliqué ; super-admin bypass.

## Risques / points ouverts
- Deliverability mails vérif.
- Messages exacts (FR) à valider (login refusé, reset refusé, renvoi mail).

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md` (User, EmailVerificationToken).
- DRY 017 (signup/verif/désactivation/droits prof) livré.***
