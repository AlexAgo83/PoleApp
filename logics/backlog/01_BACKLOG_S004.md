# Backlog — Générateur de cours (notes S004)
[Compréhension: 80% / Avancement: 45%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

## Objectif
Automatiser la construction d’un cours en tenant compte du niveau réel des élèves, des blessures, et des envies (positions “cœur”), pour proposer des combos équilibrés et variés.

## Décisions récentes
- Sources : utiliser uniquement les données réelles en base (cours, progression, blessures, positions favorites), pas de mock/seed pour l’agenda ou le générateur.
- Blessures : positions incompatibles autorisées mais signalées (badge + message court), visibles Prof/Admin, avec option pour forcer l’application.
- Interaction : bouton “Forcer quand même” explicite (pas de toggle).

## Données / Modèle
- Étendre le modèle :
  - `User` : préférences “positions favorites” (ids) + blessures déjà présentes. **(multi-select côté élève/teacher en place, exploité par le générateur)**
  - `Course` : champ pour stocker les positions proposées (liste d’ids) et exclues (pour suivi).
  - `Position` : marquer “safe”/“risky” (optionnel) pour filtrer selon blessures.
- Champs facultatifs :
  - `CourseRecommendation` (table) pour historiser les suggestions générées. **(pas prioritaire pour le moment)**
  - `PositionTag` pour classer les positions (découverte/révision/safe).

## Sources d’entrée
- Élèves inscrits au cours (leur niveau par position + blessures).
- Positions “cœur” (envies) marquées par les élèves. **Afficher un badge “cœur” sur les suggestions plébiscitées.**
- Historique des positions déjà faites récemment (pour éviter la redite).

## Algorithme (pistes)
- Étapes :
  1) Exclure les positions incompatibles avec blessures (safe/risky).
  2) Sélectionner 1 position “découverte” peu vue par le groupe.
  3) Sélectionner 1 position “à réviser” (pas encore acquise par tous).
  4) Compléter par 1-2 positions “safe” maîtrisées.
  5) Pondérer par les positions “cœur” les plus populaires parmi les élèves présents.
- Sortie : liste ordonnée de positions + tags (découverte / révision / safe) et justification courte.

## UI / UX
- Page/onglet “Générateur de cours” (prof/admin) :
  - Sélection du cours (ou création), liste des élèves inscrits.
  - Bouton “Générer” → affiche le combo proposé (positions + tags + justification).
  - Bouton “Régénérer” (pour varier).
  - Bouton “Valider” → associe les positions au cours et enregistre en base.
  - Afficher les positions exclues (pour transparence).
- Option : permettre au prof d’ajuster manuellement (remplacer une position).
- **État actuel (partiel)** : suggestions calculées à partir des élèves inscrits/leur progression et affichées sur la fiche cours (teacher/admin), hors positions déjà planifiées. Badge “cœur” affiché si des élèves ont plébiscité la position, exclusion stricte des positions incompatibles blessures (badge “Exclu blessure”), toggle pour forcer 1 slot découverte. L’édition des notes se fait via la page d’édition du cours (plus d’inline dans la fiche).

## Tâches
- [~] Algorithme : pondération par positions “cœur”, mix découverte/révision/safe, exclusion blessures avec badge + message, bouton “Forcer quand même” (traçage), éviter redite (historique récent), basé sur données réelles.
- [~] UI/UX : page onglet dédié avec Générer/Régénérer/Valider, affichage des positions exclues avec motif, badge cœur, badge “Exclu blessure”, bouton “Forcer quand même”, possibilité de retirer une position appliquée.
- [ ] Persistance : stocker positions proposées/appliquées/exclues par cours (incl. flag forcé/incompatible) et synchroniser avec l’édition du cours.

## Intégration données existantes
- Utiliser les niveaux par position (progression élève) pour savoir qui a acquis quoi.
- Utiliser les blessures existantes (StudentInjury) pour filtrer.
- Ajouter un champ “favorite positions” côté élève (multi-select) pour pondérer.

## Tech
- Action serveur pour générer les suggestions (pas de dépendance IA pour l’instant).
- Prisma : nouvelles colonnes/tables si besoin (favorites, recommendations).
- Validation zod ; garde-fous (limiter le nombre de positions retournées).

## Definition of Done (DoD)
- Génération basée sur données réelles (élèves inscrits, progression, blessures, positions cœur), mix découverte/révision/safe respecté.
- Blessures : positions incompatibles signalées (badge + message), bouton “Forcer quand même” disponible pour prof/admin et trace le flag forcé.
- UI : badges cœur/exclu visibles, liste des exclus avec raison, bouton Régénérer, bouton Retirer sur positions appliquées, validation qui persiste les positions au cours.
- Persistance : positions appliquées/exclues (incl. flag forcé) stockées et réouvertes correctement dans l’édition de cours ; aucune proposition déjà planifiée n’est répétée.

## Tests & QA
- Unitaires : fonction de sélection (pondération cœur, exclusion blessures, mix découverte/révision/safe), calcul du flag “forcé”.
- Intégration : génération → validation (avec/ sans “Forcer quand même”) → persistance sur le cours → retrait d’une position appliquée.
- QA : badge cœur, badge “Exclu blessure” + message visibles ; régénération propose un set différent si possible ; positions appliquées ne réapparaissent pas dans les suggestions du même cours.
