# Agendas — API semaine/mois (élève/teacher/admin)
[Aligné v0.14.0 | Compréhension: 85% | Confiance: 75% | Avancement: 100% | Portée: `/api/*/week-courses`, `/api/*/month-courses` + UI agendas]

## Objectif
- Décrire les agendas semaine/mois pour élèves, profs et admins.

## Périmètre (in/out)
- (in) APIs : `/api/admin/week-courses`, `/api/teacher/week-courses`, `/api/teacher/month-courses`, `/api/student/week-courses`, `/api/student/month-courses`.
- (in) UI : `/app/student/courses/agenda`, `/app/teacher/courses/agenda`, `/app/admin` (vue semaine), agenda école `/app/student/school`.
- (out) Export ICS global (hors `/api/courses/[id]/ics`).

## Règles fonctionnelles
- Filtres : semaine cible, teacher, studio, discipline, recherche, “mes cours”; mine=true (élève inscrit ou prof de ces cours).
- Navigation : semaine précédente/suivante + bouton “semaine actuelle”; borne possible (±8 semaines).
- Données : jours avec cours (titre, date, durée, discipline, studio, prof, statut perso, isVirtual).
- RBAC/scope : filtrage `schoolId` selon rôle ; teacher API restreint au teacher courant ; student API restreint à l’élève.
- Badges désactivation : si entités inactives → badge “Désactivé”, inscriptions nouvelles bloquées.
- Perf : cache no-store ; fenêtre temporelle limitée.

## UX cible
- Composant WeekView/MonthView : header semaine, boutons ← actuelle →, grille jours ; badges inscrit/waitlist, studio ou “En ligne”.
- Filtres persistés (localStorage) sur certaines surfaces.
- Agenda prof fiche élève (si livré) : même visuel que “Planning - Agenda de l’école”.

## Données / technique
- Requêtes Prisma filtrées par teacher/studio/discipline/date range ; regroupement par jour.
- Respect schoolId ; statut perso via attendances.
- Limiter navigation pour éviter dérive.

## Tests & QA
- Filtrage teacher/studio/discipline/mine OK ; navigation semaine OK.
- RBAC : élève voit son école et ses statuts ; teacher ses cours ; admin son école.
- Badges désactivation visibles.
- Agenda prof fiche publique : filtre teacherId non contournable (si implémenté).

## Risques / points ouverts
- Borne de navigation exacte ; inclusion des jours passés à clarifier.
- Persist des filtres : surfaces exactes à confirmer.

## Sources
- Routes/APIs : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Code : `app/student/courses/agenda`, `app/teacher/courses/agenda`, `app/admin` agenda, APIs agendas.***
