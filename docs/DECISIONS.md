# Architecture Decision Records

Short, dated records of decisions that shape the codebase. Add new ones at the bottom; never
rewrite history — supersede instead.

### ADR-001 · Single Next.js app, two route areas (2026-11-23)
Public site and admin share one deployment, one database and one service layer, but use separate
layouts (`src/app/(public)` and `src/app/admin`). One deploy and one auth boundary keep operations
simple for a small agency; the service layer keeps the areas decoupled.

### ADR-002 · Next.js 16 with Cache Components (2026-11-23)
New default in Next 16 and the forward path. Public catalogue reads use `"use cache"` + tags and
are invalidated with `updateTag()` after admin edits. Runtime reads (session, `searchParams`) sit
behind `<Suspense>`.

### ADR-003 · Prisma 7 with the `pg` driver adapter (2026-11-23)
Prisma 7 is the latest stable major (8.x is still RC). `@prisma/adapter-pg` works against local
Postgres and Neon (pooled URL at runtime, direct URL for migrations via `prisma.config.ts`).

### ADR-004 · Money as BigInt paise (2026-11-23)
Int32 paise caps at ~₹2.1 crore, which celebrity bookings can exceed, so all money columns are
`BigInt`. Arithmetic uses `bigint` in `src/server/domain/money.ts`; values cross the server/client
boundary as decimal strings. Floats are never used for money. Percentages are basis points.

### ADR-005 · Confidential artist data in a separate table (2026-11-23)
`ArtistInternal` holds private contacts, base price, commission and notes. Public services select
from `Artist` only, using explicit whitelists, so a future column added to `Artist` is still not
exposed unless deliberately added to the public select.

### ADR-006 · Double-booking prevention in the database (2026-11-23)
A Postgres exclusion constraint (btree_gist) forbids overlapping `CONFIRMED` reservations per
artist. Application checks give friendly messages; the constraint makes races impossible.

### ADR-007 · Custom session auth instead of an auth framework (2026-11-23)
Requirements are email + password for a handful of staff with RBAC, revocation and expiry. A
database-backed opaque token (random 256-bit, only its SHA-256 stored), HTTP-only `Secure`
`SameSite=Lax` cookie, Argon2id (`@node-rs/argon2`) hashing, sliding expiry and server-side
revocation is ~300 lines that we fully control and audit. Revisit if SSO/OAuth is required.

### ADR-008 · Email outbox (2026-11-23)
Emails are written to `EmailMessage` in the same transaction as the business change, then
delivered after the response (`after()`) and retried by a cron route with exponential backoff.
An email outage can never lose an enquiry. If `RESEND_API_KEY` is unset, messages are marked
`SKIPPED` (visible in admin) — we never pretend an email was sent.

### ADR-009 · Tax is configurable, not "GST compliant" (2026-11-23)
Line-level tax rate (bps) and label, agency-level defaults in `BusinessSettings`. No claim of GST
compliance (place-of-supply, CGST/SGST/IGST split, e-invoicing) until those rules are implemented
and validated with an accountant.

### ADR-010 · Rate limiting in Postgres (2026-11-23)
Fixed-window counters in `RateLimitBucket` keyed by scope + hashed IP. Works on serverless without
adding Redis. Can be swapped for Upstash later behind the same interface.

### ADR-011 · Anti-bot: honeypot + timing + optional Turnstile (2026-11-23)
Every public form carries a hidden honeypot field and a signed render timestamp (too-fast
submissions are rejected). When `TURNSTILE_SECRET_KEY` is configured, Cloudflare Turnstile is
also verified server-side. No third-party script is loaded when it is not configured.

### ADR-012 · Marketing copy as typed content files; catalogue in the database (2026-11-23)
Services/experiences copy changes rarely and benefits from code review, so it lives in
`src/content/*.ts`. Artists, categories, media and testimonials are database records managed in
admin. Seeded demo records are flagged `isDemo` and are never seeded in production.

### ADR-013 · Brand name placeholder (2026-11-23)
The brand is **Encore** ("Every Celebration Deserves Its Own Soundtrack.") as a placeholder.
All brand strings come from `src/config/site.ts` and `BusinessSettings`, so renaming is a config change.

### ADR-014 · Demo imagery (2026-11-23)
Development seed data uses Unsplash photographs (Unsplash License) for illustration only. Demo
artists are fictional and flagged `isDemo`. Production content is uploaded to Cloudinary.

### ADR-015 · HTTP 404s for unknown slugs are decided in proxy.ts (2026-11-23)
With Cache Components the prerendered shell starts a `200` response before a page's
request-time `notFound()` can run, which would make unknown artist/service URLs "soft 404s"
(caught by the e2e suite). `src/proxy.ts` checks service slugs against the static list and
artist slugs against a per-instance set of active slugs refreshed every 60 s, then rewrites
unknown ones to the not-found page with status 404. Trade-off: a newly published or archived
artist can take up to 60 s to be recognised on an already-warm instance.

### ADR-016 · Shared validation lives in src/lib/validation (2026-11-23)
Zod schemas are imported by client components (instant field errors) and route handlers
(authoritative checks), so they live outside `src/server`. The server always re-validates.

### ADR-017 · Brand name: BookMyArtist (2026-11-23)
Supersedes the placeholder in ADR-013. The owner chose **BookMyArtist**. Brand strings live in
`src/config/site.ts` and `BusinessSettings.agencyName`; the wordmark is "BookMy" + accented
"Artist". Infrastructure identifiers (`encore_local`, `encore_test`, container `encore-postgres`)
were deliberately not renamed: they are invisible to users and renaming them would orphan local
data. Before launch, confirm the name and domain are free to use (trademark and domain check).

