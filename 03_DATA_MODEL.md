# 03 — Modèle de données (MVP)

## Principes
- Provider Prisma : **PostgreSQL** (`DATABASE_URL` requis).
- Une **School** possède des Users (élèves/profs/admin).
- Une **Position** est globale (scopée école plus tard si besoin).
- Navigation par rôle : un seul écran Positions partagé, avec actions d’édition visibles uniquement pour Professeur/Admin.
- La progression = relation **Student ↔ Position**.
- Un **Course** relie prof + élèves + positions + notes.
- Seed : 2 écoles créées par défaut (École 1, École 2) avec comptes profs/élèves rattachés; les comptes fixes sont attachés à École 1. Chaque école reçoit 1 cours de démo (prof 1 + 3 élèves + 2 positions).

---

## Entités (MVP)

### User
- id (cuid)
- email (unique)
- name (affichage, optionnel)
- age (int optionnel, affiché sur fiche profil/élève)
- avatarUrl (photo optionnelle; placeholder appliqué sinon)
- diplomas (texte libre pour professeurs)
- passwordHash
- role: STUDENT | TEACHER | SCHOOL_ADMIN
- schoolId (nullable)
- isPremium (bool) — prototype (paiement plus tard)
- createdAt, updatedAt

### School
- id (cuid)
- name (unique)
- createdAt

### Position
- id (cuid)
- name (unique)
- description
- levelRequired (enum: BEGINNER | INTERMEDIATE | ADVANCED)
- type (enum: SPIN | TRICK | TRANSITION | WARMUP | STRENGTH)
- grips (string, libre)
- tips (text)
- contraindications (text) — MVP simple
- createdByUserId (prof/admin)
- createdAt, updatedAt

### PositionMedia
- id (cuid)
- positionId
- kind: PHOTO | VIDEO
- url
- createdAt

### InjuryType
- id (cuid)
- name (unique, ex: “Épaule”, “Poignet”, “Bas du dos”)
- createdAt

### StudentInjury
- id (cuid)
- studentId (User.id)
- injuryTypeId
- notes
- isActive
- createdAt, updatedAt

### StudentPositionProgress
- id (cuid)
- studentId
- positionId
- learningStatus: NOT_STARTED | IN_PROGRESS | PASSED | MASTERED
- masteryLevel: INITIATED | PASSED | FLUID | CHOREO
- comment (text)
- lastUpdatedByUserId (prof)
- createdAt, updatedAt

### Course
- id (cuid)
- schoolId
- teacherId
- studioId (optionnel)
- title (optional)
- date (datetime)
- durationMinutes (int, multiple de 15, défaut 60)
- maxSeats (int, défaut 30)
- costCredits (int, défaut 100)
- photoUrl (URL optionnelle, placeholder sinon)
- createdAt

### CourseAttendance
- id (cuid)
- courseId
- studentId

### CoursePosition
- id (cuid)
- courseId
- positionId

### CourseNote
- id (cuid)
- courseId
- studentId
- positionId
- masteryLevel (enum)
- comment
- createdAt

### TeacherFavoritePosition (nouveau)
- id (cuid)
- teacherId (User.id, role TEACHER)
- positionId (Position.id)
- unique(teacherId, positionId)

---

## Evolutions (V2+)
- PositionContraindication (relation Position ↔ InjuryType avec severity)
- CourseGeneratorRun (audit + transparence)
- Subscription + StripeCustomer
- AccessPolicy (ex: rules “unlock next level”)
