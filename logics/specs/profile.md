# Profil utilisateur — infos perso & favoris
[Aligné v0.14.1 | Compréhension: 95% | Confiance: 90% | Avancement: 100% | Portée: `/app/profile` + contacts externes]

## Objectif
- Décrire l’écran profil permettant de voir/éditer les infos perso et préférences.

## Périmètre (in/out)
- (in) Route `/app/profile` pour utilisateurs connectés.
- (in) Champs : nom/prénom, âge, avatar, diplômes (prof), positions préférées (élève/prof), disciplines favorites (prof), téléphone WhatsApp optionnel, username Instagram optionnel.
- (in) Boutons externes WhatsApp/Instagram visibles si données présentes.
- (out) Gestion des rôles/schoolId, préférences avancées (notifications, etc.), liaison OAuth IG/WhatsApp.

## Règles fonctionnelles
- Accès : authentifié uniquement ; retour login sinon.
- Édition : nom/prénom/âge/avatar éditables ; diplômes pour prof ; positions préférées pour élève/prof ; disciplines favorites (cap 5) pour prof ; téléphone WhatsApp optionnel ; username Instagram optionnel (vide = suppression).
- Boutons externes : visibles uniquement si la donnée est renseignée ; ouvrent dans un nouvel onglet (`wa.me/<phone_normalisé>`, `instagram.com/<username>/`) avec `rel="noreferrer noopener"`.
- Validation : téléphone nettoyé (espaces/()- retirés, `+` en tête toléré), 8–20 chiffres sinon erreur “Numéro WhatsApp invalide (8–20 chiffres, + optionnel)”. Instagram : regex `^[A-Za-z0-9._]{2,30}$`, sinon erreur “Username Instagram invalide (lettres/chiffres/._, 2–30 caractères)”.
- Upload avatar : via Cloudinary signé, contraintes poids/résolution, placeholder si absent.
- RBAC : un user édite son profil ; admin/super-admin peuvent éditer via leurs vues dédiées (hors profil).

## UX cible
- Bloc infos (avatar, nom, email, rôle, école) avec boutons WhatsApp/Instagram à droite alignés avec “Partager” (variant outline cyan) utilisant les icônes PNG fournies.
- Sections favoris (positions coups de cœur), disciplines favorites (badges, cap 5, état vide).
- Formulaire : champs téléphones/Instagram avec aide format, erreurs inline ; autres champs inchangés.
- Form upload avatar avec feedback ; CTA sauvegarde.
- Bloc changement mot de passe côté prof (dans fiche prof) avec MDP actuel requis.

## Données / technique
- Modèle `User` : name, firstName, lastName, age, phone?, instagramUsername?, avatarPublicId, diplomas, role, schoolId, favoritePositions, favoriteDisciplines.
- Normalisation téléphone côté serveur (retire séparateurs, + optionnel, garde 8–20 chiffres) ; validation Instagram regex.
- Boutons externes : icônes locales `/icons/whatsapp.png` et `/icons/instagram.png`; liens `wa.me/<phone>` / `instagram.com/<username>/`.
- Upload via `/api/uploads/signature` ; stockage `avatarPublicId`.
- Validation zod (min 8 chars pour MDP).

## Tests & QA
- Accès contrôlé ; redirection login sinon.
- Téléphone/Instagram : saisie valide → boutons visibles, liens corrects ; format invalide → message d’erreur, pas de sauvegarde ; champ vidé → valeur null et bouton absent au reload.
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
