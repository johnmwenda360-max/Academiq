# School PWA

Offline-first management system for Primary (Grade 1–6) and Junior
Secondary (Grade 7–9) schools. Next.js App Router + Tailwind CSS +
Prisma, with a hand-rolled service worker and an IndexedDB outbox for
background sync.

## Stack

- **Framework**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Database**: PostgreSQL via Prisma
- **Offline**: Cache API (service worker), IndexedDB (outbox queue via `idb`)
- **No component library** — plain Tailwind, kept dependency-light

## Getting started

```bash
npm install
cp .env.example .env        # then set DATABASE_URL
npx prisma migrate dev      # creates tables from prisma/schema.prisma
npx prisma db seed          # loads one demo school, class, teacher, learner
npm run dev
```

Open http://localhost:3000. The service worker only activates in a
production build or over HTTPS — run `npm run build && npm run start`
to test offline behaviour, or use Chrome DevTools' "Offline" throttle
during `npm run dev`.

## Folder structure

```
app/
  (dashboard)/         route group — learners, staff, timetable, assessments, attendance
  api/                 route handlers: timetable CRUD + /api/sync/* endpoints
  layout.jsx           root layout, registers the service worker
  register-sw.js       client component: SW registration + 'online' outbox drain
components/
  timetable-grid/      TimetableGrid.jsx — drag-and-drop grid with live conflict detection
  learner-profile/
  assessment-forms/
lib/
  db/prisma.js         Prisma client singleton
  services/             business logic — timetableService.js enforces the same
                         conflict rules server-side as the DB's @@unique constraints
  sync/
    queue.js            IndexedDB outbox: enqueueMutation(), drainOutbox()
    reconciler.js        last-writer-wins vs append-only conflict policy
prisma/
  schema.prisma          Learner, Staff, ClassGroup, Subject, Lesson, etc.
  seed.js
public/
  sw.js                  service worker: CacheFirst shell, StaleWhileRevalidate reference data
  offline.html            fallback page for offline navigations
  manifest.json
```

## Offline sync strategy

1. **App shell** (`/`, static assets) — `CacheFirst`, precached on SW install.
2. **Reference data** (`/api/subjects`, `/api/classes`, `/api/staff/list`) —
   `StaleWhileRevalidate`: instant from cache, refreshed in the background.
3. **Writes** (attendance, assessment scores, lesson placement) — never hit
   the network directly. `enqueueMutation()` in `lib/sync/queue.js` writes
   to IndexedDB first, the UI updates optimistically, then Background Sync
   (with an `online`-event fallback for iOS Safari) drains the queue.
4. **Conflict resolution** — attendance and assessment records are
   append-only logs, so concurrent offline edits never overwrite each
   other. Everything else is last-writer-wins per field, keyed on
   `clientTimestamp`. See `lib/sync/reconciler.js`.

## Timetable conflict rules

Enforced in three places, deliberately redundant:

- `prisma/schema.prisma` — `@@unique([day, period, staffId])` etc. is the
  final authority; nothing can violate it even under a race.
- `lib/services/timetableService.js` — same three checks, run before the
  DB write so the API returns a named reason (`409` + message) instead of
  a raw constraint-violation error.
- `components/timetable-grid/TimetableGrid.jsx` — the same checks again,
  client-side, so drag-and-drop gives instant feedback without a round trip.

## Not yet wired up

- Auth/RBAC middleware (roles exist in the schema; route guards are a TODO)
- SMS notification provider integration (env var is stubbed)
- PDF report card export
- Push notification permission flow for announcements
- Icons in `public/icons/` are placeholders — replace before shipping as an installable PWA
