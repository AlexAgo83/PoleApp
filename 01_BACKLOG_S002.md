# Backlog — Retours QA S002 (session 2025-12-21 01:00)

## 0) UI Quick win
- Home : bouton “Connexion” trop sombre → augmenter contraste/hover/état actif.

## 1) Espace Élève
- Catalogue positions :
  - Retirer le “grading élevé”.
  - Afficher le niveau atteint par l’élève.
  - Rendre les cartes cliquables (accès détail) plutôt qu’un simple bouton “Voir”.
- Cours :
  - Sortir le nom de l’école du titre, l’afficher comme donnée structurée.
- Agenda :
  - Boutons vue Hebdo/Mensuelle/Annuelle.
  - Option pour afficher les cours disponibles dans les écoles fréquentées.
- Onglet École :
  - Partenaires à mettre dans un onglet séparé (pas dans École).
- Progression positions (élève) :
  - Ajouter un code couleur + compteur de fois où la position a été vue/enseignée.
- Mini-jeux (à créer) :
  - 6 mini-jeux (photo→nom, nom→type, nom→niveau, nom→grips, nom→intro, nom→tip).
- Bonus (à créer) :
  - Dashboard gamifié (classement, cours à venir, KPIs).
  - Partenaires, Cours VOD, Planning & réservation, Achats & abonnement.

## 2) Espace Prof
- Onglet Jeu : manquant, accès aux 6 mini-jeux.
- Onglet Élèves :
  - Tri par cours suivis/école/niveau.
  - Afficher l’âge sur la fiche.
- Onglet Cours :
  - Suivi pédagogique par code couleur (tableau élève x positions).
  - Notes internes par cours (admin/prof uniquement).
  - Onglet “Suivi de facturation” (cours donnés, facture envoyée/paiement reçu, génération facture).
  - Générateur de cours (voir backlog S004) avec prise en compte blessures/positions souhaitées.

## 3) Élève Premium — UX
- Mini-jeux : feedback immédiat (vert/rouge) + récap final conservé.

## 4) Vue Admin
- Studios : pouvoir afficher le planning de chaque studio.
- Manquants : Cours VOD, Planning & réservation, Achats & abonnement.

## 5) Priorisation suggérée 
1. Corrections UI/UX bloquantes.
2. Suivi progression par code couleur.
3. Onglet Jeu.
4. Générateur de cours.
5. Facturation prof.
6. Dashboard élève gamifié.
7. Le reste.

# UPDATE 2025-12-21 02:20
1. Espace élève > Ma prgression, rendres les tuiles cliquables en lieu et place de "Détail position ->".
2. Positions > Detail d'une position, le panel POSITION devrait avoir un fond comme les autres panels.
3. Dans les vues "Vue semaine", si mode Mobile cacher les jours où il n'y a pas de cours.
4. Positions > la placeholder par défaut utilisé n'est pas le bon, c'est celui du Cours alors qu'il faudrait un svg Position