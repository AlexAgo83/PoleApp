# Backlog Cloudinary (uploads médias)
[Compréhension: 90% / Confiance: 85% / Avancement: 80%]
> FAIBLE PRIORITE
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).

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
- Champs existants : `User.avatarUrl` (+ `avatarPublicId`), `Course.photoPublicId`, `Studio.photoPublicId`, `School.photoPublicId`, `Position.media.url/publicId`.
- Colonnes public_id ajoutées et optionnelles, seed aligné (pools Cloudinary pour écoles/studios/cours/presets).

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
- Profil utilisateur : remplacer l’input URL par le composant upload (avatar). **(DONE)**
- Fiche cours (création/édition) : composant upload branché Cloudinary (DONE).
- Fiche position : uploader media principal + vidéo (fait).
- École/Studios : formulaires admin basculés sur CloudinaryUpload (DONE).
- Presets : image/vidéo Cloudinary (DONE).
- Prévoir placeholders si aucune image (DONE).

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

## État
- Upload vidéo positions en mode authenticated + URL signées : livré (`CloudinaryUpload`, routes signature/delete, helper generateSignedUrl).
- Seed : chaque position reçoit une vidéo Cloudinary authenticated (pool fixe). Écoles/Studios/Cours/Presets seedés avec publicId Cloudinary.
- Avatars utilisateurs : upload/suppression + fallback seed en place, validations taille/format activées.
- Reste à faire : nettoyage automatisé lors des suppressions d’entités (prisma hooks/queues) et monitoring/quota Cloudinary.
