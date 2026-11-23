# Deployment guide

> Phase 8 will turn this into a verified runbook. Everything below already applies to the
> code as it stands; items marked *(later)* depend on integrations not yet built.

## 1. Environments

| Environment | Hosting | Database | Branch | Indexing |
| --- | --- | --- | --- | --- |
| Development | `npm run dev` | Docker `encore_local` | any | n/a |
| Test / CI | GitHub Actions | ephemeral `encore_test` | PRs | n/a |
| Preview / staging | Vercel Preview | Neon branch `preview` | PR branches | blocked by `robots.txt` |
| Production | Vercel Production | Neon `main` | `main` | allowed |

Production and non-production **never share a database**.

## 2. Neon (PostgreSQL)

1. Create a Neon project in a region close to your users (e.g. `aws-ap-south-1`, Mumbai).
2. In the `main` branch, copy two connection strings:
   - **Pooled** (`-pooler` host) → `DATABASE_URL` (runtime)
   - **Direct** → `DIRECT_DATABASE_URL` (migrations)
   Both must include `?sslmode=require`.
3. Create a `preview` branch for staging and use its strings in Vercel's Preview environment.
4. The init migration creates the `btree_gist` and `pg_trgm` extensions; both are available on Neon.

## 3. Vercel

1. Import the GitHub repository. Framework preset: Next.js. Node 24.
2. Build command: `npx prisma migrate deploy && next build`. Migrations run before the build,
   because the build prerenders pages against the database.
   Install command: default (`npm install` runs `prisma generate` via `postinstall`).
3. Set environment variables per environment (Production / Preview) from `.env.example`.
   Required: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `APP_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`.
   Recommended: `RESEND_API_KEY`, `EMAIL_FROM`, Turnstile keys, public contact details.
4. Cron: `vercel.json` schedules `/api/cron/outbox` every 15 minutes (email retries and
   rate-limit cleanup). Sub-daily crons need a Vercel Pro plan; on Hobby, change the schedule
   to daily. Emails are also attempted immediately after each enquiry, so cron is only the retry path.

## 4. Database migrations

- Development: `npm run db:migrate -- --name <change>` creates and applies a migration.
- Hand-written SQL (constraints Prisma can't express) goes into the migration file *before*
  applying it, and is documented in ARCHITECTURE §3.3.
- CI / production: `prisma migrate deploy` only. Never run `migrate dev` or `migrate reset`
  against Neon production.
- Prefer additive, backwards-compatible migrations (expand → deploy code → contract).

## 5. Initial setup after the first deploy

```bash
# against the production DIRECT_DATABASE_URL, from a trusted machine
DATABASE_URL="<direct url>" DIRECT_DATABASE_URL="<direct url>" npx prisma db seed
```

This seeds roles, permissions, business settings and categories. It never seeds demo
artists in production.

Then create the first super admin, from the same trusted machine and environment:

```bash
DATABASE_URL="<direct url>" npm run admin:create -- --email you@yourdomain.com --name "Your Name"
```

You'll be prompted for a password (hidden, at least 12 characters). Sign in at
`https://yourdomain.com/admin`, then add the rest of the team from **Team & access**; each
person gets a one-time temporary password and must set their own at first sign-in.

Locked out? `npm run admin:create -- --email you@yourdomain.com --reset` sets a new password,
unlocks the account and signs it out everywhere (the role is kept unless `--role` is passed).

## 6. Custom domain, DNS and HTTPS

1. Vercel → Project → Settings → Domains → add `yourdomain.com` and `www.yourdomain.com`.
2. At your DNS provider:
   - Apex: `A` record → `76.76.21.21` (or the value Vercel shows)
   - `www`: `CNAME` → `cname.vercel-dns.com`
3. Vercel issues and renews TLS certificates automatically. HSTS is sent by the app.
4. Set `NEXT_PUBLIC_SITE_URL=https://yourdomain.com` for Production and redeploy
   (canonical URLs, sitemap and email links depend on it).
5. Resend: verify the sending domain (SPF, DKIM records shown by Resend) before setting `EMAIL_FROM`.

## 7. Backups and restore

- Neon keeps point-in-time history (retention depends on plan). Restore by creating a
  branch at a timestamp and pointing `DATABASE_URL` at it, or by resetting `main` to it.
- Additionally take logical backups, e.g. nightly:
  ```bash
  pg_dump --format=custom --no-owner "$DIRECT_DATABASE_URL" > encore-$(date +%F).dump
  ```
  Restore into an empty database:
  ```bash
  pg_restore --no-owner --dbname "$TARGET_DIRECT_URL" encore-YYYY-MM-DD.dump
  ```
- Test a restore at least quarterly.

## 8. Production checklist

- [ ] `APP_SECRET` and `CRON_SECRET` are long, random and unique per environment
- [ ] Production and Preview use different Neon branches
- [ ] `NEXT_PUBLIC_SITE_URL` matches the custom domain
- [ ] `prisma migrate deploy` ran successfully
- [ ] Seed ran (roles, settings, categories). No demo content in production
- [ ] Resend domain verified; a test enquiry email was delivered *(email outbox shows SENT)*
- [ ] Turnstile keys set (recommended)
- [ ] `robots.txt` allows indexing in production only; `/admin` is `noindex`
- [ ] Sentry DSN configured *(later)*
- [ ] First super admin created with `npm run admin:create`; team added via Team & access
- [ ] `NEXT_PUBLIC_SITE_URL` is `https://…` (enables the `__Host-` Secure session cookie)
- [ ] Backup and restore tested
