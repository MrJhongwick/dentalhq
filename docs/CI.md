# Continuous integration

DentalHQ uses GitHub Actions to validate every pushed commit and every pull
request. The workflow is defined in
[`../.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Triggers

CI runs for every push to any branch and every pull request event. When a newer
commit is pushed to the same branch or pull request, GitHub cancels the
superseded run so repository minutes are spent on the newest revision.

## Validation jobs

### Typecheck, test, and build

The quality job installs dependencies from the root lockfile and runs:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm peers check
```

This verifies TypeScript and Astro diagnostics, package and API tests,
production builds for every workspace, and peer-dependency compatibility.

### Browser flows

The browser job installs Chromium, starts the four core applications with the
synthetic development stack, waits for ports 3000–3003, and runs:

```sh
pnpm test:e2e
```

The suite covers onboarding, role restrictions, loading and network errors,
empty states, routing, keyboard access, responsive layout, and the implemented
dashboard interactions.

Browser CI does not connect to Neon or require database credentials. It uses
CI-only authentication values and the in-memory database created by
`pnpm dev:demo`. Synthetic values must never be reused as production secrets.

## Failure evidence

When browser validation fails, CI uploads Playwright test results and
screenshots, the HTML report when generated, and the synthetic server log.
Artifacts are retained for seven days. Successful runs do not upload them.

## Runtime and permissions

The workflow uses Node.js 22.13.0, the pnpm release declared by the root
`packageManager` field, `actions/checkout@v6`, `actions/setup-node@v7`,
`pnpm/action-setup@v6`, and `actions/upload-artifact@v7`.

GitHub token permissions are restricted to read-only repository contents. The
workflow does not deploy, merge pull requests, mutate branches, or access
production infrastructure.

## Local equivalent

Run the quality checks from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm peers check
```

For browser validation, start the synthetic stack in one terminal and run the
browser suite from another:

```sh
pnpm dev:demo
pnpm test:e2e
```

The workflow becomes active on GitHub only after `.github/workflows/ci.yml` is
committed and pushed to a branch.
