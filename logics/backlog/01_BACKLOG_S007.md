# Backlog — Retours QA S007 (session 2025-12-21 23:55)
[Compréhension: 70% / Avancement: 100%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

Source : 06_QA_S007.md (tests sur v0.5.0)

## Tâches
- [x] Student > École/Cours : vue planning/agenda (liste + agenda) avec modes semaine/mensuel visibles en mobile/desktop (et par studio si pertinent).
- [x] Student > Jeux : parité complète avec l’espace Teacher (6 modes, affichages, historique/leaderboard s’il existe), aucune restriction élève. (OK via `/app/student/game` accessible rôles)
- [x] Student > Cours : liste + agenda avec légende affichée en haut et code couleur clair pour différencier :
  - cours déjà suivis (passés),
  - cours inscrits (validation OK),
  - cours inscrits en liste d’attente (rang affiché, cours contingentés à 14 élèves),
  - cours disponibles et encore ouverts à l’inscription.
  Objectif : lecture immédiate, intuitive, sans effort cognitif.
- [x] Planning élève : filtres date min/max, studio, prof, “mes cours” et recherche titre en place (vue mois/semaine). À cadrer/étendre si besoin (type, plage, responsive fine).

## Definition of Done (DoD)
- Vue agenda/planning accessible dans École et Cours (élève), modes semaine/mensuel, états cohérents sur mobile/desktop.
- Mini-jeux : UX identique à l’espace Teacher (6 modes, affichages, historique/leaderboard si présent côté Teacher).
- Liste/agenda des cours élève avec légende en haut, code couleur clair pour passé / inscrit / attente (rang affiché, quota 14) / disponible.
- Légende cliquable : tous les états cochés par défaut, mémorisation par utilisateur, badge “Filtres actifs” si un état est décoché.
- Achats simulés : après achat crédits/abo, montrer un reçu minimal (horodatage/offre/montant) + toast ; application immédiate des crédits/éligibilités.
- Cohérence cours↔positions↔profs/discipline auditée/corrigée.
- Vidéos premium : accès via liens/lock (replay/live) pour premium, verrou pour non-premium.

## Tests / Vérifications
- QA manuel élève : onglet École/Cours → agenda semaines/mois visible sur mobile/desktop ; navigation OK.
- QA manuel élève : onglet Jeux = même fonctionnalité que Teacher (6 modes, historique/leaderboard si présent).
- QA manuel élève : onglet Cours liste + agenda ; légende en haut ; code couleur par état ; liste d’attente affiche le rang (quota 14) sans ambiguïté. Filtres peuvent être mémorisés localement (date/prof/studio/type) côté client (localStorage, pas besoin de sync URL). Vue semaine sans reload + bouton “Semaine actuelle” OK.
- QA légende : états cliquables/mémorisés, badge “Filtres actifs” présent.
- QA achats simulés : crédits/abo ajoutés, reçu affiché, eligibility appliquée.
- QA vidéos premium : premium voit les liens, non-premium voit verrou.
