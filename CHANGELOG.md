# Changelog

## 2026-12-28 - Release v0.9.0

## 2025-12-28 — Release v0.8.2 (thème renforcé + panels super-admin)
- Thème global : palette accent fuchsia (remap des couleurs “cyan”), texte éclairci, fond lilas/bleu atténué, overlays panels assombris pour lisibilité.
- Super admin : formulaires “Nouvelle offre abonnement”, “Nouveau pack crédits” et “Créer une école” alignés sur les autres panels (fond glassy sombre, bordure visible), repli mémorisé conservé.
- UI : boutons/badges utilisent la palette fuchsia, sans modifier le fond global.

## Unreleased — Planning école élève + responsive agenda
- Positions : discipline badge sur vignettes et header, overlay progression/Vu, stats détaillées en cartes glassy, en-tête simplifié sur la fiche.
- Seed : muscles/articulations seeded et liés, positions attribuées à des professeurs seedés, cours répartis aléatoirement entre profs sans collisions, disciplines Pole/Pole Exotic/Souplesse/Pilates/Conditioning taguées sur positions/cours.
- Page école élève : agenda semaine/mois avec filtres (studio/prof/date/recherche/«mes cours»), légende code couleur, prochains cours, liens vers agenda/liste.
- Agenda élève (cours) : grilles semaine/mois adaptatives sans scroll horizontal sur mobile.
- Facturation : modèle `Invoice` (statuts Générée/Reçue/Payée/En retard/Annulée), pages `/app/admin/billing` (actions statut/montant, export CSV) et `/app/teacher/billing` (lecture), seed backfill (montant par défaut).
- Facturation admin : polish UI (filtres regroupés en panel stylisé, actions header alignées à droite, compteur sous les filtres, titre/date dissociés) + cartes synthèse actives/premium/crédits, label “Reçue”.
- Partenaires : filtres date/recherche/type appliqués aux stats clic/achat, toasts CRUD.
- Studios : toasts CRUD.
- Profil : toast de confirmation “Profil mis à jour”.
- Super admin : panels “Créer une école” (collapsable mémorisé), “Assigner un admin” dédié au-dessus de Promotion/Dégradation non-collapsible, pagination écoles/offres/packs, formulaires “Nouvelles offres” repliés par défaut, titres harmonisés.
- Positions : pages `/positions` protégées (login requis), header UI alignée sur le reste, contenu accessible aux élèves gratuits dès qu’une position est débloquée via cours (pas de bannière premium), message vidéo adapté.

## 2025-12-27 — Release v0.8.1 (vidéos Cloudinary positions)
- Positions : upload vidéo Cloudinary authentifié sur création/édition (signature serveur, suppression des anciens assets via publicId, limite 100MB) avec stockage `videoUrl`/`videoPublicId`.
- Lecture : fiche position lit les vidéos via URL signées Cloudinary, poster fallback, badge vidéo et bloc Premium si élève non débloqué.
- Catalogue positions : cartes list ajoutent badge vidéo, compteur “Vu” et rappel du niveau élève/progress pour les étudiants ; lien retour conservé.
- Seed : chaque position seed inclut une vidéo Cloudinary authenticated (3 assets en rotation) pour tester la lecture signée et le nettoyage publicId.
- Admin presets : `searchParams` awaité pour fiabiliser la pagination (plus d’erreur Next sur la page admin/presets).

## 2025-12-27 — Release v0.7.9 (catalogue presets + seed images)
- Nouvelle page `/presets` (catalogue combos/presets) avec filtres intégrés au panneau, badges discipline/premium/crédits, pagination, achat élève direct, messages flash, vignettes images.
- Admin/Prof presets : panels arrondis harmonisés, choix du prof créateur (admin), champ image en création + mise à jour, cartes avec vignette, actions supprimer/MAJ image alignées.
- Achats prof/admin : filtres via FilterPanel, panels alignés, pagination corrigée (plus d’erreur Symbol).
- Positions : masquage Vu/Progression si compteur 0, clear discipline sans JS, texte multi-sélection retiré.
- SafeImage : tailles par défaut pour les hôtes autorisés (évite l’erreur “width” requis).
- Seed : champ `imageUrl` sur Preset, deux presets avec images, nouvelles images écoles/positions, hôte `i.postimg.cc` autorisé; credits élèves 500 conservés.
- Version bump 0.7.9.

