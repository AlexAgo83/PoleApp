# Backlog — Retours QA S007 (session 2025-12-21 23:54)
[Compréhension: 60% / Avancement: 0%]

Source : 06_QA_S007.md (tests sur v0.4.5)

## Tâches
- [ ] Student > École : ajouter la vue planning/agenda pour les cours à venir (pas seulement la liste).
- [ ] Student > Jeux : parité avec l’espace Teacher (mêmes modes/affichages/fonctionnalités).
- [ ] Student > Cours : proposer liste + vue planning avec code couleur explicite pour différencier :
  - cours déjà suivis (passés),
  - cours inscrits (validation OK),
  - cours inscrits en liste d’attente,
  - cours disponibles et encore ouverts à l’inscription.
  Objectif : lecture immédiate, intuitive, sans effort cognitif.

## Definition of Done (DoD)
- Vue agenda/planning accessible dans École et Cours (élève), avec données cohérentes (filtres/états). 
- Mini-jeux : UX identique à l’espace Teacher (modes, affichage, historique/leaderboard si déjà en place côté Teacher).
- Liste/agenda des cours élève avec code couleur clair pour chaque état (passé / inscrit / attente / disponible) et légende visible.

## Tests / Vérifications
- QA manuel élève : onglet École → planning visible des cours à venir ; navigation/filtre OK.
- QA manuel élève : onglet Jeux = même fonctionnalité que Teacher (modes et affichage des questions).
- QA manuel élève : onglet Cours liste + agenda ; légende couleurs ; chaque cours marqué par son état (passé, inscrit, attente, disponible) sans ambiguïté.
