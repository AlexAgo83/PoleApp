# Positions — listing & édition
[Aligné v0.14.0 | Compréhension: 90% | Confiance: 85% | Avancement: 100% | Portée: `/positions` + CRUD prof/admin]

## Objectif
- Décrire la consultation des positions et leur gestion par les rôles habilités.

## Périmètre (in/out)
- (in) Routes : `/positions`, `/positions/[id]`, `/teacher/positions/new`, `/teacher/positions/[id]/edit`.
- (in) Filtres/liste/détail, création/édition prof/admin, favoris prof, progression élève affichée.
- (out) Workflow d’approbation communautaire ou versions multiples.

## Règles fonctionnelles
- Accès : authentification requise pour `/positions`; création/édition réservée aux profs/admins.
- Liste : pagination (12), filtres type/level/discipline, recherche texte, filtre créateur (teacher), filtre “déverrouillées” (positions accessibles via achats presets ou cours suivis pour l’élève), filtre favoris (élève).
- Progression : pour l’élève connecté, badge de statut (Nouveauté/Initié/Passé/Fluide chorégraphié) sur les cartes si progression existante.
- Détail : médias photo (Cloudinary), description, niveau/type, discipline, tips/grips ; accès lecture pour tous les authentifiés ; bouton retour supporte `?fromCourse=` (priorité retour au cours d’origine) puis `?from=` (liste/agenda), fallback `/positions`.
- Favoris prof : positions coups de cœur visibles sur fiche prof ; gestion côté fiche prof.
- RBAC : teacher/admin peuvent créer/éditer ; lecture pour tous les rôles ; scope école implicite via data (positions liées à l’école).

## UX cible
- Liste : header “Positions”, légende statuts progression, filtres persistés (`storageKey=filters:positions`), navigation page précédente/suivante, cartes avec image, badges type/niveau/discipline, badge progression.
- Détail : image (placeholder si absent), infos textuelles, tips/grips, niveau/type/discipline affichés.
- Création/édition : formulaires prof/admin (titre, description, niveau/type/discipline, médias…).
- Liens rapides : bouton “Créer” visible pour prof/admin ; lien Combos vers `/presets`.

## Données / technique
- Modèle `Position` : nom unique, description, levelRequired, type, disciplineId/discipline, grips?, tips?, contraindications?, createdByUserId.
- Relations : `PositionMedia` (photo), progression `StudentPositionProgress`, favoris prof (`TeacherFavoritePosition`), discipline (nom/couleur).
- Filtres : Prisma where sur type/level/q/teacher/disciplineIds ; pagination take/skip 12.
- Unlock : pour l’élève, filtre `unlocked` basé sur positions liées à des presets achetés (Purchase kind PRESET) ou cours suivis (CourseAttendance CONFIRMED).
- Favoris : filtre favorites basé sur `StudentFavoritePosition`.
- Dynamic rendering : page positions force-dynamic.

## Tests & QA
- Accès : redirection login si non authentifié ; prof/admin peuvent créer/éditer.
- Filtres : type/level/discipline/recherche/teacher/favorites/unlocked fonctionnent et persistés ; pagination OK.
- Progression : badges correspondants aux statuts de l’élève connecté.
- RBAC : “Créer” visible uniquement pour prof/admin ; lecture OK pour autres rôles.
- Médias : placeholder si pas de photo ; Cloudinary publicId utilisé.

## Risques / points ouverts
- Scope école implicite : confirmer filtrage si multi-écoles.
- Gating premium : la page montre un bouton upsell caché ; confirmer règles d’accès catalogue.

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md` (Position, PositionMedia, StudentPositionProgress, TeacherFavoritePosition).
- Code : `app/positions/page.tsx`, `app/positions/[id]/page.tsx`, `app/teacher/positions/*`.***
