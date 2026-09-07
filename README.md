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

- Node.js 22 or newer
- pnpm (the version is pinned in the root `package.json`)

Run every command from the repository root:

```sh
pnpm install
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
