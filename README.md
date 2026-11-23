# BookMyArtist — Artist Booking & Entertainment Agency Platform

A premium public website for discovering and enquiring about artists, plus a private
dashboard that runs the agency. Enquiries, artists, clients and tasks work today;
bookings, schedules, quotations, invoices, payments, payouts and reports are still to come.

> **Brand:** BookMyArtist. All brand strings come from `src/config/site.ts` and Business
> Settings (ADR-017). Internal identifiers (`encore_local` / `encore_test` databases, Docker
> container `encore-postgres`) keep their original names so existing data keeps working.

## Current status

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Architecture, schema, ER diagram, API contracts, standards | ✅ Done |
| 2 | Design system + public website + working enquiry pipeline | ✅ Done |
| 3 | Authentication, sessions, RBAC, admin bootstrap, admin shell, enquiry CRM | ✅ Done |
| 4 | Artists CRUD, clients, tasks, dashboard additions | ✅ Done |
| 5 | Bookings, calendar & conflicts, quotations, invoices, payments, payouts | ⏭ Next |
| 6–8 | Integrations, hardening, deployment | Planned |

**Working and verified (Phases 2–4)**

- Public site (dark "Stage" design system): home (12 sections), artist directory with
  URL-driven search/filters and pagination, artist profiles, categories, services (8 pages),
  experiences, about, contact, booking wizard, branded 404/error pages.
- Enquiry pipeline: shared Zod validation → origin check → Postgres rate limit → honeypot +
  signed timing token (+ optional Turnstile) → one transaction (enquiry, artist link, timeline,
  staff notifications, queued emails) → reference number (`ENQ-2026-000001`).
- Email outbox with Resend transport and retry/backoff. Without Resend keys, emails are
  marked `SKIPPED`, never reported as sent.
- **Admin sign-in** (`/admin/login`): Argon2id passwords, database sessions (only a SHA-256 of
  the token is stored), HttpOnly + SameSite=Lax cookie (`__Host-` prefixed and Secure on HTTPS),
  12 h idle / 7 day absolute expiry, per-IP and per-account rate limits, 15-minute lockout after
  5 failures, identical errors for unknown/wrong/locked/disabled accounts, audit log of every
  sign-in, failure, lockout and account change.
- **Roles & permissions**: SUPER_ADMIN, ADMIN, MANAGER, STAFF, FINANCE. Every admin page,
  Server Action and service checks permissions on the server; role changes and revocations
  apply on the next request.
- **Team & access** (`/admin/users`): add staff (one-time temporary password, forced change at
  first sign-in), change roles, reset passwords, disable/enable, sign out everywhere. Guards stop
  privilege escalation (nobody grants more than they hold; only super admins touch super admins;
  no self-demotion).
