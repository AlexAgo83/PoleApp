# 03 — Modèle de données (v0.7.x)
> Aligné sur le schéma Prisma actuel (PostgreSQL). Dernières migrations : `Invoice`, `CourseRecommendation`, `PartnerEvent`, `StudentFavoritePosition`.

## Principes
- Provider Prisma : **PostgreSQL** (`DATABASE_URL` requis).
- Rôles (enum `Role`) : STUDENT | TEACHER | SCHOOL_ADMIN.
- Périmètre école : Users, Studios, Cours, Partenaires rattachés à une School.
- Progression = relation Student ↔ Position (`StudentPositionProgress`).
- Générateur : suggestions pondérées par cœurs élèves (`StudentFavoritePosition`) et stockables via `CourseRecommendation` (optionnel).
- Billing : table `Invoice` liée 1–1 à `Course`.

## Entités clés

### User
- id (cuid), email (unique), passwordHash, role (Role)
- name, age, avatarUrl, diplomas (prof), credits, isPremium, schoolId?
- Relations : injuries, progress, courseNotes, attendances, coursesTaught, favoritePositions (teacher), studentFavoritePositions (élève), gameSessions

### School
- id, name, website?, createdAt
- Relations : users, courses, studios, partners

### Position
- id, name (unique), description, levelRequired (PositionLevel), type (PositionType), grips?, tips?, contraindications?
- createdByUserId?, createdAt/updatedAt
- Relations : media, progress, courseEntries, courseNotes, favoriteByTeachers, recommendations

### PositionMedia
- id, positionId (FK Position), kind (MediaKind), url, createdAt

### Injuries
- InjuryType : id, name (unique)
- StudentInjury : studentId, injuryTypeId, isActive, createdAt/updatedAt

### Progression
- StudentPositionProgress : studentId, positionId, learningStatus (LearningStatus), masteryLevel (MasteryLevel?), comment?, lastUpdatedByUserId?, createdAt/updatedAt

### Course et dérivés
- Course : id, schoolId, teacherId, studioId?, title?, photoUrl?, date, durationMinutes, maxSeats, costCredits, createdAt
- CourseAttendance : courseId, studentId, status (AttendanceStatus: CONFIRMED | WAITLIST), waitlistRank?, createdAt
- CoursePosition : courseId, positionId
- CourseNote : courseId, studentId, positionId, masteryLevel, comment?, createdAt
- CourseRecommendation (optionnel) : courseId, positionId, tag (SuggestionTag), reason?, appliedAt?, createdAt

### Billing
- Invoice : id, courseId (unique FK Course), amountCents, currency (EUR), status (InvoiceStatus: GENERATED | SENT | PAID | LATE | CANCELLED), issuedAt, paidAt?, note?, createdAt/updatedAt

### Studios / Partenaires
- Studio : id, name, address?, photoUrl?, schoolId, createdAt/updatedAt
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
- Comptes fixes : admin/teacher/student1/student2 (`change-me-password`), École 1.
- Généré : 2 écoles, profs/élèves supplémentaires, studios avec photos, 1 cours de démo/école, progression/blessures, favoris et crédits pour tester agendas/générateur/billing.
