# Backlog — Retours QA S010 (session 2025-12-25 11:48 "06_QA_S010")
[Compréhension: 85% / Avancement: 0%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).
> (Idéalement) Prépares la session QA
> (Idéalement) Tiens à jour : 07_QE_S010.md

## P0 (bloquant)
- **Muscles sollicités (dépendance blessures)**  
  - US: En tant qu’admin/prof, je peux tagger une position avec les muscles sollicités pour que le générateur exclue/pondère en cas de blessure.  
  - AC: Champs muscles sur position (catalogue), intégrés dans les filtres blessures du générateur.
- **Générateur : règles de sécurité blessures**  
  - US: En tant que prof, si un élève a une blessure, le générateur exclut les positions sollicitant la zone (ou privilégie les moins engageantes si pas d’alternative).  
  - AC: Filtres blessures appliqués dans la proposition, pas de positions incompatibles dans le plan généré (s’appuie sur muscles sollicités).
- **Générateur : distribution des mouvements**  
  - US: Le cours généré respecte la répartition 1 nouveauté / 2 déjà travaillés / 3 fluides-maîtrisés / 1 choré.  
  - AC: Plan généré affiche les catégories, compte OK.
- **Générateur : règles d’enchaînement**  
  - US: Pas deux transitions à la suite ; après Trick → Spin ou Spin → Trick, insérer une transition.  
  - AC: Plan proposé respecte ces règles.
- **Niveaux progression : libellés**  
  - US: En tant qu’utilisateur, je vois et peux saisir les niveaux “Initié, Passé, Maîtrisé, Enchaîné en choré”.  
  - AC: Remplacement des libellés actuels (acquis/fluide/maîtrisé) côté UI + stockage, mapping cohérent partout.

## P1 (prochaine itération)
- **CRUD disciplines (QA/ergonomie)**  
  - US: En tant qu’admin école, je peux gérer les disciplines (création/édition/suppression si non utilisée) avec une UX claire.  
  - AC: Flow CRUD validé, unicité par école, visibilité dans filtres prof/élève/agenda.
- **Super-admin : reset mot de passe utilisateur**  
  - US: En tant que SUPER_ADMIN, je peux réinitialiser le mot de passe d’un utilisateur (gestion utilisateurs super admin).  
  - AC: Action/bouton dédié, génération d’un mot de passe temporaire, feedback OK.
- **Générateur : pondération par favoris élèves**  
  - US: Les positions “❤️” par les élèves sont favorisées dans la sélection et placées tôt.  
  - AC: Poids augmenté, visible dans le plan (ordre/sélection).

## P2 (plus tard)
- **Affinage UX filtres disciplines (éviter longue liste)**  
  - US: En tant qu’utilisateur, je peux sélectionner rapidement des disciplines sans scroll/trop de pills (multi-select ou grille compacte).  
  - AC: Variante UX validée (multi-select + chips, double colonne scroll interne, ou “voir plus”).

## Notes
- QA effectuée sur version 0.7.6.  
- Voir 07_QE_S010.md pour questions complémentaires (actuellement vide).  
- Rappel : préférer actions in-app (pas de commande Render côté user). 
