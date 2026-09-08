# DentalHQ

A pnpm monorepo containing four independently runnable applications:

- `apps/landing` — Astro landing page
- `apps/api` — Hono API
- `apps/dashboard` — Vite + React dashboard and booking pages
- `apps/console` — Vite + React console

Application-specific code stays inside its owning directory under `apps/`.
Shared contracts and reusable packages belong under `packages/` only when a
concrete cross-application need exists.

## Requirements

- Node.js >=22.13.0
- pnpm >=11.0.0 (the version is pinned in the root `package.json`)

Run every command from the repository root:

```sh
pnpm install
pnpm check
pnpm build
# Configure apps/api/.env as described below before starting apps.
pnpm dev:demo
```

The development servers print their local URLs. The dashboard is available at
`/`, and its booking page is available at `/booking`.

| Application | Root command | Local URL |
| --- | --- | --- |
| Landing | `pnpm dev:landing` | `http://localhost:3000` |
| API | `pnpm dev:api` | `http://localhost:3003` |
| Dashboard | `pnpm dev:dashboard` | `http://localhost:3001` |
| Booking | `pnpm dev:dashboard` | `http://localhost:3001/booking` |
| Console | `pnpm dev:console` | `http://localhost:3002` |

The root `pnpm-lock.yaml` is the repository's only lockfile.

## Local database configuration

From the repository root, copy `apps/api/.env.example` to `apps/api/.env`
if the local file does not already exist. Enter the approved DentalHQ Neon
development database's pooled `DATABASE_URL` and direct
`DATABASE_URL_UNPOOLED`. Never commit the populated file or put these values in
browser apps. Each worktree needs its own ignored environment file; Git does
not copy it when creating a worktree.

Run `pnpm db:check` to verify both connections with `SELECT 1`. This check
validates configuration and makes no schema or data changes. It prints only
the variable name and success/failure, never connection details. It checks
connectivity, not database ownership: select the DentalHQ development database
before running it. Use synthetic data only.

The API development command loads its local `.env`; already-exported environment
variables take precedence. The authenticated API requires a migrated database
and `BETTER_AUTH_SECRET`. The synthetic demo described below uses an isolated
in-memory PostgreSQL database instead of Neon.

For a new checkout or worktree, run `pnpm install --frozen-lockfile` from its
root before checks. Do not share its `node_modules` with another checkout.

## Validation and core-app sessions

- `pnpm typecheck` builds shared packages, then checks all workspaces and Astro templates.
- `pnpm test` runs configuration and API integration tests against a clean embedded
  PostgreSQL instance, including migrations, real Better Auth sessions, tenant
  isolation, role changes, support grants, and audit records.
- `pnpm check` runs type checking and tests; it does not contact Neon.
- `pnpm build` builds every application.
- `pnpm db:check` explicitly checks the configured development database.
- `pnpm test:e2e` tests the browser flows against an already-running synthetic demo.

The landing checker uses TypeScript 6 because its programmatic compiler API is
required by `@astrojs/check`.

For a retained local session, use the explicit core-app group:

```sh
pnpm build:packages
pnpm --parallel --stream \
  --filter @dentalhq/landing \
  --filter @dentalhq/dashboard \
  --filter @dentalhq/console \
  --filter @dentalhq/api dev
```

Check ports 3000–3003 before starting a second worktree. Do not terminate an
unrelated listener. Retain the terminal session identifier and verify listener
ownership after stopping; child watchers may need separate graceful shutdown.
See [the local-session skill](.agents/skills/dentalhq-local-dev-session/SKILL.md).

Landing, public booking, and the API root retain their placeholder responses.
Dashboard and console now provide authenticated Phase 1 workflows.
See [the foundation guide](docs/FOUNDATION.md) for roles, APIs, and limitations.

## Synthetic visual demo

Set a random `BETTER_AUTH_SECRET` (at least 32 characters) and a local
`DEVELOPMENT_PASSWORD` (at least 12 characters) in the ignored `apps/api/.env`.
Then run `pnpm dev:demo` from the active worktree root. This command starts the
four core apps and seeds a new in-memory PGlite PostgreSQL instance. It does
not contact Neon, and all demo changes disappear when the API restarts.

Use your local `DEVELOPMENT_PASSWORD` with one of these synthetic accounts:

| Email | Access |
| --- | --- |
| operator@example.test | Console operator; no automatic clinic access |
| owner@example.test | Sample Dental owner |
| staff@example.test | Sample Dental staff |
| other@example.test | Owner of a different clinic |

In a second terminal, `pnpm exec playwright install chromium` installs the test
browser, then `pnpm test:e2e` verifies onboarding, role restrictions, loading,
empty/error recovery, keyboard access, public routing, and mobile/desktop layout.
Linux hosts also need Playwright's documented browser system dependencies.
Run browser tests only against the synthetic demo: they create synthetic users
and clinics through the UI. Screenshots and reports are ignored by Git.

## Neon development setup

Choose the intended DentalHQ **development** database before running write commands.
Prefer an isolated Neon development branch for schema work. Fill the pooled and
direct URLs in `apps/api/.env`, along with a random auth secret and the explicit
local auth URL/origins shown in the example. No migrations run on application startup.

```sh
pnpm db:check
pnpm db:migrate
```

The migration command uses the direct URL and applies the checked-in Drizzle
migrations. To create the first operator, set `BOOTSTRAP_NAME`, `BOOTSTRAP_EMAIL`,
and `BOOTSTRAP_PASSWORD` locally and run `pnpm operator:bootstrap`. It refuses
when an operator already exists. Remove the bootstrap password afterward.
Subsequent account and clinic provisioning happens through the console, without
direct database editing. Start the normal core-app command above for Neon mode.

Generate future migrations with `pnpm db:generate`; review the resulting SQL
and test it before applying it. The Phase 1 migration has been exercised on clean
PGlite PostgreSQL; applying it to Neon remains an explicit environment setup step.
