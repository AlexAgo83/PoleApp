# Backlog — Retours QA S005 (session 2025-12-21 01:15)
[Compréhension: 60% / Avancement: 0%]

Source: 06_QA_S005.md (tests faits sur v0.4.5)

## Tâches
- [ ] Teacher > École : ajouter vue agenda pour les cours à venir (planning par studio) + filtres (niveau, prof, date, discipline, studio).
- [ ] Teacher > Cours : ajouter générateur de cours (outil de création rapide ? à préciser) ; afficher le niveau atteint par chaque élève pour chaque position dans la fiche cours ; rendre les élèves cliquables.
- [ ] Teacher > Positions : retirer l’encadré “gating”.
- [ ] Teacher > Facturation : créer l’onglet/fonctionnalités (inexistant actuellement) — clarification requise.

## Definition of Done (DoD)
- Vue agenda des cours à venir accessible dans l’onglet École (planning par studio) avec filtres niveau/prof/date/discipline/studio fonctionnels.
- Fiche cours enrichie : niveau atteint par élève/position visible, élèves cliquables (vers fiche élève), générateur de cours disponible (scope à clarifier).
- Section Positions sans encadré “gating”.
- Onglet Facturation présent avec au moins le squelette initial (ou backlog/placeholder si specs manquantes) et navigation accessible.

## Tests / Vérifications
- QA manuel Teacher : navigation École → vue agenda des studios, filtres agissent sur les cours listés.
- QA manuel Teacher : fiche cours affiche niveaux par élève/position, liens vers fiches élèves, générateur utilisable.
- UI Positions Teacher : plus d’encart gating.
- Facturation : onglet accessible sans erreur ; contenu minimal validé ou backlog visible si en attente de specs.
