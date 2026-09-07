# Application workspace rules

These instructions apply to every application under `apps/`.

## Ownership boundaries

- Keep application-specific code inside the app that owns it.
- Create or extend a package under `packages/` only when a shared contract,
  database schema, or genuinely reusable implementation is clearly required.
- Keep API behavior and shared types synchronized with `packages/contracts`.
  When an API contract changes, update the shared contract and every affected
  producer and consumer in the same change.

## Package management

- Use pnpm from the repository root.
- Invoke each app through its package scripts with root-level pnpm commands or
  filters.
- Never create an app-local lockfile. The repository root `pnpm-lock.yaml` is
  the only lockfile.

## Browser and server boundaries

- Keep browser applications free of database clients, Drizzle imports,
  private environment variables, and server-only modules.
- Access private data and server capabilities through the API and shared
  contracts rather than importing server implementation into browser code.

## User-flow validation

- When changing a user flow, validate routing plus its loading, empty, error,
  permission, and mobile states.
- Record or automate the relevant checks so a successful happy path is not the
  only evidence.
