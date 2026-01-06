# Agendas — API semaine/mois (élève/teacher/admin)
[Aligné v0.15.0 | Compréhension: 100% | Confiance: 95% | Avancement: 100% | Portée: `/api/*/week-courses`, `/api/*/month-courses` + UI agendas]

## Objectif
- Décrire les agendas semaine/mois pour élèves, profs et admins.

## Périmètre (in/out)
- (in) APIs : `/api/admin/week-courses`, `/api/teacher/week-courses`, `/api/teacher/month-courses`, `/api/student/week-courses`, `/api/student/month-courses`.
- (in) UI : `/app/student/courses/agenda`, `/app/teacher/courses/agenda`, `/app/admin` (vue semaine), agenda école `/app/student/school`.
- (out) Export ICS global (hors `/api/courses/[id]/ics`).

## Règles fonctionnelles
- Filtres : semaine cible (clé ISO `YYYY-MM-DD` clampée au lundi), teacher, studio, discipline (multi), recherche, “mes cours”; mine=true (élève inscrit / prof concerné).
- Navigation : semaine précédente/suivante + bouton “semaine actuelle”; bornes non bloquantes côté UI mais plage semaine strictement 7 jours (lundi→dimanche).
- Données renvoyées par jour : `id`, `title`, `date`, `durationMinutes`, discipline (id + libellé), studio (nom), prof (nom/email), statut perso (myStatus/waitlistRank côté élève), `isVirtual`, `positionsCount`, indicateur désactivation source (studio/prof/disciplines désactivés).
- RBAC/scope : filtrage `schoolId` obligatoire. Teacher API : role TEACHER ou SCHOOL_ADMIN, teacherId optionnel mais jamais inter-école. Student API : role STUDENT, filtre schoolId (ou écoles assistées si `schools=all` + attendances). Admin API : même école que l’admin.
- Badges désactivation : si entités inactives → badge “Désactivé”, nouvelles inscriptions bloquées.
- Perf/cache : revalidate serveur 60s sur les routes agendas; invalidation via `revalidatePath` côté mutations (inscriptions/annulations/édition de cours).

## UX cible
- Composant WeekView/MonthView : header semaine, boutons ← actuelle →, grille jours ; badges inscrit/waitlist, studio ou “En ligne”.
- Filtres persistés (localStorage) sur certaines surfaces.
- Agenda prof fiche élève (si livré) : même visuel que “Planning - Agenda de l’école”.

## Données / technique
- Prisma `findMany` avec sélections restreintes (id/title/date/duration/isVirtual/disciplineId/teacher{nom/email}/studio{nom}/positionsCount), aucune inclusion attendances/positions sauf statut perso élève.
- Filtre date : semaine clampée (start lundi 00:00:00 → dimanche 23:59:59.999), tri asc.
- Discipline : filtre `OR` sur `disciplineId in []` ou champ texte `discipline` insensitive, enrichi par dictionnaire `disciplineNameById` issu d’un fetch dédié.
- Student `mine=true` : requête courseAttendance join course, flag `isMine` et `myAttendance` remplis; sinon `attendances` filtrées sur l’élève pour déterminer isMine.
- Revalidate TTL 60s exporté sur les handlers; actions de mutation responsables d’appeler `revalidatePath` sur les agendas concernés.

## Tests & QA
- Filtrage teacher/studio/discipline/mine OK ; navigation semaine clampée au lundi-dimanche ; next/prev calcule correctement weekKey.
- RBAC : élève limité à son école (ou écoles assistées si `schools=all` + attendances) ; teacher/admin limités à schoolId courant ; aucune fuite inter-écoles.
- Mine=true : `isMine` et `myAttendance` cohérents (status/waitlistRank), positionsCount présent, disciplines libellées.
- Cache : revalidate=60 présent sur toutes les routes agendas ; revalidatePath déclenché après mutation (inscription/annulation/édition cours).
- Badges désactivation visibles si teacher/studio/discipline désactivés.

## Risques / points ouverts
- Borne de navigation côté UI (plage ±8 semaines max ?) non verrouillée côté API ; à documenter si restreint.
- Persist des filtres : surfaces exactes à confirmer (localStorage sur certains écrans).

## Sources
- Routes/APIs : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Code : `app/student/courses/agenda`, `app/teacher/courses/agenda`, `app/admin` agenda, APIs agendas (revalidate=60, sélections restreintes).***
