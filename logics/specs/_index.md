# Index des specs fonctionnelles
[Aligné v0.14.x | Compréhension: 100% | Confiance: 85% | Avancement: 10% | Portée: mapping domaines ↔ routes ↔ specs (réelles ou TODO)]

## Mapping domaines / routes / fichiers
- Public/Auth — routes : `/`, `/login`, `/signup`, `/health`, APIs auth/reset — spec : TODO (`logics/specs/auth.md`)
- Positions — routes : `/positions`, `/positions/[id]`, `/teacher/positions/new`, `/teacher/positions/[id]/edit` — spec : TODO (`logics/specs/positions.md`)
- Profil — routes : `/app/profile` — spec : TODO (`logics/specs/profile.md`)
- Élève — routes : `/app/student`, `/app/student/courses`, `/app/student/courses/[id]`, `/app/student/courses/agenda`, `/app/student/progress`, `/app/student/injuries`, `/app/student/game`, `/app/student/teachers`, `/app/student/school`, `/app/student/purchases`, `/app/student/partners` — spec : TODO (`logics/specs/student.md`)
- Professeur — routes : `/app/teacher`, `/app/teacher/students`, `/app/teacher/students/[id]`, `/app/teacher/courses*`, `/app/teacher/courses/agenda`, `/app/teacher/presets*`, `/app/teacher/billing`, `/app/teacher/school`, `/app/teacher/partners`, `/app/teacher/purchases` — spec : TODO (`logics/specs/teacher.md`)
- Admin école — routes : `/app/admin`, `/app/admin/users`, `/app/admin/teachers`, `/app/admin/studios`, `/app/admin/partners`, `/app/admin/school`, `/app/admin/courses/[id]`, `/app/admin/billing`, `/app/admin/partners` — spec : TODO (`logics/specs/admin.md`)
- Super-admin — routes : `/super-admin`, `/super-admin/media-audit`, `/logics` — spec : TODO (`logics/specs/super-admin.md`)
- Notifications — routes/API : `/api/notifications`, `/api/notifications/read`, `/api/notifications/delete` — spec : TODO (`logics/specs/notifications.md`)
- Billing/Facturation — routes/API : `/app/admin/billing`, `/app/teacher/billing`, `/api/admin/billing/*`, `/api/teacher/invoices/*`, `/api/teacher/purchases/export` — spec : TODO (`logics/specs/billing.md`)
- Agendas (général) — routes/API : `/api/admin/week-courses`, `/api/teacher/week-courses`, `/api/teacher/month-courses`, `/api/student/week-courses`, `/api/student/month-courses` — spec : TODO (`logics/specs/agendas.md`)
- Uploads/Cloudinary — routes/API : `/api/uploads`, `/api/uploads/signature`, `/api/uploads/signed-url` — spec : TODO (`logics/specs/uploads.md`)
- Partenaires — routes : `/app/student/partners`, `/app/admin/partners`, `/api/partners/redirect` — spec : TODO (`logics/specs/partners.md`)
- ICS — route : `/api/courses/[id]/ics` — spec : TODO (`logics/specs/ics.md`)
- Agenda professeur (fiche élève) — route : `/teachers/[id]` (non listée dans routes), `/student/week-courses` — spec : TODO (`logics/specs/2026-01-05_agenda-prof.md`)

## Questions pour booster la compréhension
- Faut-il scinder les specs par rôle ou par feature (ex. progression, facturation) au-delà des routes ?
- Y a-t-il d’autres écrans publics non listés dans `04_ROUTES_AND_SCREENS.md` à intégrer ?

## Questions pour booster la confiance
- Le mapping routes ↔ specs est-il complet et reflète-t-il la codebase actuelle ?
- Prioriser quels domaines en premier pour rédiger les specs manquantes ?
