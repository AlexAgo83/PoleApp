# 04 — Écrans & routes (MVP)

## Public
- `/` : landing + CTA login
- `/login` : auth

## Élève
- `/student` : dashboard (progress + prochains items)
- `/student/courses` : historique cours
- `/student/courses/[id]` : détail
- `/student/progress` : positions + statut/niveau
- `/student/injuries` : gérer blessures
- `/app/student/game` : mini-jeu photo→nom

## Prof
- `/teacher` : dashboard
- `/app/teacher/students` : liste élèves (de l’école)
- `/app/teacher/students/[id]` : fiche élève (progress + blessures)
- `/teacher/courses` : historique
- `/teacher/courses/new` : créer cours + notes
- `/teacher/positions` : gestion positions
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
