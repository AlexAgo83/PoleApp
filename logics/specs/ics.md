# ICS cours — export calendrier
[Aligné v0.14.0 | Compréhension: 85% | Confiance: 80% | Avancement: 100% | Portée: `/api/courses/[id]/ics`]

## Objectif
- Décrire l’export ICS pour ajouter un cours au calendrier.

## Périmètre (in/out)
- (in) Route : `/api/courses/[id]/ics`.
- (in) Génération ICS pour un cours (titre, horaire, durée, lieu/en ligne, alarme, timezone).
- (out) Abonnements dynamiques, séries récurrentes avancées.

## Règles fonctionnelles
- Accès : authentifié, filtrage `schoolId` ; super-admin bypass.
- Contenu ICS : titre cours, date/heure, durée, discipline, localisation (studio nom/adresse ou vide si virtuel), description avec prof + lien cours ; alarme par défaut (globalSetting `icsDefaultAlarmMinutes`).
- Timezone : prend `timezone` des GlobalSettings (sinon Europe/Paris).
- Bouton ICS exposé sur les fiches cours élève/prof.

## UX cible
- CTA “Ajouter à mon calendrier” qui télécharge le fichier ICS.

## Données / technique
- API handler `app/api/courses/[id]/ics/route.ts`.
- Utilise `Course` (date, durationMinutes, title, discipline, studio), `GlobalSetting` (timezone, alarm).
- Response `text/calendar`, fichier `course-<id>.ics`.

## Tests & QA
- Accès filtré par rôle/école ; 404 si cours absent.
- ICS ouvert : horaires/durée corrects, alarme présente, timezone appliquée.
- Virtuel : localisation vide ou “En ligne”.
- Lien cours correct selon rôle (student vs teacher path).

## Risques / points ouverts
- Location pour cours virtuel (adresse vide) à clarifier.
- Règle d’accès aux cours désactivés pour non inscrits à préciser.

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md`.
- Code : `app/api/courses/[id]/ics/route.ts`, fiches cours élève/prof (CTA).***
