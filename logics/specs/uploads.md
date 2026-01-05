# Uploads & médias — Cloudinary
[Aligné v0.14.0 | Compréhension: 85% | Confiance: 75% | Avancement: 100% | Portée: `/api/uploads*`, médias avatars/cours/positions/presets]

## Objectif
- Encadrer les uploads médias (avatars, cours, positions, presets) via Cloudinary.

## Périmètre (in/out)
- (in) APIs : `/api/uploads`, `/api/uploads/signature`, `/api/uploads/signed-url`.
- (in) Surfaces : avatars user/prof, photos cours/studios, positions/presets, headers/photos école.
- (out) Autres providers, stockage local.

## Règles fonctionnelles
- Auth requise ; signature serveur pour uploads Cloudinary (pas de creds client).
- RBAC : avatar → user ; prof/admin pour leurs ressources ; admin peut tout ; super-admin bypass.
- Contraintes poids/résolution (avatars 4 Mo max, jpg/png/webp) ; validations serveur.
- Destruction : via API sécurisée ; seed protégée.
- Dossiers : avatars `NEXT_PUBLIC_CLOUDINARY_AVATAR_FOLDER` (fallback `poleapp/avatars`), autres selon ressource.

## UX cible
- Inputs upload avec preview/toasts ; placeholders si pas de média.

## Données / technique
- Cloudinary signatures via `/api/uploads/signature`; stockage `publicId` en DB (User.avatarPublicId, PositionMedia, Course photoPublicId…).
- API signed-url pour upload direct.
- Sanitisation noms/folders ; limites enforced serveur.

## Tests & QA
- Upload avatar/cours/position/preset réussit ; échec si taille > limite.
- RBAC : pas d’upload pour un autre user (sauf admin).
- Seed non détruite ; formats acceptés respectés.

## Risques / points ouverts
- Quotas Cloudinary et nettoyage orphelins (couvert par media audit super-admin).

## Sources
- Routes : `logics/models/04_ROUTES_AND_SCREENS.md`.
- README : contraintes médias/Cloudinary.
- Backlog Cloudinary.***
