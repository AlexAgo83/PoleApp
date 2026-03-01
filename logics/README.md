# Pole App - Markdown Pack (Backlog + Codex Instructions) - v0.15.0
> Must stay in sync with the project (backlogs, changelog, models, routes).

## Main Content
- `specs/`: functional specs by domain (viewable via `/logics` on the super-admin side)
- `backlog/`: backlogs by step/feature (SXXX, Cloudinary, Mapbox...)
- `discovery/`: QA & QE (documented S016/S010 feedback)
- `models/03_DATA_MODEL.md`: up-to-date data model (Prisma/Postgres)
- `models/04_ROUTES_AND_SCREENS.md`: current screens & routes
- `models/05_SEED_CONTENT.md`: seed reminder (fixed accounts, schools, courses)
- `instructions/`: Codex/Render instructions (02_CODEX_INSTRUCTIONS.md, 02_RENDER_INSTRUCTIONS.md)
- `knowledge/`: business/tech notes (to be completed when new references appear)
- `foundry/`: DRY plans (e.g., billing) and other supporting docs
- `CHANGELOG.md`: version log
- `README.md`: this file

## Product Phase (v0.14.x)
- Reliability/ops: Prisma migrations deployed (`db push` fallback disabled in prod), idempotent seed, default pagination set to 10 items.
- Observability: `/health`, Prisma logs; audit trail still to be extended on sensitive actions.
- Security/PII: RBAC middleware, server-side zod validation, secrets out of code, Cloudinary via server signatures.
- Perf/UX: web budgets (TTFB/CLS/LCP), transformed Cloudinary images, user-persisted filters.

## Product Status (v0.14.1)
- Auth/RBAC: NextAuth Credentials, role-based middleware, role-based home redirects, open student signup (optional premium).
- Profile: greeting/session header, `/app/profile` page (email/role/school, first name/last name/age/photo), teacher/student favorites (hearts) visible on public teacher profile, optional contacts (WhatsApp phone, Instagram username) with external buttons.
- Positions: progress/injuries (CRUD, pagination 10), mini-game, linked muscles/joints, multi-discipline filters, authenticated Cloudinary videos (signed).
- Courses & schedules: lists + detail aligned across student/teacher/admin, week/month schedules (student/teacher/admin) with persisted filters, dynamic ICS with timezone + alarm, cancellation refunds credits and cleans related invoices.
- Billing/purchases: `Invoice` per course (admin: statuses, CSV export, backfill), teacher read-only view, student purchases (packs/subscriptions/presets) visible to admin/teacher.
- Presets/combos: admin/teacher CRUD, student catalog, credits/premium purchases, Cloudinary images/videos, extended filters + reset, single pagination.
- Partners: CRUD + click/purchase tracking (`PartnerEvent`) + partner redirects.
- Notifications: bell menu (delete/clear all/counter), dedup by user/kind/course, fetch limit 50.
- Super-admin: Cloudinary vs DB media audit (resource/type filters, orphan/broken diff, CSV export); logics page renders styled Markdown tasks.
- Media/Cloudinary: avatars (size/resolution checks, seed fallback), headers/course/studio/school/preset photos, placeholders, API signing and deletion.
- Dev seeds: fixed accounts (admin/teacher/student1/2, password `DATABASE_SEED_PWD`), 2 schools (photos `sc_*`), studios, partners, 30 positions (Cloudinary videos), 40 courses with invoices, 500 credits/student, Pole/Exotic/Flexibility/Pilates/Conditioning disciplines, muscles/joints, presets with media. Unlock demo through preset/course purchase kept. Seeded contacts for the main teacher (WhatsApp/Instagram).

## Stack / Scripts
- Next.js 16 App Router, React 19, TypeScript, Tailwind v4.
- Prisma + PostgreSQL, NextAuth Credentials.
- Docker (multi-stage) + docker-compose; Render deployment via `render.yaml`.
- Key scripts: `npm run db:migrate:deploy`, `npm run db:push`, `npm run db:seed`, `npm run dev`, `npm run start:render`.

## Keep Updated
- Keep in sync: backlogs (`backlog/*.md`), changelog, models (`models/03_DATA_MODEL.md`), routes (`models/04_ROUTES_AND_SCREENS.md`), instructions.
- Internal references: prioritize files under `models/`, `backlog/`, and `instructions/`.