## 2025-12-22 — Release v0.7.0 (cœurs élèves, exclusions blessures, partenaires)
- Version bump 0.7.0.
- Générateur : pondération par cœurs élèves (favorite positions), badge “cœur”, exclusion stricte des positions incompatibles blessures, badge “Exclu blessure”, toggle “forcer 1 découverte”.
- Profil : élèves peuvent saisir leurs positions préférées (stockées, exploitées par le générateur).
- Partenaires : tracking PartnerEvent (clic/achat) via route de redirection, compteurs affichés sur la page admin.
- Docs : modèles/routes/instructions déplacés sous `logics/models` et `logics/instructions`.

## 2025-12-22 — Release v0.6.10 (fix migrations Render + types)
- Version bump 0.6.10.
- Prisma : migration `CourseRecommendation` robuste (enum `SuggestionTag` créé si absent), script `ci-migrate-deploy` qui resolve/force `db push` sur Render.
- Teacher cours : typage `applied` sur `searchParams` pour le toast “Suggestions appliquées”.

## 2025-12-22 — Release v0.6.9 (agenda inline + toast facturation)
- Version bump 0.6.9.
- Agenda admin/teacher/student : navigation semaine sans reload + bouton “Semaine actuelle”, filtres préservés, loaders discrets.
- Facturation admin : toast succès/erreur ancré en bas à droite (remplace la popin statut/montant).
- Générateur : table `CourseRecommendation` ajoutée et fallback gracieux si absence en base (pour compatibilité).

