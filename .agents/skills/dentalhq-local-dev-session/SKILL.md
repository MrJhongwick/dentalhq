---
name: dentalhq-local-dev-session
description: Start or resume the four core DentalHQ applications from the active checkout in one reusable local terminal session. Use when the user asks to run, start, inspect, or restore the DentalHQ local full stack; do not use for generic builds or deployment.
---

# DentalHQ local development session

Run the active checkout's landing, dashboard, console, and API applications in
one long-lived terminal session that remains available to inspect or stop in a
later turn. Never start a second copy when the existing session can be reused.

## 1. Resolve the checkout and runtime contract

Resolve the repository from the caller's active checkout rather than from a
remembered absolute path:

```sh
git rev-parse --show-toplevel
```

Work from that root. Before inspecting processes or starting anything, read the
root `package.json`, `pnpm-workspace.yaml`, and the `package.json` files for
`@dentalhq/landing`, `@dentalhq/dashboard`, `@dentalhq/console`, and
`@dentalhq/api`. Inspect relevant app configuration and local environment files
when they can override a port.

Derive the effective ports from this checkout's scripts and configuration. If
the checkout does not override them, the expected full-stack defaults are:

- landing: `3000`
- dashboard: `3001`
- console: `3002`
- API: `3003`

Treat those values as fallbacks and expected topology, not stronger evidence
than the active checkout. Report a material mismatch before launch when the
scripts and documented configuration disagree or leave a port ambiguous.

## 2. Reconcile required ports safely

Inspect every effective application port before launch. For each listener,
resolve enough evidence to attribute it confidently:

- listening address and port;
- PID and full command line;
- process current working directory;
- parent PID chain;
- process group and its members when group termination may be appropriate;
- checkout identity, Git root/common directory, or remote URL when the working
  directory is inside a Git checkout;
- container identity, labels, mounts, and Compose project when the listener is
  containerized.

Use the operating system's available read-only tools, such as `ss`, `lsof`,
`ps`, `/proc/<pid>`, and container inspection. Do not infer ownership from a
port number or a generic command name such as `node`, `vite`, or `pnpm`.

Reuse a healthy core-app group only when it belongs to this exact checkout and
matches the requested topology. An occupied port may be stopped only when the
combined evidence proves that its listener belongs to DentalHQ, including a
different DentalHQ checkout or worktree that conflicts with the active one.

When a conflicting DentalHQ listener must stop:

1. Prefer `TERM` to the smallest verified process group whose members all
   belong to that DentalHQ run.
2. Confirm the target group is not the current agent or supervisor's group.
3. If group ownership is mixed or uncertain, do not signal the group; narrow
   the target or stop and report the ambiguity.
4. Wait briefly, then re-inspect every affected port.
5. Escalate beyond `TERM` only with fresh evidence and user authorization.

Never use `pkill`, `killall`, a broad name-based match, or a repository-wide
process sweep as a kill target. Never stop an unrelated process merely because
it occupies an expected port.

## 3. Verify the DentalHQ development database

Ensure `apps/api/.env` exists before launching the apps. If it is absent:

1. Require `apps/api/.env.example`; do not invent missing credentials or a
   database topology.
2. Copy the example to `.env` without overwriting an existing file.
3. Confirm `.env` is ignored with `git check-ignore` before placing secrets in
   it. If the example is missing or the destination is not ignored, stop and
   report the blocker.

Inspect `DATABASE_URL` without printing its password or full secret value.
Resolve its host, port, and database name, then prove that it targets a healthy
DentalHQ development database using the repository's documented health command
or a non-destructive connection check such as `pg_isready` and `SELECT 1`.
Corroborate ownership through DentalHQ configuration, container labels/mounts,
Compose metadata, or an already-documented local service. A successful TCP
connection alone does not prove database ownership.

Preserve healthy supporting infrastructure. Do not restart it merely to get a
clean session, and never remove containers, volumes, or data. If PostgreSQL's
example port `5432` belongs to another project, do not stop that project and do
not point DentalHQ at its database. Use only a verified DentalHQ database on a
non-conflicting port already supported by the checkout. If none exists, report
the missing infrastructure or configuration instead of inventing one.

## 4. Start one retained core-app session

From the active repository root, start exactly the documented core packages:

```sh
pnpm --parallel --stream \
  --filter @dentalhq/landing \
  --filter @dentalhq/dashboard \
  --filter @dentalhq/console \
  --filter @dentalhq/api dev
```

Use a PTY-backed, long-lived foreground execution facility that returns a
session identifier. Do not use shell backgrounding, a detached duplicate, or
the root `pnpm dev` script. That root script may also start the optional
Cloudflare domain-proxy and Railway-notifier packages, whose ports, secrets, or
runtime compatibility can terminate the core group.

Retain the returned terminal session identifier in the active work record and
report it with the effective URLs. Later turns must use that identifier to read
new output or send `Ctrl-C` when the user asks to stop the stack. If the command
exits, inspect its output and port state before retrying; never assume it is
still running and never launch a duplicate blindly.

## 5. Prove readiness

Confirm the retained session is still alive and all four effective ports are
listening from the active checkout. Check the documented health or root route
for each app without mutating data, and inspect the retained terminal output
for startup errors. Report partial readiness plainly; do not call the stack
ready when one app failed or when a listener cannot be attributed.
