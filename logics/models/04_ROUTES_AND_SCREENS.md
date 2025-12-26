# 04 — Écrans & routes (v0.7.x)
> Routes actuelles (App Router). Pagination 10 sur les listes, filtres persistés côté client quand c’est pertinent.

## Public
- `/` landing, `/login`, `/signup` (formulaire), `/health`

## Positions (shared authentifié)
- `/positions`, `/positions/[id]`
- `/teacher/positions/new`, `/teacher/positions/[id]/edit`

## Profil
- `/app/profile` : édition nom/âge/avatar ; prof/élève : positions préférées ; prof : diplômes ; aperçus favoris

## Élève
- `/app/student` dashboard
- `/app/student/courses` (liste) + `/app/student/courses/[id]` (détail)
- `/app/student/courses/agenda` : vue mois + semaine inline, filtres (date, prof, studio, discipline, recherche, “mes cours”), bouton semaine actuelle
- `/app/student/progress`, `/app/student/injuries`, `/app/student/game`, `/app/student/teachers`, `/app/student/school` (studios/agenda école avec filtres studio/prof/discipline/recherche/mes cours)

## Professeur
- `/app/teacher` dashboard
- `/app/teacher/students`, `/app/teacher/students/[id]`
- `/app/teacher/courses`, `/app/teacher/courses/new`, `/app/teacher/courses/[id]`, `/app/teacher/courses/[id]/edit`, `/app/teacher/courses/agenda` (mois + semaine inline + bouton semaine actuelle)
- `/app/teacher/billing` (lecture invoices)
- `/app/teacher/school`

## Admin école
- `/app/admin` dashboard (vue semaine inline courses + bouton semaine actuelle)
- `/app/admin/users`, `/app/admin/teachers`, `/app/admin/studios`, `/app/admin/partners`, `/app/admin/school`
- `/app/admin/courses/[id]` (fiche cours admin)
- `/app/admin/billing` (facturation : filtres, actions statut, export CSV)
- `/app/admin/partners` (CRUD + tracking clic/achat), `/app/admin/studios` (CRUD)

## Super admin
- `/super-admin` (gestion écoles/offres/packs, reset mot de passe, audit)

## API principales
- Auth `/api/auth/[...nextauth]`
- Billing `/api/admin/billing/*`, `/api/teacher/*`
- Agendas semaine `/api/admin/week-courses`, `/api/teacher/week-courses`, `/api/student/week-courses`
- Partenaires `/api/partners/redirect` (tracking PartnerEvent + redirection)

## États UI
- Loading / Empty / Error / Access denied
- Pagination/filtre cohérents (persistés localStorage pour certains panels)
