# Backlog — Retours QA S005 (session 2025-12-21 23:55)
[Compréhension: 90% / Avancement: 15%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

Source: 06_QA_S005.md (tests faits sur v0.5.0)

## Tâches
- [ ] Teacher > École : vue agenda (semaine + mensuel) par studio, états mobile/desktop, incluant cours passés et à venir. Filtres multiples : niveau, prof, date, discipline (types de cours ex. souplesse/pole exotic/pole gym), studio. Pagination ou scroll infini.
- [ ] Teacher > Cours : générateur de cours qui suggère positions selon élèves présents et leurs niveaux ; fiche cours affiche niveau atteint par élève/position (format badges/tableau), édition inline autorisée ; élèves cliquables vers leur fiche (prof et admin). (Voir BACKLOG_S004 — Générateur de cours (qa notes S004))
- [x] Teacher > Positions : supprimer l’encadré “gating”. (OK via vue commune /positions)
- [ ] Teacher > Facturation : onglet listant les cours donnés, tarif à facturer à l’école, état de facture (générée, envoyée, payée).

## Definition of Done (DoD)
- Onglet École : agenda semaine+mois par studio, filtres multi (niveau/prof/date/discipline/studio), inclut passé/à venir, pagination/scroll OK sur mobile/desktop.
- Fiche cours : niveaux élève/position visibles et éditables, élèves cliquables vers fiche ; générateur actif et propose des positions adaptées aux élèves inscrits.
- Positions Teacher : encadré “gating” supprimé.
- Facturation : onglet accessible listant cours donnés avec montant à facturer et statut (générée/envoyée/payée).

## Tests / Vérifications
- QA manuel Teacher : onglet École → agenda semaine/mois par studio, filtres agissent (niveau/prof/date/discipline/studio), passé/à venir visibles, pagination/scroll OK sur desktop/mobile.
- QA manuel Teacher : fiche cours affiche/édite niveaux élève/position (badges/tableau), élèves cliquables, générateur propose positions selon inscrits.
- UI Positions Teacher : encadré gating absent.
- Facturation : onglet affiche la liste des cours donnés, tarif à facturer et statut (générée/envoyée/payée) sans erreur runtime.
