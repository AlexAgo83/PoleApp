# Backlog — Retours QA S008 (session 2025-12-22 23:14)
[Compréhension: 90% / Avancement: 5%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

## 1) Vue Professeur (résultat : le prof ne voit que ses élèves/cours pertinents et facture proprement)
- Élèves : filtre Discipline multi (Pole/Exotic/Souplesse/Pilates) appliqué en temps réel (P1) ; restreindre la liste aux élèves ayant eu au moins un cours avec le prof connecté (via présences) et respectant le filtre (P0).
- Fiche professeur : lecture seule par défaut, icône crayon pour passer en édition, actions Enregistrer/Annuler ; retirer l’état modifiable permanent (P2).
- Cours : filtre avancé Discipline (mêmes valeurs, multi) (P1). Par cours, afficher pour chaque élève les tricks enseignés + niveau atteint (Non tenté / En cours / Acquis / Maîtrisé), éditable inline, écrase la valeur précédente (P0). Générateur : prendre en compte niveaux, blessures, positions peu vues/très maîtrisées, exclure auto les positions incompatibles, proposer structure de cours + sélection de tricks (P0).
- Positions : un prof ne peut modifier que ses fiches créées ; fiches globales en lecture seule (crayon absent/inactif) (P1).
- Partenaires prof : permettre au prof d’ajouter ses partenaires (visibles pour lui) et de les rattacher à sa fiche (réutilisables cours/positions) (P2).
- Factures prof : bouton Générer facture → PDF (logo + adresse école + titre/date/prof/studio/montant) numéroté par période, état “Générée” puis téléchargement ; bouton Envoyer à l’école (email) + indicateur “Facture envoyée” ; switch Non payée → Réglée (persistant, filtrable) (P0).

## 2) Vue Élève (résultat : parcours clair, premium valorisé)
- Cours/Contenus : corriger relations cours ↔ positions ↔ profs ↔ disciplines (affichage complet, multi-prof si besoin) (P0).
- Planning studio/école : nom d’école visible et mise en avant ; changer d’école rafraîchit le planning (P1). Ajouter achat crédits/abonnements (forfait, mensuel, annuel) sur la page école pour permettre l’inscription (P0).
- Légende interactive : états cliquables et cumulables (Passé, Inscrit, Attente avec rang/quota 14, Disponible) (P1).
- Vidéos streaming (premium) : onglet “Vidéos” (replay/live) pour premium ; non-premium masqué ou verrouillé. Source = liens/URLs existants pour l’instant, player/hosting plus tard ; live = lien externe avec planning à gérer (P1).
- Positions élève : supprimer le bloc de gating ; accès selon statut standard/premium sans encart (P2).
- Mini-jeux : corriger le message “pas assez de positions” quand le seuil est atteint (vérifier pool) (P1).
- Achats simulés : historique minimal des achats (date, offre, montant) + toast/confirmation ; application immédiate des crédits/éligibilités. Devise EUR, TVA 20% par défaut.

## 3) Vue Admin École (résultat : factures et actifs clairs, catalogue vidéos maîtrisé)
- Factures : bouton “Envoyé” → “Reçu” (P1) ; supprimer l’encart Note liste/fiches (P2) ; remplacer “Crédits faibles” par encart “Élèves actifs (mois en cours)” avec total actifs + répartition annuel/mensuel/forfait (actif = abo valide ou crédits utilisables) (P1). Ajouter TVA (%) + total TTC sur facture (écran + PDF), valeur par défaut 20%.
- Fiches Élèves : afficher type d’abonnement (Annuel/Mensuel/Forfait), crédits restants, date butoir (fin abo / expiration crédits), visible et à jour (P1).
- Vidéos streaming admin : onglet “Vidéos” pour gérer vidéos live/replay (liens/URLs, player plus tard), classer (discipline/niveau/type), définir accès premium vs tous, planning live (P2).

## 4) Points de contrôle transverses
- Vérifier cohérence données : Élève ↔ Cours, Cours ↔ Positions, Cours ↔ Professeur, École ↔ Planning ; audit et correctifs si manquants (P0).

## Tests / QA
- QA Prof : filtres discipline élèves/cours, restriction élèves vus, édition niveaux tricks par cours, droits édition positions, génération/envoi/statut facture prof, générateur (niveaux/blessures/rare/safe), partenaires prof visibles pour lui.
- QA Élève : affichage cours reliés (positions/profs/disciplines), planning par école (switch + nom), achats crédits/abonnements (simulation), légende filtrante (tous états cochés par défaut, mémorisés, badge “Filtres actifs”), onglet vidéos premium (liens/lock), mini-jeux débloqués dès seuil (message corrigé).
- QA Admin : factures (libellé, encart actifs, note retirée), fiches élèves (abonnement/crédits/échéance), onglet vidéos admin, métriques partenaires (clics/achats).
- Cross-check relations en base (cours/positions/profs/discipline/école) et affichage conforme.

## Références croisées
- Générateur et pondération (cœurs/exclu/force) : cf. S004/S005.
- Facturation TVA 20%, achats crédits/abos, factures prof PDF/email : cf. S008 (présent) + S009 (config globale super-admin).
- Partenaires métriques UI : cf. S006.
