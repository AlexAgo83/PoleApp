# Backlog — Retours QA S007 (session 2025-12-21 23:55)
[Compréhension: 70% / Avancement: 75%]

Source : 06_QA_S007.md (tests sur v0.5.0)

## Tâches
- [ ] Student > École/Cours : vue planning/agenda (liste + agenda) avec modes semaine/mensuel visibles en mobile/desktop (et par studio si pertinent).
- [x] Student > Jeux : parité complète avec l’espace Teacher (6 modes, affichages, historique/leaderboard s’il existe), aucune restriction élève. (OK via `/app/student/game` accessible rôles)
- [x] Student > Cours : liste + agenda avec légende affichée en haut et code couleur clair pour différencier :
  - cours déjà suivis (passés),
  - cours inscrits (validation OK),
  - cours inscrits en liste d’attente (rang affiché, cours contingentés à 14 élèves),
  - cours disponibles et encore ouverts à l’inscription.
  Objectif : lecture immédiate, intuitive, sans effort cognitif.
- [ ] Ouvert : spécifier les filtres du planning élève (date/plage, prof, studio, type ?) et priorités P0/P1 + exigences responsives.

## Definition of Done (DoD)
- Vue agenda/planning accessible dans École et Cours (élève), modes semaine/mensuel, états cohérents sur mobile/desktop.
- Mini-jeux : UX identique à l’espace Teacher (6 modes, affichages, historique/leaderboard si présent côté Teacher).
- Liste/agenda des cours élève avec légende en haut, code couleur clair pour passé / inscrit / attente (rang affiché, quota 14) / disponible.

## Tests / Vérifications
- QA manuel élève : onglet École/Cours → agenda semaines/mois visible sur mobile/desktop ; navigation OK.
- QA manuel élève : onglet Jeux = même fonctionnalité que Teacher (6 modes, historique/leaderboard si présent).
- QA manuel élève : onglet Cours liste + agenda ; légende en haut ; code couleur par état ; liste d’attente affiche le rang (quota 14) sans ambiguïté.
