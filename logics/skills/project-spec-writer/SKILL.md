---
name: project-spec-writer
description: Créer/mettre à jour les specs fonctionnelles PoleApp dans logics/specs/* à partir des routes, DRY, QA, backlog et modèles avec format Markdown structuré.
---

# Rédaction/MAJ des specs applicatives (PoleApp)

## Quand utiliser
- On te demande de rédiger ou mettre à jour une spec fonctionnelle de l’app (couvrir un domaine/feature).
- On doit synchroniser les specs avec les routes/écrans, le backlog, les DRY et les retours QA.

## Workflow
0) **Routes à jour** : si besoin, rafraîchir `logics/models/04_ROUTES_AND_SCREENS.md` (ajouter les nouvelles routes/écrans repérés) avant de toucher à l’index.
0bis) **Modèle à jour** : vérifier `logics/models/03_DATA_MODEL.md` et le mettre à jour si des entités/champs ont évolué dans la codebase avant de rédiger/ajuster une spec.
0bis) **Index domaines/écrans** : tenir à jour `logics/specs/_index.md` (mapping domaines ↔ routes/écrans ↔ fichier de spec). Parcourir `04_ROUTES_AND_SCREENS.md` pour identifier les écrans, compléter l’index avec le nom du domaine, les routes concernées et le fichier de spec (ou TODO si manquant). Mettre à jour l’index avant/après chaque spec.
1) **Identifier le domaine** via `logics/models/04_ROUTES_AND_SCREENS.md` (groupes : auth, profil, cours/agenda, positions/presets, facturation, admin, super-admin, notifications, progression, partenaires, etc.).
2) **Sources** : lire le ticket d’entrée (QA/DRY/backlog). Compléter avec `logics/foundry/*.md`, `logics/discovery/*.md`, `logics/backlog/*.md`, `logics/models/03_DATA_MODEL.md`. Si conflit ou obsolescence suspecte : prioriser routes/models/code actuels. **Ne jamais intégrer des notions non implémentées** : si une idée est seulement dans backlog/DRY et absente du code, ne pas la mettre dans la spec (ou la marquer explicitement comme “à implémenter” avec avancement 0%). Signaler les écarts dans Risques/Sources et expliciter les hypothèses.
3) **Fichier cible** : sous `logics/specs/`, nom court et stable par domaine (ex. `auth.md`, `courses-agenda.md`, `billing.md`). Créer si absent, sinon mettre à jour.
4) **Structure** : utiliser le template `references/TEMPLATE.md` avec header complet `[Aligné vX.Y.Z | Compréhension: ??% | Confiance: ??% | Avancement: ??% | Portée: …]` puis sections (Objectif, Périmètre in/out, Règles fonctionnelles, UX cible, Données/technique, Tests & QA, Risques/points ouverts, Sources). Ajouter Plan si utile.
5) **Style** : FR, concis, actionnable, bullets. Mentionner RBAC, filtres `schoolId`, états vides, CTA, liens `from` si concernés. Alignement v0.14.x.
6) **Questions de clarté/confiance** : remplir les sections “Questions…” du template si compréhension/confiance < 90% ou si des zones d’ombre persistent.
7) **Traçabilité** : en bas ou dans Risques/Sources, référencer les sources utilisées (DRY/QA/backlog/routes/models) et les hypothèses.

## Templates/références
- Squelette : `logics/skills/project-spec-writer/references/TEMPLATE.md`

## Sortie attendue
- Fichier Markdown dans `logics/specs/` mis à jour, sans blabla superflu, prêt pour dev/QA.
