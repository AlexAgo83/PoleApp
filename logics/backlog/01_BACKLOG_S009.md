# Backlog — Retours QA S009 (session 2025-12-23 02:13)
[Compréhension: 95% / Avancement: 0%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

## 1) Espace Super Admin (global)
- Créer un espace Super Admin (hors école) pour la configuration globale de l’app. Compte super-admin seed par défaut, expérience séparée de l’admin école (ce rôle couvre ce que l’admin ne peut pas faire). Accès protégé comme l’admin (RBAC/redirect). (P0)
- Gestion écoles : créer des écoles et attribuer un ou plusieurs admins à chaque école. (P0)
- Config abonnements : offres globales (EUR, TVA appliquée 20% par défaut), champs min : nom, prix mensuel/annuel TTC, crédits mensuels (1000 par défaut), TVA %, engagement (mensuel/annuel), actif/ouvert à la vente, ordre. Proposer des valeurs de départ et éditer tout via l’écran super-admin. (P1)
- Config catalogue packs crédits : packs globaux (EUR, TVA 20% par défaut), champs : nom, crédits inclus, prix TTC, TVA %, ordre, actif/ouvert à la vente ; valeurs de départ suggérées : Pack 500 (9,99€), Pack 1000 (14,99€), Pack 2500 (29,99€). (P1)
- Super admin existant : seed idempotent qui crée un SUPER_ADMIN par défaut si aucun présent (env `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`), sinon no-op. Prévoir un script/route de promotion d’un user existant en SUPER_ADMIN en secours.
- Promotion/dégraduation : ajouter un bouton/route protégée super-admin pour promouvoir/dégrader un user existant en SUPER_ADMIN (recovery).

## 2) Professeurs / Positions
- Professeur autorisé à créer des positions (si non existant) et à éditer uniquement ses positions. (P0)
- Mettre en avant le propriétaire d’une position (badge/mention “Créé par <nom|email>” sur liste/détail/générateur) ; interdire l’édition par d’autres (crayon désactivé + message explicite). (P1)

## Points à clarifier
- Super Admin : promotion/dégradation d’autres comptes à décider plus tard.
- Abonnements/packs : valeurs par défaut actées (EUR, TVA 20%) ; reste à figer l’ordre et l’UX de validation.

## Tests / QA
- QA Super Admin : création école, assignation admin, visibilité des réglages abonnements/packs, RBAC (invisible aux autres rôles).
- QA Prof : création/édition positions par le prof, blocage sur positions d’autrui, badge propriétaire visible.
