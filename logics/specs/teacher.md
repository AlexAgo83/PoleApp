# Espace professeur — cours, élèves, presets
[Aligné v0.14.0 | Compréhension: 88% | Confiance: 80% | Avancement: 100% | Portée: `/app/teacher/*` + fiche publique prof]

## Objectif
- Décrire l’espace prof pour gérer cours/élèves/presets et préférences, plus la fiche publique.

## Périmètre (in/out)
- (in) Routes : `/app/teacher`, `/app/teacher/students`, `/app/teacher/students/[id]`, `/app/teacher/courses*`, `/app/teacher/courses/agenda`, `/app/teacher/presets*`, `/app/teacher/billing`, `/app/teacher/school`, `/app/teacher/partners`, `/app/teacher/purchases`, fiche publique `/teachers/[id]`.
- (in) APIs agendas : `/api/teacher/week-courses`, `/api/teacher/month-courses`.
- (out) Paiements/finance avancés (admin/super-admin).

## Règles fonctionnelles
- Scope école : données filtrées par `schoolId` ; super-admin bypass.
- Dashboard : résumé cours/élèves/presets.
- Cours : liste + création/édition ; agenda semaine/mois (bouton semaine actuelle) ; badges “Désactivé” si studio/discipline/prof inactif ; virtuel signalé.
- Élèves : liste/fiche élève (infos, progression/blessures) selon RBAC.
- Presets : CRUD ; duplication/import soumis aux flags droits prof.
- Droits prof (DRY17) : `canCreatePositionAndPreset` et `canDeletePositionAndPreset` gouvernent création/duplication/import/suppression de positions/presets.
- Billing prof : lecture des factures liées (pas d’actions).
- Profil prof : diplômes, favoris positions/discipline (cap 5), avatar ; changement MDP ; fiche publique partageable.
- Fiche publique : affiche favoris, disciplines, presets, agenda prof (si implémenté), bloc localisation.

## UX cible
- Dashboard avec cartes cours/presets/élèves.
- Agenda `/app/teacher/courses/agenda` : filtres date/studio/discipline/recherche/“mes cours”, nav semaine/mois.
- Form cours : date/durée/studio/discipline/prof, positions, maxSeats/costCredits, badges désactivation.
- Presets : grille/cards, CTA créer/dupliquer, masqués si droit off.
- Fiche publique : header avatar/email/école, diplômes, favoris, disciplines, presets, bouton partager, agenda prof.

## Données / technique
- Modèles : Course (+ CourseAttendance/Position), Preset (+ positions), User TEACHER, favoriteDisciplines (cap 5), favoritePositions, droits canCreate/canDelete, disabledAt/By.
- Agendas teacher filtrés sur teacherId + schoolId.
- Badges désactivation via flags disabled sur studio/discipline/user (DRY17).
- Uploads : avatars/presets via Cloudinary signature.

## Tests & QA
- RBAC : accès teacher ; super-admin OK.
- Cours : création/édition bloque entités désactivées ; agenda filtres/nav OK ; badges désactivation visibles.
- Presets : droits create/delete appliqués (duplication/import inclus).
- Fiche publique : visible, agenda prof filtré teacherId non contournable si présent.
- Disciplines favorites cap 5 ; changement MDP OK.

## Risques / points ouverts
- Étendue exacte des données élève visibles au prof vs admin.
- Billing prof : périmètre lecture/export à préciser.
- Agenda prof fiche publique dépend de DRY18 (si non livré, à noter).

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md`.
- Code : `app/teacher/*`, fiche publique `app/teachers/[id]/page.tsx`.***
