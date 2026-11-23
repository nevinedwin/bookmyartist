# Coding standards

## Language & types
- TypeScript `strict` plus `noUncheckedIndexedAccess`. No `any`; use `unknown` and narrow.
- Prefer named exports. One component per file for anything reused.
- Server-only modules start with `import "server-only"`.

## Layering (enforced by review)
- `src/app/**` and `src/components/**` never import `@/server/db` or `@/generated/prisma`.
- Server Actions and Route Handlers: parse with Zod → get actor → call one service → map result.
- Services: `authorize()` first, transactions for multi-row writes, `audit()` for security and
  finance changes, return plain serialisable DTOs (money as strings).
- Domain modules are pure: no I/O, no `Date.now()` without injection, fully unit-tested.

## Money & time
- Money is `bigint` paise inside the server, `string` across boundaries, formatted only in UI via
  `formatINR()`. Never `Number()` a money value for arithmetic.
- Store UTC; render with `formatInIST()` helpers. Calendar dates (`eventDate`) are `YYYY-MM-DD`
  strings at the boundary.

## Security
- Every admin read/write checks a permission on the server — hiding UI is not access control.
- Public selects are whitelists. Never spread a Prisma row into a response.
- Never log request bodies, tokens, passwords, or personal data. Log IDs.
- Validate uploads by MIME sniffing + size limits; private files only via signed, expiring URLs.

## UI
- Server Components by default; `"use client"` only for interactivity.
- All interactive elements are keyboard reachable with visible focus; images have `alt`.
- Every data view has loading, empty and error states.
- Motion must respect `prefers-reduced-motion` (`useReducedMotion` / CSS media query).

## Naming
- Files: `kebab-case.ts(x)`. Components: `PascalCase`. Actions: `verbNounAction`.
- Services: `verbNoun` (`createEnquiry`, `changeEnquiryStatus`).
- Enum values mirror the database (`QUOTATION_SENT`), labels come from `src/lib/labels.ts`.

## Tests
- Domain logic: unit tests next to behaviour in `tests/unit`.
- Services touching the DB: integration tests against `encore_test`.
- Critical journeys: Playwright in `tests/e2e`.
- Never use real customer or artist data in fixtures. Integration and e2e tests refuse to run
  against a database whose name doesn't contain `test`.

## Git
- Conventional commits (`feat:`, `fix:`, `chore:`…). Small, reviewable PRs. CI must be green.
