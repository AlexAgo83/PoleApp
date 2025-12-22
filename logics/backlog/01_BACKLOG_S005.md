# Backlog — Retours QA S005 (session 2025-12-21 23:55)
[Compréhension: 95% / Avancement: 60%]
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
- [x] Teacher > Facturation (basé sur `Invoice`) :
  - Modèle : table `Invoice` liée à `Course` (courseId, amountCents, currency, status enum Générée/Envoyée/Payée/En retard/Annulée, issuedAt, paidAt, notes).
  - Calcul : règle par défaut fixée (présences CONFIRMED × 50€, fallback maxSeats × 30€) + override montant/note manuel (persisté sur l’Invoice).
  - UI : onglet facturation prof (lecture confirmée) listant les cours donnés avec montant + statut ; filtres date/studio/statut, pagination 10.
  - Actions : guidées côté admin (marquer envoyé/payé/annulé/retard) ; prof en lecture seule.
  - Export : CSV souhaité.
  - Backfill : générer des invoices pour les cours existants (statut Générée, montant par défaut).
  - Accès : lecture TEACHER sur ses cours (OK), SCHOOL_ADMIN pour les mises à jour.

## Definition of Done (DoD)
- Onglet École : agenda semaine+mois par studio, filtres multi (niveau/prof/date/discipline/studio), inclut passé/à venir, pagination/scroll OK sur mobile/desktop. **(à livrer)**
- Fiche cours : niveaux élève/position visibles et éditables, élèves cliquables vers fiche ; générateur actif et propose des positions adaptées aux élèves inscrits. **(à livrer)**
- Positions Teacher : encadré “gating” supprimé. **(DONE)**
- Facturation : table `Invoice` en place + backfill des cours existants, statuts enum complets (Générée/Envoyée/Payée/En retard/Annulée), montants calculés/persistés ; onglet facturation (lecture prof / écriture admin) avec filtres/pagination/tri/export, pas d’erreur runtime. **(DONE v0.6.7)**

## Tests / Vérifications
- QA manuel Teacher : onglet École → agenda semaine/mois par studio, filtres agissent (niveau/prof/date/discipline/studio), passé/à venir visibles, pagination/scroll OK sur desktop/mobile.
- QA manuel Teacher : fiche cours affiche/édite niveaux élève/position (badges/tableau), élèves cliquables, générateur propose positions selon inscrits.
- UI Positions Teacher : encadré gating absent. **(OK)**
- QA Facturation : invoices backfillées (statut Générée) visibles, montants cohérents avec la règle choisie, filtres date/prof/studio/statut/tri OK, pagination 10 ; changement de statut côté admin fonctionne ; aucun crash. **(OK v0.6.7)**
