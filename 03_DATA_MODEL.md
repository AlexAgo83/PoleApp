# 03 — Modèle de données (MVP)

## Principes
- Une **School** possède des Users (élèves/profs/admin).
- Une **Position** est globale (ou scoped école plus tard).
- La progression = relation **Student ↔ Position**.
- Un **Course** relie prof + élèves + positions + notes.

---

## Entités (MVP)

### User
- id (uuid)
- email (unique)
- passwordHash
- role: STUDENT | TEACHER | SCHOOL_ADMIN
- schoolId
- isPremium (bool) — prototype (paiement plus tard)
- createdAt, updatedAt

### School
- id
- name
- createdAt

### Position
- id
- name
- description
- levelRequired (enum/string)
- type (enum/string)
- grips (string[] ou relation)
- tips (text)
- contraindications (text) — MVP simple
- createdByUserId (prof/admin)
- createdAt, updatedAt

### PositionMedia
- id
- positionId
- kind: PHOTO | VIDEO
- url
- createdAt

### InjuryType
- id
- name (ex: “Épaule”, “Poignet”, “Bas du dos”)
- createdAt

### StudentInjury
- id
- studentId (User.id)
- injuryTypeId
- notes
- isActive
- createdAt, updatedAt

### StudentPositionProgress
- id
- studentId
- positionId
- learningStatus: NOT_STARTED | IN_PROGRESS | PASSED | MASTERED
- masteryLevel: INITIATED | PASSED | FLUID | CHOREO
- comment (text)
- lastUpdatedByUserId (prof)
- updatedAt

### Course
- id
- schoolId
- teacherId
- title (optional)
- date (datetime)
- createdAt

### CourseAttendance
- id
- courseId
- studentId

### CoursePosition
- id
- courseId
- positionId

### CourseNote
- id
- courseId
- studentId
- positionId
- masteryLevel (enum)
- comment
- createdAt

---

## Evolutions (V2+)
- PositionContraindication (relation Position ↔ InjuryType avec severity)
- CourseGeneratorRun (audit + transparence)
- Subscription + StripeCustomer
- AccessPolicy (ex: rules “unlock next level”)
