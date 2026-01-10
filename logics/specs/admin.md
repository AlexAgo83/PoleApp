# Espace admin école — gestion école, cours, facturation
[Aligné v0.14.x | Compréhension: 90% | Confiance: 85% | Avancement: 100% | Portée: `/app/admin/*`]

## Objectif
- Décrire l’espace admin pour gérer utilisateurs/studios/partenaires/cours et facturation.

## Périmètre (in/out)
- (in) Routes : `/app/admin`, `/app/admin/users`, `/app/admin/teachers`, `/app/admin/studios`, `/app/admin/partners`, `/app/admin/school`, `/app/admin/courses/[id]`, `/app/admin/billing`.
- (in) API agenda : `/api/admin/week-courses`.
- (out) Multi-écoles avancé (hors super-admin), paiements externes.

## Règles fonctionnelles
- Scope école : données filtrées par `schoolId` de l’admin ; super-admin bypass.
- Dashboard : panneaux thématiques (Pilotage, Catalogue, Activité, Finance) en grille 2 colonnes (`lg:grid-cols-2`) avec stats pills et shortcuts :
  - Pilotage : utilisateurs/premium/profs/admins/élèves + liens Écoles/Profs/Utilisateurs.
  - Catalogue : positions/combos/disciplines/studios/partenaires + liens Positions/Presets/Studios/Partenaires.
  - Activité : cours du jour/7j, inscriptions 7j/mois, blessures + liens Planning/Élèves/Jeux.
  - Finance : premium %, admins, factures payées/en attente, total payé (€) + liens Facturation/Achats/Audit.
- Users/teachers/studios/partners : listes paginées + filtres ; désactivation studios/discipline/users (DRY17) avec badges “Désactivé”.
- Cours admin : fiche cours lecture, badges désactivation ; actions admin selon implémentation.
- Facturation admin : table factures avec filtres/statuts, actions statut (toasts), export CSV ; stats de dashboard basées sur `InvoiceStatus` (PAID vs GENERATED/SENT/LATE).
- Partenaires : CRUD + tracking clic/achat.

## UX cible
- Dashboard en panneaux hero + stats pills + raccourcis (2 colonnes dès `lg`, shortcuts en 2 colonnes dès `sm`).
- Listes users/teachers/studios/partners : filtres, pagination 10, toggles désactivation, badges.
- Billing : table factures filtres/pagination, actions statut, export CSV, toasts.
- Détail cours : infos prof/studio/discipline, inscriptions, badges désactivé si applicable.

## Données / technique
- Modèles : User (roles, disabledAt/By), Studio/Discipline (disabledAt/By), Course (+ Invoice), Partner/PartnerEvent.
- APIs : `/api/admin/week-courses`, `/api/admin/billing/*`.
- Désactivation : retire des sélecteurs, bloque nouvelles inscriptions, badge sur cours.
- Pagination 10 sur listes.

## Tests & QA
- RBAC : admin/super-admin uniquement ; filtrage schoolId.
- Désactivation : studios/disciplines/users retirés des sélecteurs, badges visibles ; réactivation rétablit.
- Billing : changement statut persiste, export CSV OK, filtres fonctionnels.
- Agenda : navigation semaine, bouton semaine actuelle.

## Risques / points ouverts
- Actions exactes sur fiche cours admin (annulation/remboursement) à préciser.
- Surfaces avec filtres persistés à confirmer.
- Calcul des stats finance aligné sur école de l’admin (à vérifier en multi-écoles).

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md`.
- Code : `app/admin/*`, APIs admin.***
