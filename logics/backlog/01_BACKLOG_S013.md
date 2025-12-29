# 01_BACKLOG_S013 — Suivi élève, droits profs, transferts crédits, détail pack (QA S014)
[Aligné v0.10.8 | Source: QA S014 & QA S015 | Priorité: à définir]
[Compréhension: ??% | Avancement (±QA): ??% ??%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories détaillées**, **critères d’acceptation** **DoD** **progression** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).
> (Idéalement) Prépares tes questions pour améliorer la compréhension
> (Idéalement) Prépares la session QA

## Prendre en compte la vision produit : 06_QA_S015.md (Pour contexte)

## Objectif 
Traiter les retours QA S014 : enrichir la fiche élève, gérer disciplines multiples pour profs, ajouter des droits avancés sur la création de positions, permettre les transferts de crédits entre élèves avec suivi, et proposer une fiche détail pack avec VOD Cloudinary.

## Portée (in / out)
- (in) Fiche élève (vue prof/admin) : stats par élève (positions vues par niveau), notes repliées par défaut avec toggle.
- (in) Profil prof : multi-disciplines, affichage/filtrage propagé.
- (in) Droits prof : flag admin pour autoriser/refuser la création de positions (UI + garde serveur).
- (in) Transferts de crédits élève → élève (même école) avec logs d’historique côté élève et prof/admin (renommage section si besoin).
- (in) Détail pack VOD : route de détail depuis tuile, player 4:3 Cloudinary, champs durée/chapitres/explications courtes, positions liées, migration pour remplacer l’URL vidéo obsolète.
- (out) Paiement réel ou RBAC complet ; refonte complète du module achats ; analytics avancées.

## Hypothèses / pré-requis
- Cloudinary déjà en place pour VOD positions : réutilisable pour packs (ajout `videoPublicId` si manquant).
- Transfert de crédits : transaction atomique, élèves d’une même école, types d’achat étendus (`TRANSFER_IN/OUT`).
- Stats élève calculables via données progression existantes (positions vues / niveaux).
- Disciplines prof : champ multi sélection à stocker et afficher (badges + filtres).

## Tâches candidates
1) Fiche élève (prof/admin) : ajouter agrégations positions vues par niveau + affichage ; notes en mode collapsible par défaut.
2) Profil prof : support disciplines multiples, propagation sur pages/filtres.
3) Droits création position : flag admin + enforcement UI/serveur (actions/route positions).
4) Transfert de crédits : UI + action serveur, logs d’historique élève et admin/prof, types d’achat spécifiques.
5) Détail pack : nouvelle page/route, migration Cloudinary vidéo (`videoUrl`/`videoPublicId`), player 4:3, champs durée/chapitres/positions, lien depuis tuile.

## Risques / mitigations
- Perfs stats élève : limiter périmètre, indexer, paginer.
- Cohérence transferts : transaction + validation (montant >0, destinataire ≠ soi).
- Migration pack vidéo : fallback si pas de publicId ; compat données existantes.
- Droits prof : oublier un endpoint → auditer les actions positions.

## Ouvert / décisions à prendre
- Priorisation des modules (stats/notes vs transferts vs pack) pour découper les livraisons.
- Règles exactes de visibilité/renommage de l’historique d’achats pour inclure les transferts.
- Format des chapitres pack (texte simple vs structure) et stockage (DB ou Cloudinary metadata).
