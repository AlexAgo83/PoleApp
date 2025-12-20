# 01 — Backlog Produit (MVP → V2)

> Style: chaque feature contient **user stories**, **critères d’acceptation** et **priorité**.
> Priorité: P0 (MVP), P1 (post-MVP), P2 (plus tard).
> Implémentation actuelle : Next.js App Router + Prisma/PostgreSQL, routes protégées sous `/app/...` (positions listées pour tous sur `/positions`, création/édition prof/admin sous `/teacher/positions/...`), NextAuth Credentials, Docker compose (target `dev` + `docker compose watch`), déploiement Render via `render.yaml`.
> Statut : Steps 0→9 livrées/en cours (auth/RBAC, positions, blessures, progression, cours, mini-jeu, admin école, navigation unifiée par rôle + espaces dédiés + profil + pagination, Discovery QA). Home affiche les modules, la santé (`/health`) et le bandeau session/rôle.

---

## EPIC A — Fondation produit & sécurité

### A1 — Authentification + rôles (P0)
**User stories**
- En tant qu’utilisateur, je peux créer un compte et me connecter.
- En tant qu’école, je peux inviter un professeur.
- En tant que professeur, je peux accéder aux élèves de mon école.
- En tant qu’élève, je ne vois que mes données.

**Critères d’acceptation**
- Login/Logout + reset password.
- Rôles: `STUDENT`, `TEACHER`, `SCHOOL_ADMIN`.
- Permissions: un prof ne voit que les élèves associés à son école.
- Un school admin peut créer/associer des profs et élèves.

---

### Step 9 — Discovery QA (P1) — livré v0.4.2
Voir le plan détaillé: `01_BACKLOG_STEP_009.md`. Statut: terminé (durée cours + crédits, gating premium, agendas semaine, studios/maps, cohérence params/searchParams).

---

### A2 — Journal d’audit minimal (P1)
**User stories**
- En tant qu’école, je veux savoir qui a modifié une fiche élève/cours.

**Critères d’acceptation**
- Log “qui / quoi / quand” sur: création/édition cours, progression, blessures.
- Implémentation MVP (Prisma model AuditLog + hooks sur actions sensibles).

---

## EPIC B — Base de données des positions

### B1 — CRUD Positions (P0)
**User stories**
- En tant que prof, je peux créer/éditer une position.
- En tant qu’élève (gratuit), je peux consulter les positions “liées aux cours vus”.
- En tant qu’élève (premium), je peux consulter toutes les positions.

**Critères d’acceptation**
- Une position a: nom, description, niveau requis, type, grips, tips, contre-indications, médias.
- Liste + recherche + filtres (type, niveau).
- Détail position avec médias (placeholder possible pour MVP).

---

### B2 — Taxonomies (P0)
- Types: `SPIN`, `TRICK`, `TRANSITION`, `WARMUP`, `STRENGTH`
- Grips: `CUP`, `TWIST`, `TRUE`, `FOREARM`, `ELBOW`, `OTHER` (ajustable)
- Niveaux requis: `BEGINNER`, `INTERMEDIATE`, `ADVANCED` (ou échelle studio)

**Critères d’acceptation**
- Taxos stockées en DB (ou config), modifiables par admin.

---

### B3 — Contre-indications structurées (P1)
**User stories**
- En tant que prof, je veux signaler qu’une position est incompatible avec une blessure donnée.

**Critères d’acceptation**
- Mapping Position ↔ InjuryType avec niveau de risque (info/warn/block).

---

## EPIC C — Suivi élève & blessures

### C1 — Profil élève + blessures (P0)
**User stories**
- En tant qu’élève, je peux déclarer une blessure (type + notes).
- En tant que prof, je vois les blessures de l’élève.

**Critères d’acceptation**
- CRUD blessures (actives/inactives).
- Affichage clair côté prof et élève.
- Les blessures actives influencent les suggestions (P1+) mais au minimum sont visibles (P0).

---

### C2 — Progression par position (P0)
**Définitions**
- Statut d’apprentissage: `NOT_STARTED`, `IN_PROGRESS`, `PASSED`, `MASTERED`
- Niveau de maîtrise: `INITIATED`, `PASSED`, `FLUID`, `CHOREO`

**User stories**
- En tant que prof, je peux mettre à jour le niveau atteint par un élève sur une position.
- En tant qu’élève, je vois mon état par position.

**Critères d’acceptation**
- Pour une paire (élève, position): statut + niveau + commentaire + date.
- Historique minimal (dernière valeur + timestamp). (Historisation fine = P1)

---

## EPIC D — Fiches cours

### D1 — Création de cours (P0)
**User stories**
- En tant que prof, je crée une fiche cours avec date, élèves présents, positions enseignées.
- En tant que prof, je note pour chaque élève et position: niveau atteint + commentaire.

**Critères d’acceptation**
- Formulaire: date, groupe/nom du cours (option), élèves (multi-select), positions (multi-select).
- Saisie par élève x position (UI simple, ex: tableau).
- À la validation: mise à jour automatique de la progression des élèves.

---

### D2 — Historique cours (P0)
**User stories**
- En tant qu’élève, je vois l’historique de mes cours.
- En tant que prof, je vois mes cours passés.

**Critères d’acceptation**
- Liste des cours + accès détail.
- Filtre par date / élève (prof).

---

## EPIC E — Jeu & révision (gamifié)

### E1 — Mini-jeu “Photo → Nom” (P0)
**User stories**
- En tant qu’élève, je révise les positions vues via un quiz photo→nom.
- En tant que prof, je peux jouer sur toute la base (mode training).

**Critères d’acceptation**
- Pool élève: positions liées à ses cours (et/ou positions “débloquées”).
- Pool prof: toutes les positions.
- Session: 10 questions (config), score final, correction.
- En MVP: images placeholder si nécessaire.

---

### E2 — Badges simples (P1)
- Badge “Série de 5 bonnes réponses”
- Badge “10 sessions jouées”
- Badge “100% sur une session”

---

### E3 — Modes avancés (P2)
- Mode difficile aléatoire multi-exercices
- Mode par exercice
- Exos 2..6 du brief

---

## EPIC F — Monétisation (light MVP)

### F1 — Flags d’accès (gratuit/premium) (P0)
**User stories**
- En tant qu’élève gratuit, je suis limité aux positions vues.
- En tant qu’élève premium, j’ai accès à toute la base + stats.

**Critères d’acceptation**
- Champ `isPremium` sur user (prototype).
- Paywall simple sur routes premium (pas de paiement intégré en MVP).

---

### F2 — Paiement (P2)
- Stripe subscriptions (élève + prof + école)

---

## EPIC G — Admin école (pilot)

### G1 — Gestion école (P0)
**User stories**
- En tant qu’admin école, je crée des profs/élèves et les rattache.
- En tant qu’admin école, je vois une vue globale (counts: élèves, cours, positions vues).

**Critères d’acceptation**
- CRUD users au sein de l’école (invites ou création directe).
- Dashboard simple.

---

## EPIC H — Génération automatique de cours (V2)

### H1 — Générateur V1 (P1)
**Règles**
- 1 transition entre trick et spin
- Jamais 2 transitions consécutives
- Minimum: 1 “passée”, 1 “pas encore faite”, 2 “initié”, 1 “fluidité ou choré”
- Exclusions: blessures actives + hors niveau

**Livrables**
- Bouton “Générer un cours” (prof).
- Sortie: liste de positions + logique expliquée (transparence).