## 2025-12-22 — Release v0.6.8 (générateur suggestions + factu UX)
- Version bump 0.6.8.
- Générateur : suggestions basées sur la progression des élèves affichées sur la fiche cours (teacher/admin), édition des notes via l’écran d’édition (inline retiré), page cours admin dédiée.
- Facturation admin : toasts succès/erreur ancrés (#flash) pour actions rapides/backfill.

## 2025-12-22 — Release v0.6.7 (facturation tri + UX)
- Version bump 0.6.7.
- Facturation admin : tri configurable (date, montant, statut, prof) appliqué à l’export CSV, layout lisible (header montant/date, panneau actions séparé).
- Facturation : création automatique d’une Invoice à chaque nouveau cours (montant par défaut), flashes de succès/erreur, ordres stables (date desc/paiement).

## 2025-12-22 — Release v0.6.6 (facturation polish)
- Version bump 0.6.6.
- Facturation : export CSV via route API dédiée, actions statut guidées, validation Zod + logs structurés, backfill depuis l’UI admin.
- Build Next : page facturation admin compatible App Router.

## 2025-12-22 — Release v0.6.4 (facturation + agendas)
- Version bump 0.6.4.
- Agenda élève : grille responsive sans scroll, légende/badges, filtres persistés.
- Facturation : modèle Invoice, seed backfill, UI admin (actions, export CSV) + vue prof (lecture).

## 2025-12-21 — Release v0.5.1 (mini-jeux + studios)
- Version bump 0.5.1.
- Affichage de l’énoncé des questions pour les mini-jeux (fix prod).
- Seed aligné avec nouveau contenu (avatars, écoles, studios avec photos) et backlog optimisations documenté.
- Studio : champ photo (CRUD admin) et affichage sur la fiche studio.

## 2025-12-21 — Release v0.5.1 (mini-jeux + studios)
- Version bump 0.5.1.
- Affichage de l’énoncé des questions pour les mini-jeux (fix prod).
- Seed aligné avec nouveau contenu (avatars, écoles, studios avec photos) et backlog optimisations documenté.
- Studio : champ photo (CRUD admin) et affichage sur la fiche studio.

## 2025-12-21 — Release v0.5.0 (mini-jeux étendus)
- Version bump 0.5.0.
- Modèle `GameSession` + API d’enregistrement, seed de sessions démo.
- Mini-jeux : 6 modes (photo→nom, nom→type/level/grips, description→nom, blitz 5 questions), sélection par cartes, historique, leaderboards, sauvegarde durée front, résultats détaillés et bouton rejouer.
- Vue prof/admin élève : historique des 5 dernières sessions de mini-jeux.

## 2025-12-21 — Release v0.4.8 (squash + seed + Render FR)
- Version bump 0.4.8.
- Migrations squashées en une `init` pour repartir proprement (Render FR, DB vide).
- Seed : nouvelles images (postimg) pour positions/cours/avatars, pools noms/avatars uniques, seed via start-auto si base vide.
- Start-auto : migrate deploy → fallback push → seed si DB vide, vérif d’état avant start (Render inclus).
- Blueprint Render : région Frankfurt, build `db:migrate:deploy`, start `start:render`.

## 2025-12-21 — Hotfix v0.4.7 (mini-jeux accès admin/prof)
- Version bump 0.4.7.
- Mini-jeux : ouverts aux rôles prof/admin (accès direct), CTA “Jeux” ajouté au dashboard admin.
- Script baseline Prisma pour Render ajouté (`db:baseline:render`) afin de débloquer `migrate deploy` sur DB existante.

## 2025-12-20 — UI cours & médias (v0.4.6+)
- Cours : photos optionnelles (placeholder), listes prof/élève alignées (titre en haut, stats en bas, CTA “Voir le cours”), détails élève repositionnés comme la vue prof.
- Admin/Prof/Élève : avatars/placeholder affichés dans les listes (utilisateurs, élèves, professeurs), admin peut éditer les fiches prof comme le prof.
- Admin : filtres ajoutés sur Studios/Partenaires, panels corrigés (filtre ouvert par défaut, pagination/panels repositionnés).
- Modèle de données : `Course.photoUrl` + colonnes sièges/crédits, `User.age/avatarUrl/diplomas`, `TeacherFavoritePosition`. Migrations ajoutées et baselined localement (`20250130_add_course_seats_credits`, `20250201_add_student_age`, `20250202_profile_media_teacher_meta`, `20250203_add_course_photo`).
- Homepage : panels “Status build” et “Nouveautés” retirés pour alléger; filtres de l’app repliés par défaut avec persistance locale.

## 2025-12-20 — Release v0.4.6 (Profils enrichis)
- Ajout photo de profil (URL) et âge éditables pour tous, avec placeholders neutres (élève/prof).
- Professeurs : diplômes texte libre, positions préférées (multi-select) et affichage dans la fiche publique.
- Nouvelles pages : fiche prof `/app/teachers/[id]` (élèves/profs/admin de la même école) et liste des profs déjà eus `/app/student/teachers` (élève).
- Migrations ajoutées (`avatarUrl`, `diplomas`, `TeacherFavoritePosition`) + DB push local.

## 2025-12-20 — Passage produit & tag v0.4.4
- Tag `v0.4.4` figé comme baseline produit (Steps 0→9 livrées).
- Documentation alignée (README, backlog, instructions CODEX) pour appliquer les exigences produit (fiabilité, observabilité, sécurité, perf, billing/credits) sur toutes les prochaines Steps.

## 2025-12-19 — Step 0 (Bootstrap)
- Création du projet Next.js (App Router, Tailwind) avec homepage orientée modules + lien `/health`.
- Ajout Prisma + SQLite : schéma complet (users, school, positions, médias, progression, cours, blessures).
- Scripts DB robustifiés (`db:push`, `db:seed`) avec fallback chemin absolu SQLite.
- Seed idempotent : 1 école, 4 comptes (admin/teacher/2 students), 10 positions + médias placeholder, types de blessure, progression exemple.
- Tests Vitest : `getHealth` + route `/health`.

## 2025-12-19 — Step 1 (Auth + RBAC)
- NextAuth Credentials configuré (`/api/auth/[...nextauth]`) avec validation bcrypt + Prisma.
- Middleware RBAC protège `/app/*` (+ `/student|/teacher|/admin`), redirige login ou access denied.
- Pages protégées : `/app/student`, `/app/teacher`, `/app/admin` + routing rôle `/app`.
- Page `/login` avec presets seed, redirection selon rôle, bouton signout global.
- Types NextAuth étendus, helper RBAC (`lib/rbac.ts`), README mis à jour.

## 2025-12-19 — Step 2 (Positions browse + création prof)
- Liste `/positions` avec filtres type/niveau, cartes avec médias seed et détail `/positions/[id]`.
- Détail inclut infos, tips, contre-indications, gating élève (stub free/premium) et lien création.
- Prof/Admin : création via `/teacher/positions/new` (zod + server action + Prisma), listing rapide `/teacher/positions`.
- Home mise à jour pour marquer Step 2 livré.

## 2025-12-19 — Déploiement Render (PostgreSQL)
- Prisma basculé sur PostgreSQL (provider) et scripts DB simplifiés.
- `.env.example` mis à jour (Postgres + NextAuth). `.env` exemple local Postgres.
- Ajout `render.yaml` (web service Next + base Postgres, postdeploy db:push + db:seed).
- Pages positions forcées en dynamique pour éviter besoin DB au build local.

## 2025-12-19 — Dockerisation
- Ajout Dockerfile multi-stage (Next + Prisma) à la racine.
- Ajout docker-compose (web + Postgres) pour un run local : `docker-compose up --build`.
- `.dockerignore` pour alléger l’image.

## 2025-12-19 — Step 3 (Blessures)
- Élève : page `/app/student/injuries` (liste + création + édition/suppression, toggle actif/inactif).
- Prof : vues `/app/teacher/students` et `/app/teacher/students/[id]` pour consulter les blessures des élèves de l’école.
- Seed : blessure active ajoutée pour student1 (épaule).

## 2025-12-19 — Step 4 (Progression)
- Élève : `/app/student/progress` affiche progression par position (accès complet si premium, sinon positions vues).
- Prof : `/app/teacher/students/[id]` enrichi avec mise à jour progression (statut, niveau, commentaire) par position.

## 2025-12-19 — Step 5 (Cours)
- Formulaire création cours `/app/teacher/courses/new` (date/titre, élèves, positions, notes élève×position) avec mise à jour progression automatique.
- Liste des cours `/app/teacher/courses` (dernier 20) + historique élève `/app/student/courses`.

## 2025-12-19 — Step 6 (Mini-jeu)
- Route élève `/app/student/game` : quiz photo → nom (10 questions) sur les positions débloquées (ou toute la base si premium).
- Résumé score + correction détaillée en fin de partie; fallback message si <4 positions disponibles.
- Home mise à jour (modules + timeline) pour signaler Step 6 livrée.

## 2025-12-19 — Step 7 (Admin école)
- Dashboard admin `/app/admin` : stats école (utilisateurs par rôle, premium, cours, positions, blessures actives) + actions rapides.
- Gestion utilisateurs `/app/admin/users` : création prof/élève/admin (mot de passe, premium), mise à jour rôle/premium/nom, suppression (protégée si dépendances).
- Home/README mis à jour pour marquer l’étape livrée.

## 2025-12-19 — Step 8 (Navigation unifiée par rôle)
- Bandeau session/role/Accueil/Mon espace/logout harmonisé sur toutes les pages (élève, Professeur, Admin) avec badges session/rôle + CTA retour/connexion.
- Unification des écrans Positions : design Professeur appliqué à `/positions` (2 colonnes vignettes, bandeau visible, retour contextuel `from`), bouton “Éditer” réservé Professeur/Admin, création/édition via `/teacher/positions/new|[id]/edit`.
- Terminologie harmonisée (“Professeur”), marges panels normalisées, home mise à jour (steps, modules, nouveautés) pour refléter la nouvelle navigation par rôle.

## 2025-12-20 — Profil utilisateur & polish UI
- Ajout page profil `/app/profile` (consultation email/rôle/école/abonnement, édition du nom d’affichage) + server action `updateProfileAction`.
- Dashboards élève/prof : salutation personnalisée (prénom/nom/email fallback) avec bouton “Éditer” renvoyant vers le profil.
- Homepage modules : pastilles rôle/étape déplacées sous la description pour plus de lisibilité.

## 2025-12-21 — Maintenance & release v0.2.2
- Version bump `0.2.2` (README, homepage, package.json).

## 2025-12-21 — Pagination & release v0.2.0
- Version bump `0.2.0` (README, homepage, package.json).
- Pagination (10 items/page) généralisée : cours élève/prof, progression élève, blessures élève, liste élèves prof, liste cours prof (tri date desc).
- Navigation / positions : liste 2 colonnes partagée, bannière session/role/accueil partout, retour contextuel `from` préservé.
- Modules homepage : carte Profile ajoutée, “Status build” et “Modules” repliables par défaut, bandeau mis à jour.
- Changelogs/Routes/Backlog synchronisés (steps 0→8 livrées, Step 9 Discovery QA pilotée dans `01_BACKLOG_S001.md`).
- Suites à cadrer après Step 9 : journal d’audit, contre-indications, badges/UX.

## 2025-12-22 — Step 9 (Discovery QA — navigation & login)
- Bannière session/rôle + Accueil/Mon espace/Logout ajoutée aux vues positions hors layout (`/positions/[id]`, création/édition position prof) + icône maison sur le bandeau des espaces.
- Page création de position refactorisée en serveur + formulaire client pour appliquer le RBAC avant affichage et offrir un retour rapide vers la liste.
- Page login enrichie avec des CTA de création de compte (élève/prof/admin) et rappel freemium/premium en attendant l’onboarding complet.
- Inscription self-serve élève via `/signup` (email + mot de passe + école, premium optionnel). Prof/Admin restent créés côté école.

## Roadmap prochaine
- Step 9 — Discovery QA : plan détaillé dans `01_BACKLOG_S001.md` (navigation cohérente, pagination, profils/home).
- À cadrer ensuite : journal d’audit, contre-indications position/blessure, badges & polish UX.
