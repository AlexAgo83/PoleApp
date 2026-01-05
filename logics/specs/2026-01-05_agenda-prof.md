# Agenda professeur — fiche publique
[Aligné v0.14.0 | Compréhension: 90% | Confiance: 70% | Avancement: 0% | Portée: `/teachers/[id]` agenda + localisation (à implémenter)]

## Objectif
- Documenter l’agenda prof sur la fiche publique et la localisation, demandé en QA S017 (non implémenté à date).

## Périmètre (in/out)
- (in) Fiche prof `/teachers/[id]` pour utilisateurs connectés.
- (in) Agenda semaine du prof avec navigation, CTA vers cours.
- (in) Bloc localisation (école + studios/ville des cours à venir, mention en ligne).
- (out) Prise de RDV hors cours, ICS dédié, contact direct.

## Règles fonctionnelles (cible)
- Accès & scope : session requise ; filtrage `schoolId`; consultable par élèves/profs/admins/super-admins.
- Agenda : vue semaine par défaut, nav ±8 semaines ; filtre `teacherId` forcé serveur ; cartes cours avec statut perso si dispo, studio/“En ligne”; état vide avec lien vers liste cours du prof.
- Localisation : liste écoles/studios (nom/adresse/ville) des cours à venir ; mention “En ligne” si cours virtuel ; fallback si aucune info.
- UX : panel/section identique à “Planning - Agenda de l’école” (/teacher/school), placé avant les sections “Édition”.
- Retour `from` conservé sur CTA cours.

## Données / technique (cible)
- Réutilisation `/api/student/week-courses` filtré `teacherId` côté serveur + filtrage `schoolId`.
- Loader studios distincts des cours à venir (nom/adresse/ville, flag isVirtual).
- Fenêtre temporelle limitée (ex. 16 semaines).

## Tests & QA à prévoir
- Filtre `teacherId` non contournable ; filtrage `schoolId` respecté.
- Navigation semaines OK ; badges studio/“En ligne” ; état vide correct.
- Bloc localisation affiche studios/ville ou “En ligne” ; fallback sinon.
- Cohérence visuelle avec planning teacher/school.

## Risques / points ouverts
- Prof sans school ou multi-écoles : comportement à clarifier (agenda vide ?).
- Placement exact du bloc localisation dans la fiche.

## Sources
- QA : `logics/discovery/06_QA_S017.md`.
- DRY 018 : `logics/foundry/08_DRY_018.md`.***
