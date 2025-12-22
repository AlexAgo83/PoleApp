# Backlog — Générateur de cours (notes S004)
[Compréhension: 70% / Avancement: 30%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

## Objectif
Automatiser la construction d’un cours en tenant compte du niveau réel des élèves, des blessures, et des envies (positions “cœur”), pour proposer des combos équilibrés et variés.

## Données / Modèle
- Étendre le modèle :
  - `User` : préférences “positions favorites” (ids) + blessures déjà présentes.
  - `Course` : champ pour stocker les positions proposées (liste d’ids) et exclues (pour suivi).
  - `Position` : marquer “safe”/“risky” (optionnel) pour filtrer selon blessures.
- Champs facultatifs :
  - `CourseRecommendation` (table) pour historiser les suggestions générées.
  - `PositionTag` pour classer les positions (découverte/révision/safe).

## Sources d’entrée
- Élèves inscrits au cours (leur niveau par position + blessures).
- Positions “cœur” (envies) marquées par les élèves.
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
- **État actuel (partiel)** : suggestions calculées à partir des élèves inscrits/leur progression et affichées sur la fiche cours (teacher/admin), hors positions déjà planifiées. Pas de tags ni de validation automatique ; l’édition des notes se fait via la page d’édition du cours (plus d’inline dans la fiche).

## Intégration données existantes
- Utiliser les niveaux par position (progression élève) pour savoir qui a acquis quoi.
- Utiliser les blessures existantes (StudentInjury) pour filtrer.
- Ajouter un champ “favorite positions” côté élève (multi-select) pour pondérer.

## Tech
- Action serveur pour générer les suggestions (pas de dépendance IA pour l’instant).
- Prisma : nouvelles colonnes/tables si besoin (favorites, recommendations).
- Validation zod ; garde-fous (limiter le nombre de positions retournées).

## Tests & QA
- Tests unitaires de la fonction de sélection (entrées: élèves/positions/blessures/envies; sortie: positions proposées).
- Tests d’intégration : associer les positions proposées à un cours.
- QA : vérifier qu’aucune position incompatible blessures n’est proposée ; vérifier la variété (découverte/révision/safe).
