# Phase 1 foundation

DentalHQ now has a local, synthetic-data implementation of the secure tenant
foundation described in [ROADMAP.md](ROADMAP.md). It is not approved for real
patient data or production deployment.

## Ownership and trust boundaries

- `@dentalhq/contracts` contains browser-safe Zod schemas and DTOs, including
  clinic settings, membership roles, appointment states, next actions, and audit
  records. Producers and consumers use these definitions together.
- `@dentalhq/db` owns the PostgreSQL schema, generated Drizzle migration, and
  database adapters. Only the API and server-side tooling import this package.
- Better Auth manages credential hashing, signed HTTP-only session cookies,
  session expiry, and sign-out. Public sign-up is disabled. Only explicitly
  allowed sign-in, sign-out, and session-read routes are exposed.
- DentalHQ owns organization membership and roles. This phase does not enable
  the Better Auth organization plugin's separate public mutation surface.
  Membership and operator grants are read from the database on every request;
  neither a browser selection nor a submitted role authorizes an action.
- Browser apps call relative `/api` URLs. Vite proxies these to the API locally.
  Production reverse-proxy, HTTPS, cookie, and trusted-origin configuration must
  be designed and verified before deployment; Vite's proxy is development-only.

## Access matrix

| Action | Operator | Owner | Manager | Staff |
| --- | --- | --- | --- | --- |
| Provision accounts and clinics | Yes | No | No | No |
| View clinic metadata directory | Yes | Own clinic only | Own clinic only | Own clinic only |
| Read clinic detail and audit | Explicit support grant, or own membership | Own clinic | Own clinic | Own clinic |
| Change clinic settings | Only through own owner/manager membership | Yes | Yes | No |
| Add, change, or remove manager/staff access | No automatic access | Yes | No | No |

Owners cannot demote or remove the owner through the team endpoints. Ownership
transfer is deliberately not implemented. User provisioning does not assign a
clinic until onboarding or a clinic owner explicitly grants membership.

Support requires an operator, a reason of 10–300 characters, and a particular
clinic. Grants last 15 minutes and allow reads only. Reads, start, and revocation
are audited. Ending support revokes that operator's outstanding grants for that
clinic. The server enforces expiry; the console also clears its snapshot on expiry.

## Operational API

All paths below require a valid session. Mutations also require an explicitly
trusted Origin. Inputs are validated against shared schemas and body size is
limited. Errors use a safe message and request identifier; server failure logs
contain only the request identifier, status, and event name.

| Method and path | Purpose |
| --- | --- |
| GET /api/me | Current account, operator status, and own clinic memberships |
| POST /api/operator/users | Provision an account with a hashed password |
| GET /api/operator/clinics | Clinic setup directory (first 100) |
| POST /api/operator/clinics | Atomically create clinic, owner membership, and audit record |
| POST /api/operator/clinics/:id/support | Start bounded support access |
| DELETE /api/operator/clinics/:id/support | Revoke support access |
| GET /api/clinics/:id | Authorized clinic detail |
| PATCH /api/clinics/:id | Update timezone and booking configuration |
| PUT /api/clinics/:id/members | Add or change manager/staff membership |
| DELETE /api/clinics/:id/members | Revoke manager/staff membership by email |
| GET /api/clinics/:id/audit | Most recent 100 tenant-scoped audit records |

Consequential account, clinic, settings, membership, and support mutations commit
with their audit records in database transactions. There is no audit update or
delete endpoint. Clinic IDs are included in operational query predicates and
membership keys; operators are not treated as universal clinic members.

## Local verification and limitations

`pnpm check` includes tests against a fresh PGlite PostgreSQL instance using the
same generated SQL migration and Drizzle schema as the Neon path. It exercises
actual Better Auth sign-in and cookies, not mocked authentication. Reapplying
migrations is tested. Neon uses node-postgres with TLS certificate verification;
its migration command is available but is not run automatically by tests.

`pnpm dev:demo` creates a synthetic database in memory and cannot run with
`NODE_ENV=production`. Use only fixture accounts in this mode. API restarts
discard the demo database and invalidate its sessions. The Playwright suite
requires this demo to be running and a local DEVELOPMENT_PASSWORD.

The integration tests cover unauthorized, forged, expired, and signed-out
sessions; cross-tenant access; role changes and revocation; invalid origins and
payloads; duplicate onboarding; audit attribution; and read-only, expiring,
revocable support. The browser suite covers account-to-clinic onboarding,
settings, support, staff permissions, loading, empty states, network recovery,
keyboard navigation, routes, and narrow/mobile and desktop widths.

Auth uses a single-process in-memory rate limiter. Distributed rate limiting,
email verification and delivery, password recovery, MFA, account lifecycle,
backup/restore on the hosted database, and production operator governance must
be evaluated before a real clinic pilot. Console provisioning requires secure
out-of-band delivery of initial credentials; it does not send email or assert
that an email address is verified. Auth sessions expire after eight hours.

No appointment, booking, intake, payment, upload, or integration behavior is
introduced here. The stored booking flag is configuration only and does not
activate the placeholder patient page. No third-party paid service is required
for the synthetic demo.

Dependency notes: Drizzle Kit currently brings deprecated esbuild-kit transitive
packages. API type checking uses `skipLibCheck` because upstream driver type
declarations reference optional runtimes (Bun, Cloudflare, MySQL, and others);
DentalHQ source remains strictly type checked. Neither condition is a failing
application test, and both should be revisited with dependency upgrades.
