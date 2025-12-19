# Step 9 — Retour QA 19.12

Objectif : traiter le lot de retours QA du 19/12 pour stabiliser la V0.2.1 (navigation, cohérence UI/UX, fiabilité des données affichées).

## Périmètre
- Navigation et bandeaux : unifier le bandeau des espaces (session/rôle/boutons), activer le pliage par défaut de « Status build » (desktop : ouvert), conserver le retour contextuel (positions, élèves, mini-jeu, modules) et éviter les retours vers la mauvaise vue.
- Positions : une seule vue partagée (élève/professeur/admin) avec design teacher, rôle visible, grille 2 colonnes, retour contextuel correct, bannière présente. Backlinks depuis un détail vers la bonne liste d’origine.
- Cours (professeur/admin) : tri par date, pagination 10, détail et édition sur le bon `id`, boutons d’édition alignés, heure correcte dans les formulaires, persistance des valeurs lors d’une sauvegarde.
- Élèves (professeur/admin) : pagination, fiche élève avec bouton retour liste, progression/blessures éditables sans reset des champs, pagination « Ma progression » et « Mes blessures » côté élève.
- Profil : salutations « Bonjour <prénom|nom|email> », page profil accessible depuis la home (« Modules »), édition prénom/nom fonctionnelle, texte d’aide unique, bouton Enregistrer aligné à droite.
- Accueil : pastilles rôles sous les descriptions de modules, ajout du module « Profil ».
- Robustesse Next.js : corriger les usages sync de `searchParams`/`params` (await/React.use) sur toutes les pages dynamiques.

## Hors périmètre
- Fonctionnalités majeures non liées au QA 19/12 (VOD, partenaires, paiements, planning avancé, audit/badges futurs).

## Plan d’action synthétique
- Corrections fonctionnelles (navigation, retours contextuels, tri, pagination, formulaires).
- Corrections UI (bandeaux, pastilles, marges, boutons).
- Sécurisation data/affichage (profil, sélection des bons enregistrements).
- Passes de QA sur les parcours élève/prof/admin (positions, cours, élèves, profil, progression/blessures).

## Retours QA_S001 → tâches

### Quick wins intégrables Step 9
- Navigation : clarifier le vrai « Accueil » (icône maison vers la home), retirer/confiner la page « Évolution de l’app » des raccourcis, conserver la barre de nav sur toutes les pages.
- Login : afficher les CTA de création de compte (élève/prof/admin) et rappeler freemium/premium (même si l’abonnement n’est pas encore implémenté).
- Admin/Prof : dans les listes cours ajouter filtres rapides (date, prof, niveau, discipline) en plus du tri date, et exposer l’école/studio comme champs dédiés.
- Positions : préparer le champ lien vidéo (non bloquant) et masquer description/vidéo pour les élèves non Premium quand on a l’info d’abonnement.
- Élèves/progression : supprimer doublons de niveaux, préparer code couleur progression (Découverte/Tenté/Passé/Fluide) pour harmoniser avec le tableau prof.
- Accès prof : restreindre la visibilité des élèves aux cours enseignés ou planifiés (filtre schoolId + cours associés).

### À planifier pour étapes suivantes (gros chantiers)
- Admin : onglets dédiés (planning & réservation, VOD, partenaires, achats/abonnements), reset mot de passe/email auto, filtres actifs/résiliés/échec de paiement.
- Planning/réservation : fiches école/studio, réservation avec gestion de crédits/upsell.
- Prof : générateur de cours avec souhaits imposés, notes privées prof, dashboard facturation, fiche prof publique, jeux/révisions prof.
- Élève : catalogue positions premium only, dashboard gamifié (badges/streaks/objectifs), fiche élève complète (photo, cours suivis, historique achats, statut premium), nouveaux onglets (classement, partenaires, VOD, planning, achats).
- Billing/abonnements : achat d’abonnements studio + premium app, historique achats.
- Onboarding hors connexion : création de compte + choix freemium/premium dès la home publique.

## Validation (à cocher lors du delivery)
- Navigation/bandeaux cohérents sur tous les espaces et pages de listes/détails.
- Positions : grille 2 colonnes, bannière visible, back vers la bonne liste.
- Cours : tri date OK, pagination OK, détail/édition sur le bon cours, heure intacte, boutons alignés.
- Élèves/blessures/progression : pagination, sauvegarde sans reset, retour vers liste élèves disponible.
- Profil : salutation priorise prénom>nom>email, édition prénom/nom prise en compte, module Profil sur la home.
- Aucun warning `searchParams`/`params` sync dans la console Next/Turbopack.
