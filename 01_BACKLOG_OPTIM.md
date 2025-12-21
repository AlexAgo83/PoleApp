# Backlog — Optimisations navigation/rendus
[Compréhension: 80% / Avancement: 0%]

## Objectif
Réduire les re-render complets et accélérer la navigation (moins de requêtes, UI plus fluide) en tirant parti du cache Next/Prisma et de layouts persistants.

## Tâches
- [ ] Cartographier les pages forcées en `dynamic = "force-dynamic"` et décider lesquelles peuvent passer en cache (`revalidate` court) ou statique.
- [ ] Introduire `revalidate` (ex. 30–60s) sur les pages purement lecture (listes cours/positions/studios) + `cache()` ou tags de revalidation sur les fetchers réutilisés.
- [ ] Vérifier/preparer le prefetch des `<Link>` et factoriser des layouts persistants pour éviter le rerendu du chrome principal.
- [ ] Mesurer avant/après (LCP/TTFB/TBT dev + prod) sur 2–3 parcours clés (ex: /positions → fiche, /app/student/courses → agenda, /app/student/game sélection).

## Definition of Done (DoD)
- Pages lecture non critiques ne rerendent plus entièrement à chaque navigation ; données servies depuis cache revalidé.
- Prefetch actif sur les liens majeurs ; layouts communs restent stables lors des transitions.
- Aucune régression de données fraîches sur les pages mutables (admin/prof) grâce à revalidate court ou revalidation ciblée.

## Tests / Vérifications
- Navigation manuelle sur 3 parcours : affichage instantané sur retour arrière ou navigation inter-pages (positions, cours, studios).
- `npm run build` passe ; `npm run lint` sans erreurs.
- Observation console/devtools : moins de hits Prisma réseau, pas de warning cache.
