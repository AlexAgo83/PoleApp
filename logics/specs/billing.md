# Facturation — invoices, statuts, exports
[Aligné v0.14.0 | Compréhension: 85% | Confiance: 75% | Avancement: 100% | Portée: `/app/admin/billing`, `/app/teacher/billing`, APIs billing]

## Objectif
- Décrire la gestion/lecture des factures côté admin et prof.

## Périmètre (in/out)
- (in) Routes : `/app/admin/billing`, `/app/teacher/billing`.
- (in) APIs : `/api/admin/billing/*`, `/api/teacher/invoices/*`, `/api/teacher/purchases/export`.
- (in) Fonctions : lecture factures, changement de statut (admin), export CSV, filtres/pagination.
- (out) Paiement en ligne, remboursements avancés (hors flux cours).

## Règles fonctionnelles
- Scope école : admin voit factures de son école ; prof voit factures de ses cours ; super-admin bypass.
- Statuts invoice : GENERATED/SENT/PAID/LATE/CANCELLED/REFUNDED ; transitions via admin (toasts).
- Export CSV côté admin ; prof lecture/export achats.
- Filtres : statut/date/course/prof (selon UI), pagination 10.
- Annulation/remboursement cours doit refléter la facture liée.

## UX cible
- Table factures avec filtres/pagination, actions statut (admin) + toasts.
- Bouton export CSV (admin).
- Vue prof : lecture seule des factures de ses cours.

## Données / technique
- Modèle `Invoice` : amountCents, currency, status, issuedAt, paidAt?, refundedAt?, refundNote?, manualStatus?, note?, courseId unique.
- APIs admin pour list/update/export ; APIs teacher pour lecture/export.
- Auth NextAuth + middleware rôle ; filtrage schoolId dans les requêtes.

## Tests & QA
- RBAC : admin/super-admin sur admin billing ; prof lecture seulement.
- Changement statut persiste et rafraîchit ; toasts OK.
- Export CSV correct ; pagination/filtres OK.
- Factures mises à jour lors d’annulation/remboursement cours (si flux présent).

## Risques / points ouverts
- Transitions de statuts exactes et impacts crédits/remboursements à détailler.
- Export teacher : périmètre des données (factures vs achats) à préciser.

## Sources
- Routes/APIs : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md`.
- Code : `app/admin/billing`, `app/teacher/billing`, APIs billing.***
