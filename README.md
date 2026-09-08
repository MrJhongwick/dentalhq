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
pnpm dev
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
variables take precedence. Placeholder pages can run without database access,
but the Phase 0 database gate requires a successful `pnpm db:check`.

For a new checkout or worktree, run `pnpm install --frozen-lockfile` from its
root before checks. Do not share its `node_modules` with another checkout.

## Validation and core-app sessions

- `pnpm typecheck` checks all four applications, including Astro templates.
- `pnpm test` runs the API database-configuration tests without live credentials.
- `pnpm check` runs type checking and tests; it does not contact Neon.
- `pnpm build` builds every application.
- `pnpm db:check` explicitly checks the configured development database.

The landing checker uses TypeScript 6 because its programmatic compiler API is
required by `@astrojs/check`.

For a retained local session, use the explicit core-app group:

```sh
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

The placeholder routes display `This is landing`, `This is dashboard`,
`This is booking`, `This is console`, and `This is api`. These screens are
scaffold checks, not implemented booking, authentication, or clinical workflows.
