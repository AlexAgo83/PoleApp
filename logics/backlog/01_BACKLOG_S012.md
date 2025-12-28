# Backlog — Retours QA S013 (06_QA_S013.md)
[Compréhension: 100% / Avancement: 65% (P0 en cours de validation)]
> Quand une tâche est terminée la passer en **(DONE)**
> Pensez à mettre à jour les autres fichiers .md
> Pensez à mettre à jour la homepage
> (Idéalement) Style: chaque feature contient **user stories détaillées**, **critères d’acceptation** **DoD** **progression** et **priorité**.
> (Idéalement) Priorité: P0 (bloquant GA/qualité produit), P1 (prochaine itération produit), P2 (plus tard).
> (Idéalement) Prépares tes questions pour améliorer la compréhension
> (Idéalement) Prépares la session QA

## P0 — Migration avatars Cloudinary (restricted)
### User stories
- En tant qu’utilisateur (élève/prof/admin), je peux uploader ma propre photo de profil via Cloudinary (upload signé côté client, signature générée côté serveur) et la voir appliquée immédiatement dans l’app.
- En tant qu’utilisateur, je peux supprimer ma photo et revenir à une image par défaut (seed Cloudinary) sans laisser d’artefact orphelin.
- En tant qu’admin/QA, les images par défaut du seed utilisent les `public_id` fournis (≈15 hommes / 15 femmes), affectés de façon random sans doublons par sexe lors du seed.

### Critères d’acceptation
- Upload : signature générée par un endpoint serveur, upload client (widget/SDK) en mode “restricted” (URLs signées/timebound), taille max et ratio contrôlés (max 2 Mo, 1080x1080, jpg/png/webp, carré recommandé avec crop).
- Rôles : élèves/profs ne peuvent gérer QUE leur propre avatar ; admins peuvent tout modifier.
- Suppression : retire la référence DB et supprime le fichier Cloudinary sauf si l’image est marquée “seed par défaut”.
- Fallback : plus de références à l’ancien stockage statique ; un fallback Cloudinary “par défaut” reste disponible si l’utilisateur n’a rien uploadé.
- Seed : possibilité d’injecter les `public_id` fournis (par sexe, cf. 05_SEED_CONTENT), distribution random sans doublons ; dossier par environnement aligné sur la config vidéo si déjà en place.
- Parcours UI : bouton “Changer photo” (upload + preview + supprimer) proposé ; support mobile (upload fichier, option caméra si dispo navigateur).

### DoD
- Tests manuels : upload/remplacement/suppression pour élève, prof, admin ; vérif suppression Cloudinary (sauf images seed).
- Vérif env : variables Cloudinary présentes (.env déjà utilisé pour vidéo), dossier env cohérent si existant.
- Code : refs statiques supprimées, fallback Cloudinary par défaut ; contrôles de taille/format/crop appliqués.
- Seed : documenté dans `05_SEED_CONTENT.md` (liste public_id fournie), distribution random sans doublons par sexe.

### Questions restantes
- Reste : audit complet des vues pour l’affichage (default avatars) + QA upload/suppression.

### Progression
- [ ] En cours (impl Cloudinary restrict + seed random OK, reste audit affichage + QA)

### Tâches additionnelles (avatars affichage)
- Audit des vues/listes/cartes utilisant encore `avatarUrl` (élève/prof/admin) et passage à `resolveAvatarUrl`/`generateSignedUrl` avec fallback par défaut.
- Vérifier placeholders et delivery type `authenticated` pour les avatars (URL signées, pas de 404).

## P1 — Wording: “Positions coups de cœur” (DONE)
### User stories
- En tant qu’utilisateur, je vois partout “Positions coups de cœur” au lieu de “Positions préférées”.
### Critères d’acceptation
- Remplacement global (UI, labels, emails éventuels, favoris prof), si existants.
- Pas de régression sur la logique existante (favoris inchangés).
### DoD
- Recherche/replace contrôlé, revue UI rapide.
- Tests manuels sur modules positions/agenda/cours.
### Progression
- [x] DONE (libellés UI mis à jour)

