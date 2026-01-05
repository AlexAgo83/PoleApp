# Espace élève — cours, progression, achats
[Aligné v0.14.0 | Compréhension: 88% | Confiance: 80% | Avancement: 100% | Portée: `/app/student/*`]

## Objectif
- Décrire l’espace élève pour consulter/réserver des cours, suivre progression/blessures, jeux, partenaires et achats.

## Périmètre (in/out)
- (in) Routes : `/app/student`, `/app/student/courses`, `/app/student/courses/[id]`, `/app/student/courses/agenda`, `/app/student/progress`, `/app/student/injuries`, `/app/student/game`, `/app/student/teachers`, `/app/student/school`, `/app/student/purchases`, `/app/student/partners`.
- (in) APIs agendas : `/api/student/week-courses`, `/api/student/month-courses`.
- (out) Paiement en ligne (géré ailleurs), messagerie prof-élève.

## Règles fonctionnelles
- Scope école : données filtrées par `schoolId` de l’élève ; session requise.
- Cours liste/détail : pagination 10, filtres date/prof/studio/discipline/recherche/“mes cours”; statut inscrit/waitlist visible ; bouton ICS `/api/courses/[id]/ics`.
- Agenda semaine/mois : nav semaine actuelle, filtres identiques aux listes, badges statut/studio/virtuel.
- Progression : vue positions avec statut + commentaire (synchro globale DRY16), pagination.
- Blessures : CRUD blessures de l’élève.
- Jeu : mini-jeu positions.
- Teachers : listing profs de l’école, lien fiche prof `/teachers/[id]`.
- School : info école + agenda école (planning).
- Purchases : achats (packs/abos/presets) et solde crédits (lecture).
- Partners : liste + redirection trackée.

## UX cible
- Dashboard : résumé cours à venir, crédits, progression/blessures.
- Liste/agenda cours : filtres persistés (localStorage), badges “Inscrit”/“Liste d’attente”, bouton semaine actuelle.
- Détail cours : infos prof/studio/discipline, positions, badges “Désactivé” si entités inactives, bouton ICS.
- Progression : cards avec statuts/badges commentaire.
- Blessures : formulaire simple actif/inactif.
- Teachers : cartes prof avec lien retour `from`.

## Données / technique
- Modèles : Course (+ CourseAttendance), StudentPositionProgress, StudentInjury, GameSession, Purchase, Partner/PartnerEvent.
- APIs agendas filtrées par schoolId, teacher, studio, discipline, mine, q.
- Badges désactivation (studio/discipline/user) via données cours.
- ICS : `/api/courses/[id]/ics` (filtre schoolId).

## Tests & QA
- RBAC : accès STUDENT seulement (super-admin bypass possible).
- Filtres/pagination agendas/listes OK ; bouton semaine actuelle.
- Statuts cours + badges désactivation visibles.
- Progression reflète globale ; blessures CRUD OK ; jeu accessible ; partners redirect OK.

## Risques / points ouverts
- Règles de réservation/paiement hors périmètre (voir facturation/cours).
- Détail des filtres progression à confirmer.

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md`.
- Code : `app/student/*`, APIs agendas student, ICS.***
