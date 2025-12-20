# Backlog Mapbox (affichage studios/partenaires)

## Pré-requis & configuration
- Créer un compte Mapbox, générer un token restreint (domaines autorisés, referrers).
- Ajouter `NEXT_PUBLIC_MAPBOX_TOKEN` (lecture client) et documenter dans `02_RENDER_INSTRUCTIONS.md` si nécessaire.
- Choisir le style de carte (ex: `mapbox://styles/mapbox/dark-v11`) et définir un zoom/center par défaut (ex: école).

## Données & schéma
- Étendre Studio (et Partner si besoin) avec lat/lng :
  - Champs `latitude`/`longitude` optionnels (`Float?`) dans Prisma.
  - Migration Prisma + seed fallback (calculer lat/lng si l’adresse est connue via un script).
- Backfill : script pour géocoder les adresses existantes (Mapbox Geocoding API) et stocker lat/lng; prévoir un flag `geocodingStatus` si besoin.
- Validation : lors de la création/édition de studio, accepter lat/lng ou géocoder si l’adresse est fournie et qu’on autorise l’appel.

## Backend / API
- Helper `lib/mapbox.ts` pour centraliser l’URL du style, la création de clients Geocoding, et limiter le débit.
- Route API (optionnel) pour géocoder côté serveur (éviter d’exposer la clé Geocoding si non restreinte), sinon usage direct côté client avec token restreint referrer.
- Endpoint pour récupérer la liste des studios avec lat/lng (ou réutiliser la page admin existante en RSC et passer les coords au client).

## Front / composant carte
- Créer un composant client `MapStudios.tsx` utilisant `react-map-gl` ou `mapbox-gl` (with `mapbox-gl` CSS import).
- Props : `studios: { id; name; latitude; longitude; address? }[]`, `height`, `initialCenter`, `initialZoom`.
- Afficher des marqueurs (pictogramme studio), popover au clic (nom, adresse, lien “Voir” / “Éditer”).
- Clustering si beaucoup de points (optionnel).
- Bouton “Ouvrir dans Maps” (lien Google Maps/Apple Maps) depuis le popover.
- Responsiveness : hauteur ajustable (ex: 320px mobile, 480px desktop).
- Fallback : si pas de lat/lng, afficher un message ou ignorer le point; si token manquant, afficher un message d’info.

## Intégrations UI (cibles)
- Admin studios (`/app/admin/studios`) : panel “Carte des studios” avec markers cliquables.
- Admin partenaires (optionnel) : même approche si les partenaires ont des adresses géocodées.
- Liste cours (agenda) : option future pour afficher les studios sur carte.

## Sécurité / coûts
- Token restreint aux domaines Render et localhost, scopes minimum.
- Débit Geocoding : limiter les requêtes (géocoder une seule fois et stocker lat/lng).
- Pas de clés secrets côté client (utiliser token publique restreint).

## Tests & QA
- Tests unitaires du helper Mapbox (construction d’URL, validation des coords).
- Tests d’intégration du composant carte (mock `mapbox-gl` ou utiliser `react-map-gl` avec mocks).
- QA manuelle : studios avec/ sans coords, popover, liens “Voir”.

## Déploiement
- Ajouter `mapbox-gl`/`react-map-gl` au `package.json`.
- Mettre à jour la doc Render (vars env).
- Vérifier `npm run build` (import CSS mapbox global, gestion SSR vs client).