## P1 — Historique élève : filtre “Mes cours” par défaut (DONE)
### User stories
- En tant qu’élève, en ouvrant l’historique, le filtre “Mes cours” est actif par défaut.
### Critères d’acceptation
- Le filtre est appliqué dès le premier rendu (sans clic), y compris sur l’agenda élève.
- Navigation / pagination conserve le filtre.
- Pas de mémorisation : chaque ouverture repart sur “Mes cours” par défaut.
### DoD
- Tests manuels sur desktop/mobile.
- Pas de régression sur autres filtres.
### Progression
- [x] DONE (par défaut activé, décochable, pas de persistance)

## P1 — Création de cours récurrents (bêta)
### User stories
- En tant que prof/admin, je peux créer un cours récurrent via une case “Récurrent” à côté de la date, choisir une fréquence (quotidienne / bi-hebdo / mensuelle), et pré-générer des occurrences virtuelles.
- En tant que prof, chaque occurrence apparaît sans élèves/positions et doit être éditée pour devenir “réelle” (au moins une position requise) ; les élèves ne peuvent pas s’inscrire tant qu’aucune position n’est définie.
### Critères d’acceptation
- UI de création : checkbox récurrence + sélection fréquence (quotidien / bi-hebdo / mensuel).
- Génération d’occurrences virtuelles (pas de positions/élèves) visibles dans les vues concernées (agenda prof/admin, agenda studio, liste cours).
- Inscription élève bloquée tant qu’aucune position n’est définie.
- Édition : pouvoir modifier une occurrence sans affecter celles déjà “fixées” ; occurrences virtuelles éditables individuellement pour devenir réelles.
- Collisions studio/horaires : ajout d’une restriction empêchant la création en cas de conflit.
- Fin de série : gérer une date de fin (prioritaire à court terme ; nb d’occurrences à planifier plus tard).
- Timezone : configurée côté super-admin (défaut Europe/Paris) ; affichage côté utilisateur dans sa timezone locale.
- Occurrences virtuelles côté élèves : affichage read-only avec indication visuelle “non validée”.
- Paramètre `from` à retirer des liens partagés.
### DoD
- Modèle/DB/logic récurrence définis et migrés (garder en tête la future gestion date de fin/nb occurrences/sauts).
- Tests manuels: création, visualisation, édition d’occurrence, blocage inscription sans position, détection collision studio/horaire.
- Documentation/FAQ minimale.
### Questions
- Gestion d’exceptions (sauter une date) — à planifier plus tard.
- Édition série : prévoir un mode “modifier cette occurrence uniquement” vs “modifier les futures” ?
### Progression
- [ ] En cours (modèle série + occurrences virtuelles générées, UI récurrence ajoutée ; reste édition occurrence, affichage spécifique, QA)

## P2 — Ajouter un cours à son agenda système (DONE)
### User stories
- En tant qu’utilisateur autorisé, depuis la page détail cours je peux l’ajouter à mon agenda système (iCal/Google/Outlook) via un lien ICS dynamique.
### Critères d’acceptation
- Bouton “Ajouter à mon agenda” sur la page détail (un seul pour tous les rôles).
- Génération d’un lien ICS dynamique incluant titre/date/durée/studio/discipline et localisation (adresse studio), avec lien de retour vers l’app ; timezone globale (super-admin) utilisée, l’agenda client convertit ; alerte par défaut (30 min avant).
- Paramètre `from` exclu du lien ICS partagé.
### DoD
- Tests manuels (ICS téléchargé + ouvert).
- Compatibilité desktop/mobile.
### Progression
- [x] DONE (route ICS + bouton, timezone globale + alarme 30min, lien role-aware)

### À clarifier (global)
- P1 récurrence : planifier plus tard la gestion d’exceptions (sauter une date) et l’édition série vs futures occurrences.

## P2 — Partage réseaux sociaux (détail cours) (DONE)
### User stories
- En tant que prof/admin, je peux partager un cours sur les réseaux sociaux depuis sa page détail.
### Critères d’acceptation
- Bouton de partage dédié (lien copiable + intent générique pour laisser choisir la plateforme), près du bouton retour, avec icône de partage.
- Lien de destination cohérent (page cours sous login ; si non connecté, redirection vers login) ; param `from` nettoyé.
### DoD
- Tests manuels: copie lien, ouverture intents.
- Vérifier absence de data sensible dans l’URL.
### Progression
- [x] DONE (bouton partage natif/copie, lien sans `from`)
