# Backlog — Retours QA S005 (session 2025-12-21 23:55)
[Compréhension: 95% / Avancement: 70%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

Source: 06_QA_S005.md (tests faits sur v0.5.0)

## Décisions récentes
- Facturation/partners : prioriser en parallèle la robustesse (validations zod, logs structurés, indexes) et l’UX (toasts, filtres persistés, tri/pagination stables).
- Agenda (teacher école) : rester sur la pagination/scroll actuelle pour couvrir passé/à venir, limites temporelles à décider plus tard si besoin.
- UI : toasts et filtres persistés réutilisent le design existant de la facturation admin (pas de style dédié).
- Agenda : mémoriser tous les filtres (discipline/niveau/date/studio/prof/recherche) par utilisateur.
- Générateur : badges cœur/exclu/force seulement (pas de badge propriétaire côté prof) ; pondération cœurs > rareté > découverte/révision > recence ; force blessure prévaut sur exclusion.
- Suivi pédagogique : niveau élève×trick inline uniquement en UI (pas d’export/PDF pour l’itération).
- Factures prof : après génération/envoi, garder l’état “Envoyée” (statut), pas d’historique des envois mail pour l’instant.
- Partenaires prof : visibles uniquement pour le prof (non partagés école) si/when traité ici.

## Tâches
- [ ] Teacher > École : vue agenda (semaine + mensuel) par studio, états mobile/desktop, incluant cours passés et à venir. Filtres multiples : niveau, prof, date, discipline (types de cours ex. souplesse/pole exotic/pole gym), studio. Pagination ou scroll infini. **(Vue semaine sans reload + bouton semaine actuelle en place)** 
- [~] Teacher > Cours : générateur de cours qui suggère positions selon élèves présents et leurs niveaux ; fiche cours affiche niveau atteint par élève/position (format badges/tableau), édition inline autorisée ; élèves cliquables vers leur fiche (prof et admin). (Voir BACKLOG_S004 — Générateur de cours (qa notes S004)) **(suggestions visibles + édition via écran d’édition, plus d’inline sur la fiche)** 
  - Prise en compte prochaine : pondérer avec les positions “cœur” élèves ; mapping blessures→exclusions. **(cœurs pondérés + badge cœur, exclusions blessures avec badge + désactivation)** 
  - Générateur : badge visible sur les positions appliquées, possibilité de retirer une position appliquée par erreur (layout inchangé).
- [x] Teacher > Positions : supprimer l’encadré “gating”. (OK via vue commune /positions)
- [x] Teacher > Facturation (basé sur `Invoice`) :
  - Modèle : table `Invoice` liée à `Course` (courseId, amountCents, currency, status enum Générée/Envoyée/Payée/En retard/Annulée, issuedAt, paidAt, notes).
  - Calcul : règle par défaut fixée (présences CONFIRMED × 50€, fallback maxSeats × 30€) + override montant/note manuel (persisté sur l’Invoice).
  - UI : onglet facturation prof (lecture confirmée) listant les cours donnés avec montant + statut ; filtres date/studio/statut, pagination 10.
  - Actions : guidées côté admin (marquer envoyé/payé/annulé/retard) ; prof en lecture seule.
  - Export : CSV souhaité.
  - Backfill : générer des invoices pour les cours existants (statut Générée, montant par défaut).
  - Accès : lecture TEACHER sur ses cours (OK), SCHOOL_ADMIN pour les mises à jour.
- [ ] Robustesse facturation/partners : validations zod sur inputs/actions, logs structurés, indexes Prisma sur colonnes filtrées, toasts/filtres persistés alignés sur le design facturation admin.

## Definition of Done (DoD)
- Onglet École : agenda semaine+mois par studio, filtres multi (niveau/prof/date/discipline/studio), inclut passé/à venir, pagination/scroll OK sur mobile/desktop. **(à livrer)**
- Fiche cours : niveaux élève/position visibles (lecture sur la fiche) et éditables via l’écran d’édition ; élèves cliquables vers fiche ; générateur actif et propose des positions adaptées aux élèves inscrits (suggestions affichées). **(partiel, inline retiré)**
  - Suggestions : badge “appliqué” sur les positions issues du générateur + option de retrait.
- Positions Teacher : encadré “gating” supprimé. **(DONE)**
- Facturation : table `Invoice` en place + backfill des cours existants, statuts enum complets (Générée/Envoyée/Payée/En retard/Annulée), montants calculés/persistés ; onglet facturation (lecture prof / écriture admin) avec filtres/pagination/tri/export, pas d’erreur runtime, toasts/filtres persistés alignés design facturation admin, validations zod + logs structurés + indexes en place. **(DONE v0.6.8 hors robustesse/toasts, à finaliser)**

## Tests / Vérifications
- QA manuel Teacher : onglet École → agenda semaine/mois par studio, filtres agissent (niveau/prof/date/discipline/studio), passé/à venir visibles, pagination/scroll OK sur desktop/mobile.
- QA manuel Teacher : fiche cours affiche/édite niveaux élève/position (badges/tableau), élèves cliquables, générateur propose positions selon inscrits.
- UI Positions Teacher : encadré gating absent. **(OK)**
- QA Facturation : invoices backfillées (statut Générée) visibles, montants cohérents avec la règle choisie, filtres date/prof/studio/statut/tri OK, pagination 10 ; changement de statut côté admin fonctionne ; toasts affichés (pas de popin), filtres persistés ; aucun crash. **(OK v0.6.8 hors toasts)**
- Tests unitaires/éventuels e2e : validations zod (inputs facturation/partners), logs structurés émis sur actions statut/export, indexes Prisma présents sur colonnes filtrées.

## Références croisées
- Générateur : voir S004 (pondération cœurs, force blessure, flags appliqué/exclu/forcé).
- Facturation prof (PDF/email/TVA) et achats crédits/abos : voir S008 pour les règles produit.
