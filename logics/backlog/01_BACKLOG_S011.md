# Backlog — Retours QA S012 (06_QA_S012.md)
[Compréhension: 100% / Confiance: 90% / Avancement: 85% / Obsolete: 15%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories détaillées**, **critères d’acceptation** **DoD** **progression** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).
> (Idéalement) Prépares tes questions pour améliorer la compréhension
> (Idéalement) Prépares la session QA

## F1 – Combos associés sur fiche position **(DONE)**
- User stories: En tant qu’élève/prof/admin je consulte une fiche position et je vois une section « Combos associés » listant jusqu’à 10 combos/presets VOD contenant cette position, sans duplication. En tant qu’élève non premium, si un combo est premium je vois les règles d’accès appliquées.
- Critères d’acceptation: section visible sur chaque fiche position; jusqu’à 10 combos issus du module VOD (pas de doublons); liens vers les combos existants; règles premium respectées (accès bloqué ou signalé selon droits); pas de régression sur le layout actuel.
- DoD: tests manuels élève premium/non-premium; revue données pour éviter duplications; QA visuel OK.
- Progression: DONE (section « Combos associés » en prod, filtrage VOD + badges premium/déjà acheté, liens d’accès/achat selon droits)
- Priorité: P1

## F2 – Vue agenda sur fiche studio **(DONE)**
- User stories: En tant qu’admin/prof/élève, depuis la fiche studio, je peux voir un onglet/vue « Agenda » qui affiche uniquement les cours de ce studio avec les mêmes interactions que l’agenda cours existant.
- Critères d’acceptation: bascule entre liste/agenda; agenda filtré par studio courant uniquement; navigation et filtres identiques à l’agenda cours actuel; responsive OK.
- DoD: tests manuels liste/agenda; filtre studio vérifié; QA mobile/desktop.
- Progression: DONE (implémenté : vue agenda/semaines/mois filtrée par studio, même interactions que l’agenda cours)
- Priorité: P1

## F3 – Parcours élève : réservation / renommage pages **(DONE)**
- User stories: 1) Page « Cours » devient « Historique des cours » et ne montre que les cours réservés (passés et à venir). 2) Page « École » devient « Réservation & Studios » avec vue agenda. 3) L’élève peut sélectionner plusieurs studios et voir l’agenda mis à jour dynamiquement.
- Critères d’acceptation: labels des pages mis à jour; page Historique filtre sur réservations (aucun cours non réservé); vue agenda ajoutée à Réservation & Studios; sélection multi-studios mise à jour live; responsive OK.
- DoD: tests manuels élève (réservé vs non réservé); QA navigation/labels; vérifier filtres multi-studios.
- Progression: DONE (renommages appliqués, historique filtré sur réservations, vue agenda sur Réservation & Studios avec sélection multi-studios dynamique)
- Priorité: P1

## F4 – Catalogue élève premium : redirection achat **(DONE)**
- User stories: En tant qu’élève non premium, si je clique une dalle marquée « Réservé aux membres premium » dans le catalogue, je suis redirigé vers la page d’achat premium.
- Critères d’acceptation: clic sur une dalle premium non autorisée → redirection vers page achat premium; premium/payant déjà activé → accès normal; pas d’impact sur dalles non premium.
- DoD: tests manuels premium/non-premium; QA parcours achat.
- Progression: DONE (redir premium en place sur dalles protégées, accès normal sinon)
- Priorité: P0

## F5 – Facturation école : annulation/remboursement + ajustements crédits **(IN PROGRESS)**
- User stories: 1) Admin peut « Annuler et rembourser » un achat de pack/abonnement. 2) Admin peut modifier manuellement les crédits d’un élève (ajout/retrait) avec application immédiate et traçabilité.
- Critères d’acceptation: action annuler/rembourser disponible sur achats packs/abos; solde crédits mis à jour immédiatement; ajout/retrait de crédits possible avec justification loggée; historique/trace interne créé; pas de blocage sur autres statuts.
- DoD: tests manuels sur packs/abos; vérification solde avant/après; log/trace présent; QA permissions.
- Progression: remboursement facture cours en place (statut REFUNDED, note + opérateur, annulation paidAt). Seed fournit 5 exemples remboursés. Reste à couvrir packs/abos + ajustements crédits manuels (ledger + mise à jour immédiate du solde élève).
- Priorité: P0

## F6 – Vue professeur : statuts financiers manuels **(DONE)**
- User stories: En tant que professeur/admin, je peux définir un statut financier manuel sur les éléments concernés (cours/factures ?) avec les statuts « Payé » ou « En retard », visibles et persistants.
- Critères d’acceptation: statuts manuels accessibles et modifiables; persistance DB; visibilité claire dans la vue prof; pas d’écrasement par les flux automatiques existants.
- DoD: tests manuels création/modification; revue modèle/DB; QA affichage.
- Progression: DONE (statut manuel PAID/LATE + note depuis admin, champs DB + historisation opérateur/date, affichage badges + notes sur admin/prof). Seed fournit 5 factures avec statut manuel.
- Priorité: P1

### Décisions / clarifications
- F1: Combos associés = section listant jusqu’à 10 combos VOD contenant la position, pas de doublons, règles premium appliquées.
- F2: Vue agenda sur fiche studio, filtre implicite sur le studio courant, mêmes interactions que l’agenda cours.
- F3: Page « Cours » → « Historique des cours » (réservations uniquement) ; page « École » → « Réservation & Studios » avec agenda et sélection multi-studios actualisant l’agenda.
- F4: Dalle premium non autorisée → redirection vers une page premium dédiée (ex: `/app/student/premium` ou `/app/student/credits?from=catalogue`) pour revenir après achat.
- F5: Action « Annuler et rembourser » sur achats packs/abos : statut → refunded, rollback crédits ou abo inactif, log interne (motif/opérateur/date), modale de confirmation + motif recommandée.
- F6: Statuts financiers manuels « Payé » / « En retard » appliqués sur factures et achats (packs/abos), pas sur les cours ; édition prof/admin, persistance DB, affichage clair.