### ADR-018 · Enquiry visibility: everyone with `enquiry:read` sees all enquiries (2026-11-23)
Owner decision. A small agency shares leads, so ownership is a filter ("Mine", "Unassigned"),
not an access rule. If per-owner visibility is ever needed, add an `enquiry:read_all`
permission and scope `buildWhere()` in `services/admin/enquiries.ts`, which every enquiry
read already goes through.

### ADR-019 · Session and account policy (2026-11-23)
Implements ADR-007. Sessions expire after 12 h idle or 7 days absolute; the cookie is
`__Host-bma_session` (Secure) on HTTPS and `bma_session` on plain-HTTP localhost only.
Five consecutive failures lock an account for 15 minutes, in addition to per-IP (20/15 min)
and per-account (10/15 min) rate limits. Every failure path does equivalent Argon2 work and
returns the same message. Accounts created or reset by an admin get a one-time temporary
password and `mustChangePassword`, which confines them to `/admin/change-password`. There is
no self-service "forgot password" email yet (needs Resend, Phase 6); admins reset passwords.
Session rows store a hashed IP fingerprint, never the raw IP.

### ADR-020 · Authorization lives in the DAL and services, not layouts (2026-11-23)
Next.js renders layouts and pages in parallel, so the `(desk)` layout is not a security
boundary. Every admin page resolves the actor via `src/server/auth/dal.ts`, every Server Action
re-reads the session, and every service starts with `authorize(actor, permission)`. Pages a
role can't use render a no-access state without loading data. `proxy.ts` only redirects
cookie-less requests to the login page as a convenience. `forbidden()` was not used because it
is still experimental (`authInterrupts`).

### ADR-021 · Profile edits and account deletion (2026-11-23)
Users edit their own name and phone; changing the sign-in email requires the current password
and signs out other devices (no confirmation email until Resend is set up). Admins with
`user:manage` edit members' name, email and phone. Deletion needs `user:delete`, held only by
SUPER_ADMIN. It is a soft delete: the row stays so notes, timeline and audit keep their author;
the account is disabled, signed out, its email and phone released, and its open enquiries
unassigned. Audit entries mask emails and phone numbers.

### ADR-022 · Artist publishing and catalogue cache expiry (2026-11-23)
An artist is on the website exactly when `status = ACTIVE`; staff-created artists start
`INACTIVE` unless "Publish now" is ticked, so half-written profiles never go live. Saves call
`updateTag` (read-your-own-writes) rather than `revalidateTag(…, "max")`: the editor expects to
see the change on the website straight away, and admin edits are rare enough that the cost of a
cold cache is negligible. Renaming a slug expires both tags; old links 404 (no redirects yet).
The proxy's slug set (ADR-015) now lives on `globalThis`, because proxy.ts and Server Actions
are separate bundles and a module variable could never be reset by a publish. A slug missing
from the set is confirmed with one indexed lookup before answering 404, so a newly published
artist is reachable at once on every instance; an unpublished one may still reach the page
(which renders not-found) on other warm instances for up to 60 s.

### ADR-023 · Client de-duplication by exact email or phone (2026-11-23)
Duplicates are only flagged on an exact (normalised) email or E.164 phone match: fuzzy name
matching produced too many false alarms for common Indian names. Creating a matching client
returns the matches instead of an error, and staff can confirm "Create anyway" (shared office
numbers, family members). Client records are never merged automatically, and linking an
enquiry never rewrites its submitted contact snapshot.

### ADR-024 · Task visibility and assignment (2026-11-23)
Same rule as enquiries (ADR-018): anyone with `task:read` sees all tasks; "Mine" and
"Unassigned" are filters. Assignees must be active staff holding `task:write`. Assigning someone
else creates an in-app notification; tasks are cancelled rather than deleted so history stays.

### ADR-025 · Deleting artists (2026-11-23)
Archiving stays the normal way to retire an artist. A permanent delete exists for mistakes and
needs the new `artist:delete` permission (Super admin and Admin; not Manager). It is refused while
anything that must survive references the artist — enquiries (preferred or source), bookings,
payouts, quotation lines, testimonials, files or a portal login — and the page lists what blocks
it. The artist's own profile media, availability, blackouts and private details go with it. The
user types the stage name to confirm; the deletion is audited with the slug and name. Existing
databases need `npm run db:seed` once to grant the permission.

### ADR-026 · Editing and deleting enquiries (2026-11-23)
Refines the "snapshot" rule in ARCHITECTURE §3: staff with `enquiry:write` may correct an
enquiry's contact, event, entertainment and budget fields, because a wrong phone number or a
moved date must be fixable. The customer's free-text message is never editable. Edits are
conditional on the version the editor loaded, and each save adds one timeline entry naming the
changed fields, with old → new values for event details only (personal values aren't copied).
Linking a client still never rewrites the enquiry.
Permanent deletion needs the new `enquiry:delete` (Super admin, Admin) and a typed reference.
It removes the enquiry with its notes, timeline, artist links, tentative holds, tasks and the
notifications pointing at it, and is audited with the reference and a masked email. It is
refused once a quotation, booking or file exists; those enquiries are closed as lost or
cancelled instead. Existing databases need `npm run db:seed` once to grant the permission.

