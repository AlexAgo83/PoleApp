# Notifications — centre de notifications
[Aligné v0.14.0 | Compréhension: 85% | Confiance: 75% | Avancement: 100% | Portée: API/UX cloche notifications]

## Objectif
- Décrire le centre de notifications in-app (cloche) et ses APIs.

## Périmètre (in/out)
- (in) APIs : `/api/notifications`, `/api/notifications/read`, `/api/notifications/delete`.
- (in) UI cloche : liste notifications (limite 50), compteur non lus, actions clear all/delete.
- (out) Push email/mobile, préférences par type.

## Règles fonctionnelles
- Accès authentifié ; filtrage par userId.
- Fetch limité 50 ; déduplication par user/kind/course.
- Actions : marquer comme lues, supprimer, clear all ; compteur mis à jour.
- Liens internes vers ressources (cours, facture, etc.).
- RBAC : notifications de l’utilisateur uniquement ; super-admin voit les siennes.

## UX cible
- Icône cloche avec badge compteur ; panel liste titre/body/lien éventuel.
- Boutons “Tout marquer comme lu” / “Supprimer” / “Tout supprimer”.

## Données / technique
- Modèle `Notification` : userId, kind, title/body, link?, courseId?, readAt?, createdAt.
- API REST simple, cache no-store, session requise.
- Déduplication lors de la création (user, kind, courseId).

## Tests & QA
- Fetch limite 50 ; compteur exact.
- Actions read/delete/clear all persistées.
- RBAC : un user ne voit que ses notifs.
- Liens internes sûrs (pas de protocole externe).

## Risques / points ouverts
- Absence de préférences peut générer du bruit.
- Déduplication suffisante ? (clefs additionnelles à valider).

## Sources
- Routes/APIs : `logics/models/04_ROUTES_AND_SCREENS.md`.
- Modèle : `logics/models/03_DATA_MODEL.md`.***
