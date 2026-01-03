# 04 — Écrans & routes (v0.12.11)
> Routes App Router actuelles. Pagination 10 sur les listes, filtres persistés côté client quand c’est pertinent.

## Public
- `/` landing, `/login`, `/signup`, `/health`

## Positions (shared authentifié)
- `/positions`, `/positions/[id]`
- `/teacher/positions/new`, `/teacher/positions/[id]/edit` (prof/admin)

## Profil
- `/app/profile` : édition nom/âge/avatar ; prof/élève : positions préférées ; prof : diplômes ; aperçus favoris

## Élève
- `/app/student` dashboard
- `/app/student/courses` (liste 10) + `/app/student/courses/[id]` (détail)
- `/app/student/courses/agenda` : vue mois + semaine inline, filtres (date, prof, studio, discipline, recherche, “mes cours”), bouton semaine actuelle
- `/app/student/progress`, `/app/student/injuries`, `/app/student/game`, `/app/student/teachers`, `/app/student/school` (studios/agenda école avec filtres studio/prof/discipline/recherche/mes cours)
- `/app/student/purchases`, `/app/student/partners`

## Professeur
- `/app/teacher` dashboard
- `/app/teacher/students`, `/app/teacher/students/[id]`
- `/app/teacher/courses`, `/app/teacher/courses/new`, `/app/teacher/courses/[id]`, `/app/teacher/courses/[id]/edit`, `/app/teacher/courses/agenda` (mois + semaine inline + bouton semaine actuelle)
- `/app/teacher/billing` (lecture invoices)
- `/app/teacher/presets`, `/app/teacher/presets/new`
- `/app/teacher/school`, `/app/teacher/partners`, `/app/teacher/purchases`

## Admin école
- `/app/admin` dashboard (vue semaine inline courses + bouton semaine actuelle)
- `/app/admin/users`, `/app/admin/teachers`, `/app/admin/studios`, `/app/admin/partners`, `/app/admin/school`
- `/app/admin/courses/[id]` (fiche cours admin)
- `/app/admin/billing` (facturation : filtres, actions statut, export CSV)
- `/app/admin/partners` (CRUD + tracking clic/achat), `/app/admin/studios` (CRUD)

## Super admin
- `/super-admin` (gestion écoles/offres/packs, reset mot de passe, audit)
- `/logics` (lecture docs internes)

## API principales
- Auth `/api/auth/[...nextauth]`, reset `/api/auth/reset`
- Billing `/api/admin/billing/*`, `/api/teacher/invoices/*`, `/api/teacher/purchases/export`
- Agendas `/api/admin/week-courses`, `/api/teacher/week-courses`, `/api/teacher/month-courses`, `/api/student/week-courses`, `/api/student/month-courses`
- Uploads Cloudinary `/api/uploads`, `/api/uploads/signature`, `/api/uploads/signed-url`
- Courses `/api/courses/[id]/ics`
- Partenaires `/api/partners/redirect`
- Notifications `/api/notifications`, `/api/notifications/read`, `/api/notifications/delete`
- Health `/health`

## États UI
- Loading / Empty / Error / Access denied
- Pagination/filtre cohérents (persistés localStorage pour certains panels)
