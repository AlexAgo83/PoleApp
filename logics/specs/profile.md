# Profil utilisateur — infos perso & favoris
[Aligné v0.14.0 | Compréhension: 90% | Confiance: 85% | Avancement: 100% | Portée: `/app/profile`]

## Objectif
- Décrire l’écran profil permettant de voir/éditer les infos perso et préférences.

## Périmètre (in/out)
- (in) Route `/app/profile` pour utilisateurs connectés.
- (in) Champs : nom/prénom, âge, avatar, diplômes (prof), positions préférées (élève/prof), disciplines favorites (prof).
- (out) Gestion des rôles/schoolId, préférences avancées (notifications, etc.).

## Règles fonctionnelles
- Accès : authentifié uniquement ; retour login sinon.
- Édition : nom/prénom/âge/avatar éditables ; diplômes pour prof ; positions préférées pour élève/prof ; disciplines favorites (cap 5) pour prof.
- Upload avatar : via Cloudinary signé, contraintes poids/résolution, placeholder si absent.
- RBAC : un user édite son profil ; admin/super-admin peuvent éditer via leurs vues dédiées (hors profil).

## UX cible
- Bloc infos (avatar, nom, email, rôle, école).
- Sections favoris (positions coups de cœur), disciplines favorites (badges, cap 5, état vide).
- Form upload avatar avec feedback ; CTA sauvegarde.
- Bloc changement mot de passe côté prof (dans fiche prof) avec MDP actuel requis.

## Données / technique
- Modèle `User` : name, age, avatarPublicId, diplomas, role, schoolId, favoritePositions, favoriteDisciplines.
- Upload via `/api/uploads/signature` ; stockage `avatarPublicId`.
- Validation zod (min 8 chars pour MDP).

## Tests & QA
- Accès contrôlé ; redirection login sinon.
- Upload avatar respecte limites ; placeholder OK.
- Favoris ajout/retrait persistants ; disciplines favorites respectent cap 5.
- Changement MDP : échec si MDP actuel invalide ou mismatch ; succès sinon.

## Risques / points ouverts
- Édition d’un autre user par admin : hors périmètre ici (via vues admin/teacher).
- Règles premium sur favoris positions à clarifier si évolue.

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md`.
- Code : `app/profile/*`, fiche prof pour changement MDP.***
