# Pole App

Next.js web app (App Router) to manage positions, students, courses, progression, combos/presets, and mini-games, with role-based navigation and pagination.


[![Repository](https://img.shields.io/badge/GitHub-AlexAgo83%2FPoleApp-181717?logo=github&logoColor=white)](https://github.com/AlexAgo83/PoleApp)
[![Live Demo](https://img.shields.io/badge/live%20demo-Render-46E3B7?logo=render&logoColor=white)](https://poleapp.onrender.com)
![Version](https://img.shields.io/badge/version-v0.15.3-4C8BF5)
![Next.js](https://img.shields.io/badge/Next.js-16.1.0-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=black)

## Product Phase - Cross-Cutting Requirements
- Stronger testing (unit + integration/contract where relevant), backward-compatible migrations with backfills and data guardrails. Idempotent seed.
- Observability: structured logging, actionable metrics/health checks, alerts for errors/latency, traces on sensitive actions.
- Reliability/performance: budgets (TTFB/CLS/LCP on web), default pagination of 10 items, indexed Prisma queries, feature flags/dark launch.
- Security/PII: secrets out of code, RBAC already in place, audit trail to add for sensitive actions, server-side zod validation.
- Media: integrate Cloudinary when uploads are enabled (avatars, course/position images), with server-side signatures and URL/public_id storage.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4
- Prisma + PostgreSQL
- NextAuth (Credentials) + RBAC middleware
- Docker (multi-stage) + docker-compose
- Render: `render.yaml` (web + Postgres)

## Local Setup
```bash
npm install
cp .env.example .env        # fill DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npm run db:push
npm run db:seed
npm run dev                 # or NEXT_USE_TURBOPACK=0 npm run dev if panics
```

### Dedicated Schema (Shared DB)
- Use one schema per app: `DATABASE_URL=postgresql://.../poleapp?schema=poleapp` (already in `.env.example`). `npm run db:push` creates the schema if it does not exist.
- Full schema-only reset: `npm run db:reset:schema` (drop + recreate + db:push + seed). Protected in prod, or on `schema=public` unless `SCHEMA_RESET_FORCE=1`.
- On Render, the provided `connectionString` does not include a schema: override it with `?schema=poleapp` to avoid impacting other apps sharing the same DB.

### Docker
- Recommended for hot reload: `docker compose watch` (if locked, run `docker compose down` and restart).
- Full rebuild: `docker-compose up --build`.

## Auth & Roles
- Login: `/login` (seed presets).
- Roles: `STUDENT`, `TEACHER`, `SCHOOL_ADMIN`, `SUPER_ADMIN` (global back office `/super-admin`).
- RBAC: middleware protects `/app/...`; role-based redirects after login; logout returns to home.
- Student self-serve signup: `/signup` (email + password + school, optional premium). Teacher/Admin users are still created by the school.

## Navigation / Profile (Step 8)
- Session/role header with `Accueil`, `Mon espace`, `Se deconnecter` on all pages.
- Greeting `Bonjour <first name|last name|email>` + `Edit` button -> `/app/profile`.
- Profile page `/app/profile`: view email/role/school, edit first name/last name/age/photo (placeholder if empty), optional contacts (WhatsApp phone, Instagram username) with external buttons.
- Teacher: editable diplomas + favorite positions (multi-select), shown on the public profile; contacts displayed as WhatsApp/Instagram buttons when set.
- Public teacher profile `/app/teachers/[id]` (photo/diplomas/favorite positions, contacts when present), accessible to students who attended a course with that teacher (`/app/student/teachers`).
- Streamlined homepage `Modules` (status/news panels removed) and includes the Profile card.
- Filter panels: collapsed by default with locally persisted state (localStorage).

## School (Student)
- Enhanced school page `/app/student/school`: studios/partners and school schedule (week/month views, studio/teacher/date/search/`my courses` filters, color-code legend, upcoming courses), header with school background photo.
- Quick links to student list/schedule and month/week navigation with no horizontal scroll on mobile.

## Positions
- `/positions`: 2-column list (student/teacher/admin) + header + contextual back `from`, `Created by ...` badge. `Unlocked by purchase` badge when a position comes from a purchased preset or a course the student is enrolled in.
- Shareable detail `/positions/[id]`; `Edit` button for Teacher/Admin (blocked for non-owner teacher, legacy positions remain editable). Subtle purchase badge in info panel.
- Discipline highlighted (badge on cards and next to title), glassy stats (type/level/grips/creator) with `Seen`/progress overlay on the image.
- Premium content: non-premium students can access positions unlocked by preset purchase (Purchase PRESET PAID) or CONFIRMED course enrollment, and positions already started in progression; placeholders/lock remain otherwise.
- CRUD: `/teacher/positions/new` and `/teacher/positions/[id]/edit` (Teacher/Admin).
- Media: placeholder image when absent, 2-column thumbnails in the list.

## Media / Avatars
- Cloudinary enabled (authenticated images + videos) with server signatures. Images served in `f_auto`/`q_60-65` + fixed sizes on cards and headers.
- Avatars: controlled upload (max 4 MB, 2160x2160, jpg/png/webp), deletion cleans Cloudinary except seed images; fallback via seeded `avatarPublicId` (15M/15F) without duplicates.
- Course/studio/school/preset photos: store `photoPublicId` (or `imagePublicId`/`videoPublicId` for presets), display through transformed Cloudinary URLs (headers in `c_fill,w=1200,h=600,q=60`), placeholders when absent.
- Positions: authenticated Cloudinary videos, playback via signed URLs.
- Super admin: Cloudinary vs database media audit (`/super-admin/media-audit`) with resource/type filters, orphan/broken diff, CSV export.

## Injuries & Progress
- Student: `/app/student/injuries` (CRUD, pagination 10); `/app/student/progress` (pagination 10).
- Teacher/Admin: injuries and progress visible/editable on `/app/teacher/students/[id]`; back to list; contact buttons (WhatsApp/Instagram) when the student provided data.

## Courses / Billing
- Teacher/Admin: `/app/teacher/courses` (descending sort, pagination 10), create `/new` (daily/bi-weekly/monthly recurrence in beta with virtual occurrences), detail, edit, optional Cloudinary photos (placeholder if absent), and `View course` button. Monthly agenda + week view (teacher/admin) with persisted filters + active chips (discipline/teacher/studio/dates/notes/search).
- Admin billing: `/app/admin/billing` (invoice per course, date/teacher/studio/status filters, CSV export, status/amount/note actions, missing invoices backfill, styled filter panel with footer counter).
- Teacher billing: `/app/teacher/billing` (read-only invoices for their courses, date/studio/status/search filters, CSV export, per-invoice HTML print link).
- Student purchases: packs/subscriptions/presets visible to admin/teacher, credits refunded on cancellation.
- Student: `/app/student/courses` history (pagination 10) + detail, same layouts/photos/CTA; dedicated week/month agenda (`/app/student/courses/agenda`) aligned mobile/desktop. Enrollment blocked when required positions are missing (virtual occurrences).
- Course detail (teacher/student): transformed Cloudinary header background, `Scheduled occurrence` badge for virtual ones, aligned buttons (back/share/agenda), dynamic ICS (global timezone + 30 min alarm). Cancellation automatically refunds students (credits restored) and cleans linked invoices.
- Notifications: bell menu (delete, delete all, counter, scroll), dedupe by user/kind/course, fetch limit 50; seed capped at 30/user. Student/teacher/admin notifications for enrollments/updates/cancellations/notes/invoices.

## Mini-Game
- `/app/student/game`: photo -> name quiz on unlocked positions (or all positions for premium). Requires at least 4 unlocked positions (premium or preset/course purchase) to start a mode.

## School Admin
- `/app/admin`: school stats, quick actions, school week view for courses.
- `/app/admin/users`: users CRUD (role, premium, password), harmonized role/premium chips, pagination.
- `/app/admin/studios` and `/app/admin/partners`: persisted filters, redesigned cells, pagination.
- `/app/admin/teachers`: teacher list with persisted filters.

## Pagination (v0.2.2)
- Dynamic lists paginated by 10: student/teacher courses, student progress, student injuries, teacher/admin student list.

## Health & Diagnostics
- `/health` (200 OK), Prisma DB logs.
- In case of Turbopack panics: delete `.next/.turbo` and/or use `NEXT_USE_TURBOPACK=0`.

## Seeds (dev)
- Accounts: `admin@poleapp.test`, `teacher@poleapp.test`, `student1@poleapp.test`, `student2@poleapp.test` (password `DATABASE_SEED_PWD`).
- Generated: 2 schools (Cloudinary photos `sc_*` + URL http://www.google.com), 5 teachers + 10 students/school, 500 credits per student, 30 positions + authenticated Cloudinary videos, 40 courses (15-minute step durations) with Cloudinary photos `co_*` and invoice backfill, injury types, Amazon partners (4 product links).
- Disciplines: Pole/Pole Exotic/Flexibility/Pilates/Conditioning catalog seeded per school; positions and courses tagged dynamically.
- Seeded muscles/joints linked by position type; positions assigned to seeded teachers (Elza prioritized), automatic teacher favorites, courses distributed across teachers with anti-collision scheduling.
- Unlock demo: one paid preset purchase (Purchase PRESET) and one `Beginner Spin Course (demo)` with CONFIRMED attendance to illustrate position access via purchase/enrollment.
- Extras: weekly recurring series (including alternate disciplines, short series), `edge` courses (early/late, virtual, free/waitlist quotas), backup courses per studio, varied notes and attendances (waiting/enrolled) to test enrollment blocking without positions; seeded presets (Cloudinary images/videos).

## Internal Docs
- Functional specs: `logics/specs/` (viewable via `/logics` on super-admin side).
- Backlog/QA/QE/DRY: `logics/backlog/`, `logics/discovery/`, `logics/foundry/`.
- Models/routes: `logics/models/03_DATA_MODEL.md`, `logics/models/04_ROUTES_AND_SCREENS.md`.

## Render Deployment
- Build: `npm install && npm run db:migrate:deploy && npm run build` (migrations squashed into init, no baseline needed on a fresh DB).
- Start: `npm run start:render` (start-auto: migrate deploy -> seed super-admin if missing -> start). `db push` fallback is **disabled** unless `ALLOW_DB_PUSH_FALLBACK=true` (to avoid migration drift in prod).
- Variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NODE_VERSION=20`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (required in prod), `SUPER_ADMIN_NAME` (optional). Render prod placeholders in `.env.example` (`PROD_RENDER_DATABASE_URL`, `PROD_RENDER_PSQL_COMMAND`) are ops-only.
- Prisma: config in `prisma.config.js` (seed `tsx prisma/seed.ts`, but destructive seed requires `SEED_ALLOW_PROD=true` or non-prod `NODE_ENV`).
- Build cache: to avoid the `No build cache found` warning, enable Render build cache (Persistent build cache) or keep `.next/cache` between builds. If `middleware` warning appears: migrate to `proxy` eventually.

## Quick Wins (perf/UX)
1. Move list images (courses/users/teachers) to `next/image` with `loading="lazy"`, explicit sizes, and placeholders to reduce CLS and transfer size.
2. Add Prisma indexes on filtered columns: `user(role, isPremium)`, `user(email, name)`, `course(schoolId, date, teacherId, studioId)` to speed up lists/agenda.
3. Limit Prisma `select` to fields actually rendered in lists (users/courses/studios) to reduce payload and speed up rendering.

## Changelog
- v0.14.0: Super-admin Cloudinary vs database media audit (filters, orphan/broken diff, CSV export), logics UI: visual rendering for Markdown tasks, version bump.
- v0.8.2: Fuchsia accent palette (global remap from cyan), harmonized super-admin panels (New subscription offer, New credit pack, Create school) on dark glassy theme, slightly toned-down global background for better readability.
- v0.4.6: User-persisted filter panel, collapsible admin creation panels, UI harmonization for studios/partners/users, versioning bump and Cloudinary prep.
- v0.4.5: Enriched profiles (photo, age, diplomas, teacher favorite positions) + public teacher profiles accessible to students. Courses with optional photos, aligned student/teacher lists/details, studio/partner/admin filters, avatars in lists (students/teachers/users).
- v0.4.4: Steps 0->9 delivered (Discovery QA completed), moved to product phase and froze tag `v0.4.4` as baseline.
- v0.2.2: admin/position/student filters, harmonized filters UI, 10-item pagination, profile page and role-based navigation. See `CHANGELOG.md`.
