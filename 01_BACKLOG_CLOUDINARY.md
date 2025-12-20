# Backlog Cloudinary (uploads médias)

## Pré-requis & configuration
- Créer le compte Cloudinary (env de prod + dev) et générer les credentials : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Ajouter les variables d’environnement à Render + `.env.local` et documenter (`02_RENDER_INSTRUCTIONS.md` si besoin).
- Choisir le dossier/bucket logique (ex: `poleapp/{env}/{resource}`).
- Définir une politique de nommage public_id (ex: `users/{userId}/avatar`, `courses/{courseId}/{uuid}`).
- Définir les transformations par défaut (resize/crop/format auto) et la liste des MIME autorisés.

## Backend (API/signatures)
- Ajouter un helper Cloudinary serveur (`lib/cloudinary.ts`) avec SDK `cloudinary`.
- Exposer une route API (App Router) POST `/api/uploads/signature` :
  - Authentifie via NextAuth session.
  - Accepte `folder`, `resourceType` (image), `publicId?`.
  - Retourne signature, timestamp, folder, public_id.
- Exposer une route DELETE `/api/uploads` :
  - Auth + vérif ownership/role (avatar : user self; prof/admin pour leurs ressources; admin pour tout).
  - Supprime via `cloudinary.uploader.destroy(public_id)`.
- Ajouter une fonction utilitaire pour construire l’URL sécurisée (avec transformations par défaut).

## Modèles & stockage DB
- Champs existants : `User.avatarUrl`, `Course.photoUrl`, `Position.media` (URL déjà utilisées).
- Décider si l’on stocke `public_id` en plus de l’URL (ajouter colonnes si besoin, ex: `avatarPublicId`, `coursePhotoPublicId`).
- Si ajout de colonnes : créer migration Prisma + seed fallback (rendre optionnel pour rétro-compatibilité).

## Composant Upload (réutilisable)
- Créer `components/CloudinaryUpload.tsx` (client):
  - Props : `label`, `currentUrl?`, `onChange(url: string, publicId?: string)`, `accept?`, `maxSizeMB?`.
  - Affiche l’aperçu (ou placeholder), bouton “Uploader”, bouton “Supprimer” si image présente.
  - Flux : appelle `/api/uploads/signature`, puis envoie le fichier vers `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload` via `fetch` ou `axios` avec form-data (file + signature + timestamp + folder + public_id).
  - Gestion des états : loading, erreur, succès; désactive les actions pendant l’upload/suppression.
  - Suppression : appelle DELETE `/api/uploads` avec `public_id` avant de nettoyer l’état, puis `onChange(null, null)`.
  - Accessibilité : input file accessible, feedback d’erreur/chargement.
- Ajouter une variante pour les tailles : avatar carré (crop/resize), photo cours (16:9), etc. via props `transformPreset`.

## Intégrations UI (à planifier)
- Profil utilisateur : remplacer l’input URL par le composant upload (avatar).
- Fiche cours (création/édition) : remplacer l’URL photo par le composant upload.
- Fiche position (si besoin) : uploader media principal.
- Prévoir placeholders si aucune image.

## Sécurité & limites
- Valider la taille et le type côté client et côté serveur (MIME/extension, max MB).
- Empêcher l’upload anonyme/non autorisé (RBAC sur la route de signature).
- Nettoyage : lors de la suppression de l’entité (user/course), supprimer l’image Cloudinary si `public_id` connu.
- Logs/monitoring : journaliser les erreurs d’upload/destroy avec userId/resourceId.

## Tests & QA
- Tests unitaires du helper de signature (mocks), routes API avec session mockée.
- Tests d’intégration du composant upload (Vitest + jsdom) : states loading/erreur, onChange appelé.
- QA manuelle : upload/suppression avatar et photo cours, vérifier que l’URL stockée est servie par Cloudinary avec la transformation attendue.

## Déploiement
- Ajouter `cloudinary` au package.json.
- Mettre à jour la doc Render (vars d’env + rappel build/start).
- Vérifier `npm run build` après ajout des env côté CI/Render.
