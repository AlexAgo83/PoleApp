# Espace professeur — cours, élèves, presets
[Aligné v0.14.1 | Compréhension: 88% | Confiance: 85% | Avancement: 100% | Portée: `/app/teacher/*` + fiche publique prof]

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
- Élèves : liste/fiche élève (infos, progression/blessures, contacts si fournis) selon RBAC.
- Presets : CRUD ; duplication/import soumis aux flags droits prof.
- Droits prof (DRY17) : `canCreatePositionAndPreset` et `canDeletePositionAndPreset` gouvernent création/duplication/import/suppression de positions/presets.
- Billing prof : lecture des factures liées (pas d’actions).
- Profil prof : diplômes, favoris positions/discipline (cap 5), avatar ; téléphone WhatsApp optionnel, username Instagram optionnel ; boutons externes conditionnels ; changement MDP ; fiche publique partageable.
- Fiche publique : affiche favoris, disciplines, presets, boutons contact (icônes locales PNG) alignés avec “Partager”, agenda prof (vue semaine filtrée teacherId, nav ± semaines), bloc localisation (école + studios/adresses/ville des cours à venir, mention “En ligne” pour cours virtuels).

## UX cible
- Dashboard avec cartes cours/presets/élèves.
- Agenda `/app/teacher/courses/agenda` : filtres date/studio/discipline/recherche/“mes cours”, nav semaine/mois.
- Form cours : date/durée/studio/discipline/prof, positions, maxSeats/costCredits, badges désactivation.
- Presets : grille/cards, CTA créer/dupliquer, masqués si droit off.
- Fiche publique : header avatar/email/école, diplômes, favoris, disciplines, presets, boutons WhatsApp/Instagram (si renseignés, icônes locales), bouton partager, agenda prof (bloc compact calqué sur planning école), bloc localisation listant écoles/studios/adresses/ville ou “En ligne” pour virtuels, état vide avec lien liste cours.
- Fiche élève : header avatar/email/école, badges premium/progressions vues, boutons contact si phone/IG fournis.

## Données / technique
- Modèles : Course (+ CourseAttendance/Position), Preset (+ positions), User TEACHER (phone?, instagramUsername?), favoriteDisciplines (cap 5), favoritePositions, droits canCreate/canDelete, disabledAt/By.
- Agendas teacher filtrés sur teacherId + schoolId.
- Agenda fiche publique : réutilise `/api/student/week-courses` filtré serveur sur `teacherId` + `schoolId`, nav semaine (fenêtre ±8-16 semaines).
- Badges désactivation via flags disabled sur studio/discipline/user (DRY17).
- Uploads : avatars/presets via Cloudinary signature.
- Boutons contact : liens `wa.me/<phone>` et `instagram.com/<username>/`, icônes `/icons/whatsapp.png` et `/icons/instagram.png`, `target=_blank` + `rel="noreferrer noopener"`.

## Tests & QA
- RBAC : accès teacher ; super-admin OK.
- Cours : création/édition bloque entités désactivées ; agenda filtres/nav OK ; badges désactivation visibles.
- Presets : droits create/delete appliqués (duplication/import inclus).
- Fiche publique : visible, agenda prof filtré teacherId non contournable (scope schoolId respecté), nav semaine OK, état vide avec lien liste cours ; bloc localisation affiche studios/ville ou “En ligne” pour virtuels ; boutons contact visibles uniquement si données.
- Disciplines favorites cap 5 ; changement MDP OK.

## Risques / points ouverts
- Étendue exacte des données élève visibles au prof vs admin.
- Billing prof : périmètre lecture/export à préciser.
- Agenda prof fiche publique dépend de DRY18 (si non livré, à noter).

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md`.
- Code : `app/teacher/*`, fiche publique `app/teachers/[id]/page.tsx`.***
