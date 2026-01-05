# Partenaires — redirections & gestion
[Aligné v0.14.0 | Compréhension: 84% | Confiance: 74% | Avancement: 100% | Portée: partenaires élève/admin + tracking]

## Objectif
- Décrire l’affichage et le suivi des partenaires côté élève/admin/teacher.

## Périmètre (in/out)
- (in) Routes : `/app/student/partners`, `/app/admin/partners`, `/app/teacher/partners`.
- (in) API : `/api/partners/redirect`.
- (in) Gestion : CRUD partenaires (admin), tracking clic/achat via PartnerEvent.
- (out) Programmes d’affiliation avancés, analytics externes.

## Règles fonctionnelles
- Scope école : partenaires rattachés à la schoolId ; super-admin bypass.
- Élève/prof : liste partenaires de l’école ; clic via `/api/partners/redirect` qui logge l’évènement CLICK (et PURCHASE si applicable).
- Admin : CRUD partenaires (nom/kind/site/description/schoolId), gestion liens sponsorisés ; peut consulter les events.
- RBAC : admin/super-admin création/édition ; élèves/profs lecture seule.

## UX cible
- Liste cartes partenaires (logo/nom/description/lien) ; bouton “Visiter”.
- Admin : table/fiche partenaires, formulaire CRUD ; stats clics/achats si présentes.

## Données / technique
- Modèles : Partner, SponsoredLink, PartnerEvent (type CLICK|PURCHASE, userId?, courseId?, studioId?).
- API redirect enregistre PartnerEvent puis redirige vers l’URL ; sanitize URL.
- Filtrage schoolId.

## Tests & QA
- RBAC : admin CRUD ; autres lecture ; super-admin bypass.
- Redirect : enregistre CLICK avant redirection ; URL sûre.
- Events visibles côté admin si UI.

## Risques / points ouverts
- Comment est généré PURCHASE (déclencheur) ; sécurisation URLs externes.

## Sources
- Routes/APIs : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md`.
- Code : partenaires student/admin/teacher, API redirect.***
