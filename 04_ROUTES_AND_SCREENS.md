# 04 — Écrans & routes (MVP)

## Public
- `/` : landing + CTA login
- `/login` : auth

## Élève
- `/app/student` : dashboard (progress + prochains items)
- `/app/student/courses` : historique cours
- `/app/student/courses/[id]` : détail
- `/app/student/progress` : positions + statut/niveau
- `/app/student/injuries` : gérer blessures
- `/app/student/game` : mini-jeu photo→nom

## Prof
- `/app/teacher` : dashboard
- `/app/teacher/students` : liste élèves (de l’école)
- `/app/teacher/students/[id]` : fiche élève (progress + blessures)
- `/app/teacher/courses` : historique
- `/app/teacher/courses/new` : créer cours + notes
- `/teacher/positions` : gestion positions (legacy public prefix)
- `/teacher/positions/new` : créer
- `/teacher/positions/[id]/edit` : éditer

## Admin école
- `/app/admin` : dashboard
- `/app/admin/users` : CRUD users
- `/admin/settings` : (option) taxonomies

---

## États UI à prévoir partout
- Loading state
- Empty state (aucun cours, aucune position)
- Error state (serveur)
- Access denied (RBAC)
