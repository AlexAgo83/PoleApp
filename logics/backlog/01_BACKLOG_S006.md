# Backlog — Retours QA S006 (session 2025-12-21 23:55)
[Compréhension: 90% / Avancement: 35%]

Source : 06_QA_S006.md (tests sur v0.5.0)

## Tâches
- [x] Admin > Studios/Partenaires : vue lecture seule par défaut + bouton ✏️ pour éditer (inline ou modale), sauvegarde puis retour lecture. (DONE)
- [ ] Admin > Élèves : afficher uniquement les positions enseignées (celles vues en cours inscrits) ; si aucune vue, afficher “aucune position”.
- [ ] Admin > Cours : ajouter générateur de cours, afficher niveau atteint par élève/position (edit + display), rendre les élèves cliquables (prof/admin).
- [x] Admin > Positions : retirer le bloc “gating”. (OK via vue commune /positions sans encadré staff)
- [x] Admin > Jeux : ajouter l’énoncé pour les modes Description→Nom, Nom→Niveau, Nom→Grips, Nom→Type, Blitz mix (comme Teacher).
- [ ] Admin > Facturation : suivi des cours donnés, tarif à facturer à l’école, état facture (générée/envoyée/payée) ; suivi abonnements élèves (crédits restants, péremption).
- [ ] Admin > Partenaires : suivi des clics sur les liens et des achats via les liens.
- [~] Admin > Agenda cours : filtres date min/max, prof, studio et recherche (titre) sur vue mois/semaine.

## Definition of Done (DoD)
- Studios/Partenaires : lecture par défaut, édition via ✏️, retour lecture après sauvegarde.
- Élèves : uniquement positions enseignées visibles (sinon message “aucune position”).
- Cours : générateur actif, niveaux élève/position visibles et éditables, élèves cliquables.
- Jeux admin : énoncé affiché pour tous les modes concernés.
- Positions admin : bloc “gating” supprimé.
- Facturation : liste cours donnés avec montant + statut facture (générée/envoyée/payée) ; suivi abonnements (crédits restants + péremption). Partenaires : métriques clics/achats exposées.

## Tests / Vérifications
- QA manuel Admin : studios/partenaires basculent lecture → édition via ✏️, sauvegarde et re-affichage en lecture.
- QA manuel Admin : onglet Élèves n’affiche que les positions enseignées, pas de “non commencée” hors scope.
- QA manuel Admin : onglets Cours et Jeux couvrent les mêmes fonctionnalités que Teacher (à valider selon tickets Teacher).
- QA manuel Admin : Positions sans bloc gating ; onglet Facturation accessible (pas d’erreur runtime).
- QA Admin agenda : filtres date min/max + recherche titre opérationnels en mois/semaine, pastilles en bas à droite alignées élève.
