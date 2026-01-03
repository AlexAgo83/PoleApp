# Backlog — Retours QA S010 (session 2025-12-25 11:48 "06_QA_S010" & "06_QA_S011")
[Compréhension: 95% / Confiance: 85% / Avancement: 90%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).
> (Idéalement) Prépares la session QA
> (Idéalement) Tiens à jour : 07_QE_S010.md

## P0 (bloquant)
- **Muscles sollicités (dépendance blessures)**  
  - US: En tant qu’admin/prof, je peux tagger une position avec les muscles/articulations sollicités via un multi-select référentiel pour que le générateur exclue/pondère en cas de blessure.  
  - AC: Champs muscles sur position (catalogue), utilisés dans les filtres blessures du générateur ; logique d’exclusion stricte ou atténuation si aucune alternative (à trancher) ; UI scrollable + bouton “Ajouter un muscle” rapide si référentiel incomplet.
- **Générateur : règles de sécurité blessures**  
  - US: En tant que prof, si un élève a une blessure, le générateur exclut les positions sollicitant la zone (ou privilégie les moins engageantes si pas d’alternative).  
  - AC: Filtres blessures appliqués (s’appuient sur muscles sollicités), pas de positions incompatibles ; fallback si aucune alternative (à définir).
- **Générateur : distribution des mouvements**  
  - US: Le cours généré respecte la répartition 1 nouveauté / 2 initiés / 3 passés/maîtrisés / 1 fluide chorégraphié.  
  - AC: Plan généré affiche les catégories (nomenclature alignée avec les notations élèves), compte OK.
- **Générateur : règles d’enchaînement**  
  - US: Pas deux transitions à la suite ; après Trick → Spin ou Spin → Trick, insérer une transition (même en fin de cours).  
  - AC: Plan proposé respecte ces règles.
- **Niveaux progression : libellés unifiés**  
  - US: En tant qu’utilisateur, je vois et peux saisir les niveaux “Nouveauté (pas commencé), Initié, Passé, Fluide chorégraphié”.  
  - AC: Remplacement des libellés actuels (acquis/fluide/maîtrisé), dernière valeur prévaut ; migration/affichage cohérents et utilisés par les règles du générateur (même vocabulaire partout).  
  - État: enum Prisma recréée + migration 20251226100000_mastery_enum_cleanup + UI alignée (reste QA global).

## P1 (prochaine itération)
- **Vue abonnements/packs élèves (prof/admin)**  
  - US: En tant que prof/admin, je vois les abonnements en cours et packs achetés par élève.  
  - AC: Tables abonnements/packs + achats unitaires de presets/combos avec élève, offre, début/fin, statut (actif/expiré/épuisé), crédits restants, montant/moyen de paiement, école ; filtres/tri (statut, date, élève, école), export CSV ; lien fiche élève facturation.
- **Presets/combos vidéo (premium ou achat)** *(catalogue + CRUD livrés, reste QA finale)*  
  - US: En tant que prof/admin, je crée/édite un preset (combo vidéo) vendu en premium ou à l’unité (crédits).  
  - AC: Modèle preset avec titre/description/discipline/vidéo obligatoire/positions incluses/flag paywall (premium requis)/prix crédits optionnel (autoriser 0 pour démo) ; catalogue CRUD prof/admin (avec images et prof créateur) livré ; catalogue élève `/presets` avec badges premium/credits et achat ; reste à tracer usage (compteur/dernière utilisation) et QA.
- **Générateur : explication des mouvements proposés**  
  - US: Lors de la génération, je vois un détail/raison des positions sélectionnées (catégorie, blessure, favoris, récence…).  
  - AC: Panneau de justification par position (tags + raison textuelle, score en tooltip), toggle “afficher les raisons” avant validation.
- **CRUD disciplines (QA/ergonomie)**  
  - US: En tant qu’admin école, je peux gérer les disciplines (création/édition/suppression si non utilisée) avec une UX claire.  
  - AC: Flow CRUD validé, unicité par école, visibilité dans filtres prof/élève/agenda (QA à refaire, besoin mal compris).  
  - État: flash succès/erreur + blocage suppression si utilisée. Reste QA globale.
- **Super-admin : reset mot de passe utilisateur**  
  - US: En tant que SUPER_ADMIN, je peux réinitialiser le mot de passe d’un utilisateur (gestion utilisateurs super admin).  
  - AC: Action/bouton dédié, génération d’un mot de passe temporaire, affiché en clair + email, audité.  
  - État: bouton + mdp temporaire affiché + audit, mailto prêt (pas d’envoi SMTP).
- **Email reset (prod)**  
  - US: En tant que SUPER_ADMIN, je déclenche un reset et un email part via Resend (ou SMTP).  
  - AC: Config env (`RESEND_API_KEY`, `EMAIL_FROM`), helper mailer avec fallback silencieux si non configuré, audit conservé.  
  - Setup: helper mailer ajouté (SMTP), appel dans resetUserPasswordAction, prévoir doc env Render (`SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`, `ENABLE_EMAIL_RESET`).
- **Générateur : pondération par favoris élèves**  
  - US: Les positions “❤️” par les élèves sont favorisées dans la sélection et placées tôt.  
  - AC: Poids augmenté, visible dans le plan (ordre/sélection).  
  - État: bonus favoris renforcé (sélection).

## P2 (plus tard)
- **Affinage UX filtres disciplines (éviter longue liste)**  
  - US: En tant qu’utilisateur, je peux sélectionner rapidement des disciplines sans scroll/trop de pills (multi-select ou grille compacte).  
  - AC: Variante UX validée (chips en grille compacte + “voir plus” scrollable, mémorisée par user).  
  - État: grille compacte + bloc “voir plus” déjà présent côté prof ; reste à consolider variante finale.

## Notes
- QA effectuée sur version 0.7.9 (seed musclée : 30 positions, cours répartis, favoris prof, Amazon partenaire, achats pack/abo seed). Voir 06_QA_S011 pour nouveaux retours.  
- Super-admin “forcer discipline” : confirmation “FORCE” + scope école recommandé, prévoir dry-run/compteur avant exécution, écoles archivées exclues.  
- Voir 07_QE_S010.md pour questions complémentaires (actuellement vide).  
- Rappel : préférer actions in-app (pas de commande Render côté user). 
