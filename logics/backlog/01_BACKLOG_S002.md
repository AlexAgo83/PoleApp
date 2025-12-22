# Backlog — Retours QA S002 (session 2025-12-21 01:00)
[Compréhension: 92% / Avancement: 75%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

## 0) UI Quick win
- Home : bouton “Connexion” trop sombre → augmenter contraste/hover/état actif. **(DONE)**

## 1) Espace Élève
- Catalogue positions :
  - Retirer le “grading élevé”. **(DONE)**
  - Afficher le niveau atteint par l’élève. **(DONE)**
  - Rendre les cartes cliquables (accès détail) plutôt qu’un simple bouton “Voir”. **(DONE)**
- Cours :
  - Sortir le nom de l’école du titre, l’afficher comme donnée structurée. **(DONE)**
- Agenda :
  - Boutons vue Hebdo/Mensuelle. **(DONE)**
  - Option pour afficher les cours disponibles dans les écoles fréquentées. **(DONE)**
- Onglet École :
  - Partenaires à mettre dans un onglet séparé (pas dans École). **(DONE)**
- Progression positions (élève) :
  - Ajouter un code couleur + compteur de fois où la position a été vue/enseignée. **(partiel : badge couleur + compteur “Vu : X”)**
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
  - Onglet “Suivi de facturation” (cours donnés, facture envoyée/paiement reçu, génération facture) — s’appuyer sur le modèle `Invoice` (courseId, montant, statut).
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

# UPDATE 2025-12-21 02:20 (OctoPole)
1. Espace élève > Ma prgression, rendres les tuiles cliquables en lieu et place de "Détail position ->". **(DONE)**
2. Dans les Agendas > En mode mobile > les jours de semaines sans cours peuvent être cachés **(DONE)**
3. Dans les vues "Vue semaine", si mode Mobile cacher les jours où il n'y a pas de cours. (s'applique aussi dans la vue Admin pas que Agendas) **(DONE)**
4. Positions > la placeholder par défaut utilisé n'est pas le bon, c'est celui du Cours alors qu'il faudrait un svg Position **(DONE)**
5. Mes blessures > Ajouter une blessure, le titre du panel n'est pas à la bonne taille. **(DONE)**
6. Mes blessures > Proposer une nouvelle mise en page pour la liste des blessures. **(DONE)**
7. Fiche Mon école > Partenaires doit être déplacer en tant que module dans l'accueil de l'élève et du professeur **(DONE)**
8. Fiche Mon école > Plus besoin du switch entre studios et partenaires (Si 7. est fait) **(DONE)**
9. Dans tout les Agendas > En mode mobile uniquement > les jours sans cours doivent être cachés **(DONE)**
10. Pour tour les boutons > Si couleur de texte noir > changer en blanc. **(DONE)**
11. Admin > Cours > Agenda > Mode mobile > Je vois toujours les jours sans Cours dans l'agenda. **(DONE)**
12. Dans la fiche de l'école > Remplacer le "Mon école" par le titre de l'école (et du coup retirer le titre qui était en petit, en dessous). **(DONE)**

## Tâches restantes à prioriser (P0/P1/P2/P3 à définir)
- Mini-jeux (6) accessibles en illimité pour prof + élève, gating premium (oui). Bouton d’accès sur dashboards admin/prof/élève. (P1)
- Progression positions : finaliser code couleur homogène (élève + tableau prof + détail position), définir nuances/étiquettes et surfaces exactes. (P2)
- Prof > Élèves : tri/filtre par cours suivis/école/niveau ; affichage âge sur fiche. (P1)
- Admin > Studios : page studio avec infos (pas de vue semaine pour l’instant). (P1)
- Prof/Admin > Cours : suivi pédagogique (tableau élève×positions), notes internes cours, suivi de facturation (facture envoyée/paiement reçu). (P1)
- Élève Premium UX : feedback immédiat mini-jeux + récap final conservé. (P2)
- Admin : planning/réservation, achats/abonnements, VOD (encore manquants). (P2)

## Mises à jour récentes
- Page infos studio accessible à tous via `/app/school/[id]` (retour contextualisé) + liens depuis les listes de studios élèves/profs/admin. **(DONE)**
- Mini-jeux accessibles aux profs/admin (accès direct) et CTA “Jeux” ajouté dans le dashboard admin. Gating premium/feedback final reste à faire. **(PARTIEL)**
- Générateur de cours : suggestions basées sur la progression des élèves affichées sur la fiche cours (teacher/admin), édition des notes via l’écran d’édition (inline retiré). **(PARTIEL)**

## Clarifications nécessaires
- Progression : valider palette/code couleur exacts et où l’afficher (liste élève, tableau prof, détail position, etc.).
- Mini-jeux : gating premium confirmé oui ; navigation cible : dashboards admin/prof/élève.
- Studios : besoin actuel limité à la page infos studio (pas de vue semaine pour l’instant).
