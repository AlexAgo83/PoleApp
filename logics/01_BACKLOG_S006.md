# Backlog — Retours QA S006 (session 2025-12-21 23:55)
[Compréhension: 55% / Avancement: 0%]

Source : 06_QA_S006.md (tests sur v0.5.0)

## Tâches
- [ ] Admin > Studios/Partenaires : ajouter une vue consultation + bouton ✏️ pour passer en mode édition (au lieu d’édition directe).
- [ ] Admin > Élèves : n’afficher que les positions enseignées à l’élève (masquer les positions non commencées/non enseignées).
- [ ] Admin > Cours : aligner avec les retours espace Teacher (mêmes manques que Teacher cours).
- [ ] Admin > Positions : retirer l’encadré “gating”.
- [ ] Admin > Jeux : aligner avec l’espace Teacher (mêmes corrections/ajouts).
- [ ] Admin > Facturation : créer l’onglet/fonctionnalités (actuellement inexistant).

## Definition of Done (DoD)
- Studios/Partenaires : affichage en lecture seule par défaut, passage en édition via ✏️, sauvegarde OK.
- Élèves : liste des positions filtrée aux positions enseignées (aucune non-commencée hors scope enseigné).
- Cours/Jeux admin : parité fonctionnelle avec l’espace Teacher selon les retours précédents.
- Positions admin : plus d’encadré “gating”.
- Facturation : onglet accessible sans erreur, contenu minimal validé (ou placeholder clairement identifié si specs manquantes).

## Tests / Vérifications
- QA manuel Admin : studios/partenaires basculent lecture → édition via ✏️, sauvegarde et re-affichage en lecture.
- QA manuel Admin : onglet Élèves n’affiche que les positions enseignées, pas de “non commencée” hors scope.
- QA manuel Admin : onglets Cours et Jeux couvrent les mêmes fonctionnalités que Teacher (à valider selon tickets Teacher).
- QA manuel Admin : Positions sans bloc gating ; onglet Facturation accessible (pas d’erreur runtime).