- **My account**: change password (signs out other devices), list and end sessions.
- **Enquiry CRM** (`/admin/enquiries`): table and pipeline board, search (name, reference,
  email, phone, city), filters (status, owner, priority, source, follow-up, closed), due
  follow-ups first. Enquiry page: contact links, event and requirements, status changes with
  enforced transitions (lost reason required, re-open needs permission, stale-status conflicts
  refused), owner assignment (with notification), priority, follow-up scheduling in IST, logged
  calls/emails/WhatsApp/meetings (first contact moves NEW → CONTACTED), pinned internal notes,
  full timeline. All staff with `enquiry:read` see all enquiries (owner decision).
  "Edit details" corrects contact, event, entertainment and budget (stale saves refused; each
  save is summarised on the timeline; the customer's message stays as sent). Super admins and
  admins can permanently delete spam, test or duplicate enquiries (typed reference, audited);
  enquiries with quotations, a booking or files can only be closed.
- **Artists** (`/admin/artists`): roster with search and filters (status, category, featured,
  archived). Add and edit the public profile (auto-generated, de-duplicated web address; image
  links limited to Unsplash/Cloudinary; public price and contact only when switched on),
  publish/unpublish through status, "availability checked" for the public badge. Super admins
  and admins can permanently delete an artist that has no history (typed-name confirmation,
  audited); anyone linked to enquiries, bookings or payments can only be archived. Saving expires
  the public catalogue cache, so the website shows the change on the next request. Stale saves
  are refused. Confidential rates, contacts, commission and payout reference need
  `artist:internal` to see or change, and every change is audited (amounts only, never notes).
- **Clients** (`/admin/clients`): search, type filter, archive/restore, edit with stale-save
  protection. Creating a client whose email or phone already exists shows the matching records
  first ("Create anyway" to confirm). On an enquiry: link a suggested match (same email or
  phone), search and link, or create a client from the submitted details in one click, each
  logged on the timeline; the customer's original submission is never rewritten.
- **Tasks** (`/admin/tasks` and on each enquiry): assignee, priority, due time in IST, details;
  overdue/today/7-day filters; complete, re-open or cancel with conflict protection; assignees
  are notified. Everyone with `task:read` sees all tasks ("Mine" is a filter).
- **Dashboard**: sections appear per permission — enquiry counts, pipeline and latest
  enquiries; my overdue/today/open tasks and next tasks; artists on the website, hidden, and
  with unchecked availability; clients, new clients and open enquiries without a client. All
  live counts; no estimated or sample numbers.
- Notifications inbox with unread badge and mark-read.
- Tests: 140 Vitest tests (unit + integration against a real Postgres) and Playwright
  end-to-end tests (desktop and mobile).

**Not built yet:** bookings, calendar, quotations, invoices, payments, payouts, expenses,
reports, settings UI, category and media/gallery management, Cloudinary uploads, PDFs, task
reminder emails, staff-created enquiries, editing an enquiry's artist list. The admin menu only lists modules that exist.

## Tech stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
shadcn/ui (Radix) · Motion · GSAP ScrollTrigger · Prisma 7 + PostgreSQL 17 · Zod 4 ·
Vitest · Playwright. Planned: Vercel, Neon, Resend, Cloudinary, Sentry, Razorpay (optional).

## Getting started

Prerequisites: Node 22.12+ (24 recommended), Docker.

```bash
npm install                         # also generates the Prisma client
cp .env.example .env                # then set APP_SECRET (openssl rand -base64 48)
npm run db:up                       # Postgres 17 on localhost:5433 (+ encore_test DB)
npx prisma migrate deploy           # apply migrations
SEED_DEMO=true npm run db:seed      # roles, settings, categories + fictional demo artists
npm run admin:create -- --email you@agency.in --name "Your Name"   # first super admin (prompts for a password)
npm run dev                         # http://localhost:3000 · admin at /admin
```

Demo artists are fictional and flagged `isDemo`. Their photos are Unsplash stock images
(Unsplash License) that do not depict the named artists. Demo seeding is refused in production.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build / server (build prerenders against the DB) |
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit + integration (uses `encore_test`) |
| `npm run test:e2e` | Playwright: migrates + seeds `encore_test`, builds, serves on :3100 |
| `npm run verify` | typecheck → lint → test → build |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply migrations (CI / production) |
| `npm run db:seed` | Idempotent seed |
| `npm run db:studio` | Prisma Studio |
| `npm run admin:create -- --email … --name …` | Create the first admin (hidden password prompt; `--role`, `--reset` to recover an account) |

## Project layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §2. In short:

```
src/app/(public)     public website (Stage layout)
src/app/admin        admin: login, change-password, (desk)/ protected pages
src/app/api          route handlers (enquiries, cron)
src/components       ui/ (shadcn) · stage/ (public) · desk/ (admin) · shared/
src/server           db, env, auth, domain logic, services, email, security
src/lib              framework-agnostic helpers, shared Zod schemas
prisma               schema, migrations, seed
tests                unit · integration · e2e
docs                 architecture, decisions, standards, deployment
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md): product architecture, ER diagram, business rules,
  API contracts, user journeys, design direction, roadmap
- [Decisions](docs/DECISIONS.md): architecture decision records
- [Coding standards](docs/CODING_STANDARDS.md)
- [Deployment](docs/DEPLOYMENT.md): environments, Neon, Vercel, DNS, migrations, backups
