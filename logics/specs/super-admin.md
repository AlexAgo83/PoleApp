# Super-admin — gestion globale & audit
[Aligné v0.14.0 | Compréhension: 85% | Confiance: 75% | Avancement: 100% | Portée: `/super-admin*`, `/logics`]

## Objectif
- Décrire les surfaces super-admin : gestion globale écoles/offres/packs, reset, audit médias/Cloudinary, accès docs internes.

## Périmètre (in/out)
- (in) Routes : `/super-admin`, `/super-admin/media-audit`, `/logics`.
- (out) Ops DB/migrations, observabilité avancée.

## Règles fonctionnelles
- Accès réservé SUPER_ADMIN.
- Backoffice : gestion écoles/offres/packs (selon UI), reset mot de passe, audit log minimal (DRY17).
- Media audit : diff Cloudinary vs DB, filtres resource/type, export CSV, orphelins/cassés.
- `/logics` : lecture docs internes stylisées.

## UX cible
- Dashboard backoffice avec listes écoles/offres/packs, CTA éditer/désactiver.
- Media audit : filtres, résultats paginés, export CSV, indicateurs anomalies.
- Page logics : rendu Markdown avec checkboxes stylisées.

## Données / technique
- Modèles : School, Global offers/packs, AuditLog, médias Cloudinary.
- APIs internes super-admin (non listées), `/super-admin/media-audit`.
- RBAC : middleware super-admin, bypass schoolId.

## Tests & QA
- Accès restreint SUPER_ADMIN ; autres rôles refusés.
- Media audit : filtres et export CSV fonctionnels.
- Actions sensibles (force verify/disable) loguées si audit actif.

## Risques / points ouverts
- Étendue exacte des écrans écoles/offres/packs non détaillée dans routes.
- Couverture audit des actions sensibles à clarifier.

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- README : media audit super-admin.***
