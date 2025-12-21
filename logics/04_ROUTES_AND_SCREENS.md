# 04 — Écrans & routes (MVP)

## Public
- `/` : landing + CTA login
- `/login` : auth
- `/health` : ping de santé

## Positions (shared, authentifié)
- `/positions` : liste (2 colonnes) + bandeau session/role/accueil; accessible élève/Professeur/Admin.
- `/positions/[id]` : détail + retour contextuel (`from`) vers la liste d’origine; bouton “Éditer” visible seulement Professeur/Admin.
- `/teacher/positions/new` : création (Professeur/Admin).
- `/teacher/positions/[id]/edit` : édition (Professeur/Admin).

## Profil (shared)
- `/app/profile` : consultation email/rôle/école, édition prénom/nom (affichage).

## Élève
- `/app/student` : dashboard (progress + prochains items)
- `/app/student/courses` : historique cours (pagination 10, tri desc)
- `/app/student/courses/[id]` : détail
- `/app/student/progress` : positions + statut/niveau (pagination 10)
- `/app/student/injuries` : gérer blessures (pagination 10)
- `/app/student/game` : mini-jeu photo→nom

## Professeur
- `/app/teacher` : dashboard
- `/app/teacher/students` : liste élèves (de l’école, pagination 10)
- `/app/teacher/students/[id]` : fiche élève (progress + blessures)
- `/app/teacher/courses` : historique (pagination 10, tri desc)
- `/app/teacher/courses/new` : créer cours + notes
- `/app/teacher/courses/[id]` : détail
- `/app/teacher/courses/[id]/edit` : éditer

## Admin école
- `/app/admin` : dashboard
- `/app/admin/users` : CRUD users
- `/admin/settings` : (option) taxonomies

CTA retour : les pages modules clés incluent un lien “← Accueil” pour revenir à `/`.

---

## États UI à prévoir partout
- Loading state
- Empty state (aucun cours, aucune position)
- Error state (serveur)
- Access denied (RBAC)
- Pagination (page size 10) sur listes dynamiques ci-dessus
