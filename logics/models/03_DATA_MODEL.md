# 03 — Modèle de données (v0.12.x)
> Aligné sur le schéma Prisma actuel (PostgreSQL). Dernières migrations notables : `photoPublicId` pour Course/Studio/School, Cloudinary avatars, Invoice/CourseRecommendation/PartnerEvent, muscles/disciplines.

## Principes
- Provider Prisma : **PostgreSQL** (`DATABASE_URL` requis).
- Rôles (enum `Role`) : STUDENT | TEACHER | SCHOOL_ADMIN | SUPER_ADMIN (backoffice global).
- Périmètre école : Users, Studios, Cours, Partenaires rattachés à une School.
- Progression = relation Student ↔ Position (`StudentPositionProgress`).
- Générateur : suggestions pondérées par cœurs élèves (`StudentFavoritePosition`) et stockables via `CourseRecommendation` (optionnel).
- Billing : table `Invoice` liée 1–1 à `Course`.

## Entités clés

### User
- id (cuid), email (unique), passwordHash, role (Role)
- name, age, avatarUrl, avatarPublicId, diplomas (prof), credits, isPremium, schoolId?
- Relations : injuries, progress, courseNotes, attendances, coursesTaught, favoritePositions (teacher), studentFavoritePositions (élève), gameSessions

### School
- id, name, website?, photoPublicId?, archivedAt?, createdAt
- Relations : users, courses, studios, partners, disciplines, gameSessions

### Position
- id, name (unique), description, levelRequired (PositionLevel), type (PositionType), discipline (string, défaut `Danse`), grips?, tips?, contraindications?
- createdByUserId?, createdAt/updatedAt
- Relations : media, progress, courseEntries, courseNotes, favoriteByTeachers, recommendations, muscles (via PositionTarget)

### Muscle / PositionTarget
- Muscle : id, name (unique), kind (string : MUSCLE | ARTICULATION | OTHER), createdAt
- PositionTarget (pivot) : positionId + muscleId (composite PK), createdAt

### PositionMedia
- id, positionId (FK Position), kind (MediaKind), url?, publicId?, createdAt

### Injuries
- InjuryType : id, name (unique)
- StudentInjury : studentId, injuryTypeId, isActive, createdAt/updatedAt

### Progression
- StudentPositionProgress : studentId, positionId, learningStatus (LearningStatus), masteryLevel (MasteryLevel?), comment?, lastUpdatedByUserId?, createdAt/updatedAt

### Course et dérivés
- Course : id, schoolId, teacherId, studioId?, title?, discipline (string, défaut `Danse`), photoPublicId?, date, durationMinutes, maxSeats, costCredits, createdAt
- CourseAttendance : courseId, studentId, status (AttendanceStatus: CONFIRMED | WAITLIST), waitlistRank?, createdAt
- CoursePosition : courseId, positionId
- CourseNote : courseId, studentId, positionId, masteryLevel, comment?, createdAt
- CourseRecommendation (optionnel) : courseId, positionId, tag (SuggestionTag), reason?, appliedAt?, createdAt

### Billing & offres
- Invoice : id, courseId (unique FK Course), amountCents, currency (EUR), status (InvoiceStatus: GENERATED | SENT | PAID | LATE | CANCELLED), issuedAt, paidAt?, note?, createdAt/updatedAt
- SubscriptionOffer (global) : nom, prix mensuel/annuel TTC, crédits mensuels (1000 par défaut), TVA %, actif/ouvert, ordre, defaultTerm (libre).
- CreditPackOffer (global) : nom, crédits, prix TTC, TVA %, actif/ouvert, ordre.
- GlobalSetting : TVA par défaut (20%), devise (EUR), timestamps.
- Purchase : userId, offerId, offerName, kind (PACK | SUBSCRIPTION), amountCents, vatPercent, currency, creditsGranted, isPremiumGranted, status (default "PAID"), createdAt.

### Studios / Partenaires
- Studio : id, name, address?, photoPublicId?, schoolId, createdAt/updatedAt
- Partner : id, name, kind (default SERVICE), website?, description?, schoolId, createdAt/updatedAt
- SponsoredLink : id, category, label?, url, partnerId
- PartnerEvent : partnerId, userId?, courseId?, studioId?, type (PartnerEventType: CLICK | PURCHASE), createdAt

### Favoris & jeux
- TeacherFavoritePosition : teacherId, positionId
- StudentFavoritePosition : studentId, positionId (source “cœurs” élèves)
- GameSession : userId, schoolId?, mode (GameMode), totalQuestions, correctAnswers, durationMs?, createdAt

## Enums principaux
- Role, PositionLevel, PositionType, MediaKind, LearningStatus, MasteryLevel, AttendanceStatus, SuggestionTag, InvoiceStatus, PartnerEventType, GameMode.

## Seed (dev)
- Comptes fixes : super-admin global + admin/teacher/student1/student2 (`DATABASE_SEED_PWD`), École 1.
- Généré : 2 écoles (photos Cloudinary `sc_*` + URL google), profs/élèves supplémentaires, studios avec photos Cloudinary `st_*`, 30 positions, ~20 cours/école (durées 15 min) avec photos Cloudinary `co_*` répartis entre profs (anti-collisions), progression/blessures, favoris prof/élève, invoices/packs/offres EUR/TVA20, partenaire Amazon (liens produits), élèves à 500 crédits.
- Disciplines seedées par école (Pole / Pole Exotic / Souplesse / Pilates / Conditioning) appliquées aux positions et cours. Muscles/articulations seedés et associés aux positions selon leur type. Positions attribuées à des professeurs seedés (Elza priorisée) + favoris prof générés + vidéos Cloudinary authenticated (pool fixe).
