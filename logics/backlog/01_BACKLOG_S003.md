# Backlog — Programme “Remise en forme / Débutant·e pole” (notes S003)
[Compréhension: 35% / Avancement: 0% / Obsolete: 65%]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

## Décisions récentes
- Exclusions blessures : autoriser les positions/cours même si incompatibles, mais afficher badge/alerte (texte court “Incompatible avec blessure X”). Visibles pour Prof + Admin, avec option explicite pour forcer malgré l’alerte.
- Interaction : bouton “Forcer quand même” explicite (pas de toggle).

## Objectif
Proposer un programme premium clé-en-main (sport + nutrition) pour débutants/retours à la pole, avec coordination coach/nutritionniste/école via l’app.

## Parcours utilisateur
- Page “Abonnements & forfaits” : proposer le programme.
- Questionnaire initial (objectifs, niveau, habitudes, contraintes, blessures).
- Génération du plan sportif + nutritionnel (IA ou règles + validations humaines).
- Suivi dans l’app : planning, progression, feedback.

## Données / Modèle
- `ProgramSubscription` : lie un utilisateur à un programme (dates, statut, coach/nutritionniste assignés).
- `ProgramPlan` : plan sportif + nutritionnel généré (versioning + validations).
- `ProgramSession` : séances (type: musculation, souplesse, VOD maison), statuts (à faire/fait).
- `ProgramQuestionnaire` : réponses initiales (objectifs, niveau, contraintes).
- `Partner` (coach muscu, nutritionniste) déjà présent : associer au programme.
- Champs user : préférences/objectifs, blessures déjà gérées via StudentInjury.

## Génération du plan (pistes)
- Sport :
  - Musculation : plan généré (IA ou règles) et validé par coach partenaire.
  - Souplesse : cours de flexibilité/mobilité de l’école.
  - Maison : cours VOD muscu.
- Nutrition :
  - Généré (IA ou règles), validé par nutritionniste partenaire.
  - 1 à 2 consultations max (flag sur la subscription).
- Orchestration :
  - Planning combinant muscu/souplesse/VOD.
  - Rappels/notifications (plus tard).

## UI / UX
- Abonnements/forfaits : carte “Remise en forme” avec CTA “Commencer”.
- Questionnaire : formulaire multi-step.
- Plan : calendrier/roadmap, sessions listées, progression (statuts, check).
- Détail session : instructions, médias (VOD), niveau requis.
- Espace “Coach/Nutrition” : assignation des partenaires, validation des plans.

## Tâches
- [ ] Abonnements : carte programme premium avec CTA “Commencer” / upsell si non premium, création `ProgramSubscription` (coach/nutri assignables).
- [ ] Questionnaire multi-step (objectifs, niveau, habitudes, contraintes, blessures) avec persistance `ProgramQuestionnaire`.
- [ ] Génération plan sport + nutrition validable par coach/nutri (versioning `ProgramPlan`), badges/alertes blessures (“Incompatible avec blessure X”) avec bouton “Forcer quand même”.
- [ ] Sessions : création des `ProgramSession` (muscu/souplesse/VOD) planifiées, statuts à faire/fait, visibles dans le planning utilisateur.
- [ ] Espace Coach/Nutrition : vue de validation des plans et des sessions, possibilité de forcer malgré alerte blessure, audit minimal (timestamps/actor).

## Intégration existante
- Utiliser `Partner` pour coach muscu/nutritionniste.
- Réutiliser VOD/Planning si/when disponible (placeholders sinon).
- Filtrer exercices selon blessures (StudentInjury).

## Tech
- Actions serveur pour générer/valider plans.
- Prisma : nouvelles tables (ProgramSubscription/Plan/Session/Questionnaire).
- Option IA (plus tard) : endpoint tiers, stocker la version validée seulement.

## Definition of Done (DoD)
- Abonnement : création `ProgramSubscription` depuis la carte, coach/nutri assignables, upsell premium géré.
- Questionnaire : données complètes persistées, réouverture possible pour édition.
- Plan : version générée + version validée distinctes, alertes blessures affichées aux coach/admin, bouton “Forcer quand même” appliqué et tracé.
- Sessions : planning sport + nutrition visible (statuts à faire/fait), dépend du plan validé.
- Coach/Nutri : écrans de validation/force accessibles, badges/alertes blessures visibles, audit (qui valide/force).

## Tests & QA
- Unitaires : fonction de génération (sport + nutrition) avec règles, pondération et validation ; règles de filtrage blessures avec badge + option force.
- Intégration : abonnement → questionnaire → génération → validation (avec/ sans “Forcer quand même”) → sessions visibles dans le planning.
- QA manuel : alerte “Incompatible avec blessure X” visible pour prof/admin, bouton “Forcer quand même” crée un plan/séance marquée comme forcée ; VOD/maison affichées quand prévues.
