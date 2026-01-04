# Backlog — Retours QA S006 (session 2025-12-21 23:55)
[Compréhension: 95% / Avancement: 72% / Obsolete: 45%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

Source : 06_QA_S006.md (tests sur v0.5.0)

## Tâches
- [x] Admin > Studios/Partenaires : vue lecture seule par défaut + bouton ✏️ pour éditer (inline ou modale), sauvegarde puis retour lecture. (DONE)
- [x] Admin > Élèves : afficher uniquement les positions enseignées (celles vues en cours inscrits) ; si aucune vue, afficher “aucune position”.
- [~] Admin > Cours : ajouter générateur de cours, afficher niveau atteint par élève/position (edit + display), rendre les élèves cliquables (prof/admin). **(suggestions générateur visibles sur la fiche, notes en lecture avec bouton vers édition)** 
- [x] Admin > Positions : retirer le bloc “gating”. (OK via vue commune /positions sans encadré staff)
- [x] Admin > Jeux : ajouter l’énoncé pour les modes Description→Nom, Nom→Niveau, Nom→Grips, Nom→Type, Blitz mix (comme Teacher).
- [x] Admin > Facturation (basé sur `Invoice`) :
  - Modèle : table `Invoice` liée à `Course` (courseId, amountCents, currency, status enum Générée/Envoyée/Payée/En retard/Annulée, issuedAt, paidAt, notes).
  - Calcul : règle par défaut fixée (présences CONFIRMED × 50€, fallback maxSeats × 30€) + override montant/note manuel (persisté sur l’Invoice).
  - UI : onglet Facturation admin listant les cours donnés (vue liste + filtres date/prof/studio/statut + tri, pagination 10), export CSV, actions guidées de changement de statut (marquer envoyé/payé/annulé/retard), badge retard. **(fait)**
  - Polish : filtres regroupés (titre sans fond, formulaire encadré), compteur sous le panel, actions header alignées à droite, titre/date séparés sur les cartes. **(fait)**
  - UX : remplacer la popin “Statut/montant mis à jour.” par une notification (toast) cohérente avec celle de “Valider ces propositions” (édition de cours).
  - Suivi abonnements : crédits restants + péremption par élève ; affichage dans l’onglet Facturation ou bloc dédié (résumé crédits + alertes). **(fait partiel)**
  - Backfill : générer des invoices pour les cours existants (statut Générée, montant par défaut) + initialiser abonnements.
  - Accès : par défaut SCHOOL_ADMIN lecture/édition ; éventuelle lecture limitée pour TEACHER à confirmer.
- [x] Admin > Partenaires : suivi des clics sur les liens et des achats via les liens (userId, partenaire, horodatage, contexte course/studio). **Source/referrer à ajouter plus tard si besoin.**
- [~] Admin > Agenda cours : filtres date min/max, prof, studio et recherche (titre) sur vue mois/semaine.
  - Navigation semaine → semaine sans rechargement complet (même pattern que Facturation admin), conservation des filtres actifs, sans modifier visuellement l’agencement des panels. **(OK dashboard admin)** 
  - Ajouter un bouton “Semaine actuelle” pour revenir rapidement à la semaine en cours depuis la vue semaine. **(OK)** 
- [x] Admin > Studios (lecture seule) : retirer l’URL brute “Photo : XXX” (la photo est visible ailleurs), laisser la cellule propre/compacte (ou masquer la ligne en lecture seule).
- [ ] Partenaires : exposer les métriques clics/achats dans l’UI admin (tableau ou cartes), filtres de base (date/type), logs structurés, Top 10 + vue complète + export CSV.
- [ ] Facturation admin : remplacer définitivement la popin statut/montant par toast cohérent (si non livré), vérifier persist/refresh des filtres, encart Note retiré.

## Definition of Done (DoD)
- Studios/Partenaires : lecture par défaut, édition via ✏️, retour lecture après sauvegarde. **(OK)**
- Élèves : uniquement positions enseignées visibles (sinon message “aucune position”). **(OK)**
- Cours : générateur actif, niveaux élève/position visibles (lecture) et éditables via l’écran d’édition, élèves cliquables. **(partiel, inline retiré, suggestions affichées)**
- Jeux admin : énoncé affiché pour tous les modes concernés. **(OK)**
- Positions admin : bloc “gating” supprimé. **(OK)**
- Facturation : table `Invoice` en place + backfill cours existants, montants calculés/persistés, statuts complets (Générée/Envoyée/Payée/En retard/Annulée) ; UI admin avec filtres/pagination/exports/tri, actions de statut ; suivi abonnements (crédits restants + péremption). Partenaires : métriques clics/achats exposées. **(Facturation DONE v0.6.8 ; métriques partenaires à faire)**
- Agenda admin : navigation semaine sans reload (pattern Facturation admin), filtres conservés lors du changement de semaine et panels visuellement identiques ; mémorisation des filtres par utilisateur.
- Studios admin (lecture) : cellule photo sans URL brute (photo visible ailleurs), affichage minimal propre.

## Tests / Vérifications
- QA manuel Admin : studios/partenaires basculent lecture → édition via ✏️, sauvegarde et re-affichage en lecture.
- QA manuel Admin : onglet Élèves n’affiche que les positions enseignées, pas de “non commencée” hors scope.
- QA manuel Admin : onglets Cours et Jeux couvrent les mêmes fonctionnalités que Teacher (à valider selon tickets Teacher).
- QA manuel Admin : Positions sans bloc gating. **(OK)**
- QA Facturation : invoices backfillées (statut Générée) visibles, montants cohérents, changement de statut Générée→Envoyée→Payée→Annulée/En retard fonctionne, filtres date/prof/studio/statut/tri OK, pagination 10, export CSV le cas échéant ; crédits restants/péremption visibles ; notification toast affichée (plus de popin “Statut/montant mis à jour.”). **(OK v0.6.8 sauf toast)**
- QA Admin agenda : filtres date min/max + recherche titre opérationnels en mois/semaine, pastilles en bas à droite alignées élève.
- QA Partenaires : tableau/cartes des métriques clics/achats visibles (Top 10 + vue complète), filtres date/type OK, logs structurés présents.
- QA Facturation (toast) : changement statut/montant affiche un toast (pas de popin), filtres restent persistés après action/reload, encart Note absent.

## Références croisées
- Générateur (force blessure, pondération cœurs) : voir S004/S005 pour les règles.
- Facturation TVA/TVA par défaut 20% : voir S008/S009 si global.
