# DentalHQ repository instructions

## Scope

Apply these instructions to the entire repository.

More-specific `AGENTS.md` files under `apps/` and `packages/` add constraints
for their subtree.

## Product source of truth

Read these files before changing product behavior or planning work:

- `docs/VISION.md` for product intent and strategic boundaries.

Treat the repository docs as complementary sources of truth. Do not move
later-phase work into the MVP without recording the dependency and customer
evidence.

## Workspace commands

Use pnpm from the repository root. The root `pnpm-lock.yaml` is the only
lockfile.

```sh
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm check
pnpm test
pnpm --filter <workspace-name> <script>
```

Use Node.js `>=22.13.0` and pnpm `>=11.0.0`. Do not use npm or yarn for
dependency changes.

## Architecture boundaries

1. Keep PostgreSQL and Drizzle server-only inside `@dentalhq/db` and
   API/server code.
2. Keep browser-safe DTOs and Zod schemas in `@dentalhq/contracts`.
3. Never import `@dentalhq/db`, `pg`, or server secrets into dashboard,
   console, or landing.
4. Build `@dentalhq/contracts` and `@dentalhq/db` before isolated API checks
   when package outputs are required.
5. Preserve tenant isolation in every operational query, route, storage key,
   and public page.
6. Treat Better Auth session and organization access as server-enforced;
   browser guards are not authorization.
7. Keep the marketing landing site separate from the authenticated clinic
   dashboard and internal console.

## Security and dependencies

1. Never commit secrets, provider tokens, OAuth credentials, database URLs, or
   private receipt URLs.
2. Keep uploads private, validate their type and size, and authorize access
   before serving them.
3. Review dependency diffs and the lockfile whenever dependencies change.

## Validation and handoff

Run the smallest relevant checks, then broader workspace checks when shared
contracts, database schemas, routing, authentication, or deployment wiring
change.

Report pre-existing warnings separately from regressions. Do not claim a
deployment or live endpoint without verifying it.

## Commits

Use Conventional Commits when committing. Do not commit unless requested or
required by the requested workflow.
