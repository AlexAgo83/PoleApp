# Super-admin — gestion globale & audit
[Aligné v0.14.x | Compréhension: 88% | Confiance: 80% | Avancement: 100% | Portée: `/super-admin*`, `/logics`]

## Objectif
- Décrire les surfaces super-admin : gestion globale écoles/offres/packs, reset, audit médias/Cloudinary, accès docs internes.

## Périmètre (in/out)
- (in) Routes : `/super-admin`, `/super-admin/media-audit`, `/logics`.
- (out) Ops DB/migrations, observabilité avancée.

## Règles fonctionnelles
- Accès réservé SUPER_ADMIN (middleware).
- Dashboard `/super-admin` : grille 2 colonnes (`lg:grid-cols-2`) de panneaux hero + stats pills + shortcuts.
  - Pilotage : Écoles, Utilisateurs, Premium, Profs, Élèves + liens Écoles / Utilisateurs / Préférences (TVA/devise).
  - Offres & revenus : Packs actifs, Abos actifs, Presets (compte), Premium % + liens Packs crédits / Abonnements. Pas de shortcut presets global.
  - Catalogue & conformité : Positions, Studios, Partenaires + liens Audit médias / Docs internes.
  - Audit : panneau PersistedPanel (10 dernières actions audit log) placé dans la grille (case 4) avec ouverture/fermeture persistée.
- Media audit : diff Cloudinary vs DB, filtres resource/type, export CSV, orphelins/cassés.
- `/logics` : lecture docs internes stylisées.

## UX cible
- Dashboard en panneaux glassmorphism (hero gradient, pills, shortcuts flèche) 2 colonnes ; Audit occupe une case de la grille.
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
- Stats globales : à aligner avec filtres éventuels (actif/ouvert).

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- README : media audit super-admin.***
