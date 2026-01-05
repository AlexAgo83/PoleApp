---
name: dry-writer
description: Créer un nouveau plan DRY dans logics/foundry à partir d’un besoin (QA/backlog/feature) en suivant le format des DRY existants.
---

# Création d’un DRY (PoleApp)

## Quand utiliser
- On te demande de rédiger un nouveau DRY (plan d’exécution) pour un besoin/feature.

## Workflow
1) **Collecte** : lire le besoin (QA/backlog/feature). Noter les sources utilisées dans le DRY (section Sources). Survoler `logics/models/04_ROUTES_AND_SCREENS.md` et `03_DATA_MODEL.md` pour rester aligné vX.Y. Ne pas inventer de surfaces absentes de la codebase ; si le besoin est prospectif, le signaler clairement.
2) **Numéro** : lister `logics/foundry/08_DRY_*.md` et prendre le prochain numéro libre (ex. 08_DRY_019.md). Conserver le préfixe `08_DRY_XXX`.
   - TODO: ajouter un script helper pour calculer le prochain numéro libre.
3) **Fichier cible** : `logics/foundry/NN_DRY_XXX.md`.
4) **Structure** : utiliser le template (Objectif, Périmètre in/out, Règles fonctionnelles, UX, Données/technique, Tests/QA, Plan & tâches, Risques/points ouverts, Sources). Header : `# NN_DRY_XXX — …` puis `[Aligné vX.Y.Z | Compréhension: ??% | Confiance: ??% | Avancement: 0% | Portée: …]`. Indiquer l’état réel (non implémenté = Avancement 0%).
5) **Style** : FR, concis, actionnable. Pas de blabla ; bullets. Alignement avec version courante. Marquer explicitement ce qui est à implémenter ; ne pas décrire comme livré. Mentionner RBAC et scope école dans Règles si pertinent. Le DRY doit respecter la codebase actuelle (routes/logiciels/UI) et s’inspirer des patterns existants (logic et design) plutôt que réinventer.
6) **Plan** : détailler les tâches (cases à cocher) avec dépendances éventuelles (tests, seed, docs). Inclure un rappel de lancer les tests (unit/intégration) et le test de build.
7) **Vérifs** : cohérence périmètre/règles/UX/tests ; éviter tout contenu non implémenté sans le signaler.

## Template/référence
- `logics/skills/dry-writer/references/TEMPLATE.md`

## Sortie attendue
- Un fichier `logics/foundry/NN_DRY_XXX.md` complet, prêt pour revue, ou la mise à jour d’un DRY existant si demandé.
