# DentalHQ Roadmap

This roadmap turns [the product vision](VISION.md) into outcome-driven phases.
The vision owns product intent and strategic boundaries; this document owns
delivery sequence and evidence required to advance. Phases are not calendar
commitments. Planned capabilities are not claims of implementation.

The initial release is a focused book-to-chair workflow for an independent US
dental clinic, not a replacement practice-management or clinical system.
Development begins as a personal project with synthetic data and free tooling
where practical. A working scaffold is not production or healthcare readiness.

## Phase 0 — Working foundation

**Outcome:** A runnable monorepo provides a stable starting point for product work.

Scope:

- Astro landing app, Hono API, React dashboard and booking routes, and React console
  under `apps/`.
- Root-only pnpm commands and one root lockfile.
- Local ports 3000–3003, an ignored API environment file, and a development database.
- Repository instructions and product vision.

**Exit gate:** The workspace build passes, all four apps run, dashboard and
booking routes render their sample screens, and the configured development
database connection is verified without exposing credentials.

**Status:** Scaffold checks were previously verified. Product workflows and
production readiness remain future work.

## Phase 1 — Secure tenant and operational foundation

**Outcome:** A clinic can be provisioned and its authorized team can access only
its own operational data.

Scope:

- Server-enforced sessions, organization membership, and roles.
- Tenant-scoped database schema and migrations; browser-safe DTOs and Zod schemas
  in `@dentalhq/contracts`, with PostgreSQL and Drizzle kept server-only.
- Shared appointment-state, ownership, next-action, and audit contracts.
- Console onboarding, bounded support access, and configuration controls.
- Synthetic fixtures, error handling, and observable failures.

**Exit gate:** Automated checks reject unauthenticated, unauthorized, and
cross-tenant access. An operator can onboard a test clinic through supported
interfaces without direct database editing. Migrations work on a clean
development database, and consequential changes have attributable audit records.

## Phase 2 — Booking-request MVP

**Outcome:** A patient can find the right clinic service, submit a booking request,
and receive a clear resolution from staff.

Scope:

- Public clinic service, provider, location, and policy information, keeping the
  marketing site separate from authenticated applications.
- Mobile booking inside the dashboard app's public booking surface, with
  server-validated clinic rules and explicit request-only wording where needed.
- A clinic queue with assigned owners, next actions, and staff confirmation or
  rejection; staff reconcile with the clinic's authoritative schedule.
- Confirmation details and recoverable cancellation or correction paths.

**Exit gate:** An end-to-end synthetic journey moves from public discovery to
request, staff review, and patient-visible resolution. Duplicate submissions are
handled safely. No request is presented as a confirmed appointment before
confirmation. Routing, loading, empty, error, permission, keyboard, and mobile
states are verified, including failures and retries.

## Phase 3 — Appointment readiness

**Outcome:** Patients know what remains before arrival, and staff can resolve
incomplete preparation through an actionable daily queue.

Scope:

- Minimum necessary digital intake and preparation requirements.
- Readiness states, due dates, task ownership, and explicit completion history.
- Secure patient access, guardian requirements where applicable, and recoverable
  incomplete or expired flows.
- Private, type- and size-validated uploads only when a demonstrated workflow
  requires them.

**Exit gate:** A synthetic appointment progresses from incomplete to prepared,
with changes reflected consistently in patient and staff views. Required actions
have owners and observable resolutions. Unauthorized access and upload attempts
are rejected. Recovery, accessibility, mobile, and permission states pass.

## Phase 4 — Reliable scheduling integration

**Outcome:** At least one launch practice-management system can supply reliable
availability and accept safely reconciled appointment writes.

Scope:

- Select a launch integration based on clinic demand and demonstrated vendor access.
- Map providers, locations, appointment types, durations, and applicable scheduling
  constraints to the authoritative schedule.
- Idempotent external writes, conflict handling, bounded retries, reconciliation,
  and operator-visible integration health.
- Keep booking requests and staff confirmation available when real-time support
  is unavailable or degraded.

**Exit gate:** Verified integration tests demonstrate availability reads and
appointment write-back, concurrent booking conflict prevention, duplicate-event
handling, outage recovery, and reconciliation. External writes are auditable.
Patients are never shown unsupported real-time confirmation. If vendor access
is unavailable, this phase remains blocked; request-only pilots must disclose
that limitation and must not claim the integration gate has passed.

## Phase 5 — Controlled pilot and schedule recovery

**Outcome:** A small clinic pilot demonstrates less administrative effort,
better appointment readiness, and measurable recovery of cancelled chair time.

Scope:

- Controlled cancellation recovery with eligible patients, staff oversight,
  acceptance handling, and reconciliation with the schedule.
- Consented communication and patient replies only through validated channels.
- Baselines and metric definitions for booking completion, confirmation time,
  readiness, staff effort, recovered openings, and integration reliability.
- Reversible onboarding and go-live, backup and restore verification, incident
  procedures, support access, and data retention and export decisions.

**Exit gate:** Before real patient data is introduced, launch-market privacy,
security, contractual, and healthcare obligations are reviewed with qualified
advisers; selected providers and plans meet the resulting requirements. Pilot
owners agree on targets, measurement sources, and an observation period before
measurement starts. Pilot results meet those targets with documented limitations,
and a cancelled opening is demonstrably accepted and reconciled. Any unresolved
critical access or data-integrity failure prevents expansion. A request-only
pilot does not satisfy the real-time integration gate in Phase 4.

## Phase 6 — Earned operational expansion

**Outcome:** Proven customer needs extend the core workflow without turning
DentalHQ into a replacement clinical or financial system.

Potential increments, each separately justified:

- Verified deposits and collections workflows through appropriate providers,
  with failed-payment follow-up and accurate payment status.
- Deeper follow-up automation with human approval for consequential actions.
- Multi-location policy, templates, visibility, and coordination.
- Additional integrations supported by repeatable onboarding and reconciliation.

**Exit gate:** Each increment has recorded customer evidence, dependencies,
operating costs, risk ownership, measurable acceptance criteria, and a rollback
path. A controlled release demonstrates its intended outcome without weakening
tenant isolation or the existing booking and readiness loop. Modeled value is
clearly separated from verified financial outcomes.

Clinical charting, imaging, prescribing, autonomous claims, a general ledger,
payroll, underwriting, and a full phone-system replacement remain outside the
first release, as defined in the vision. This phase does not authorize them.

## Roadmap principles

1. **Advance on evidence.** Record validation results and unresolved dependencies
   before marking an exit gate complete. A working page is not a working workflow.
2. **Protect the MVP.** Keep the first loop coherent and small. Moving later-phase
   work earlier requires a documented dependency and customer evidence.
3. **Keep personal development inexpensive.** Prefer free tooling and suitable
   free tiers; document limits and costs before adopting paid dependencies.
   Cost savings do not waive patient-data or launch requirements.
4. **Use synthetic data until ready.** Development database connectivity alone
   does not authorize storing real patient information.
5. **Make state honest.** Distinguish requested, held, confirmed, cancelled, and
   completed appointments. Preserve an explicit fallback when integrations fail.
6. **Close operational loops.** Important work needs an owner, next action, due
   state, and observable resolution. Notifications alone are not outcomes.
7. **Preserve architectural boundaries.** Keep app-specific code in its app,
   introduce shared packages only for demonstrated needs, synchronize API and
   contracts, and keep database access and secrets server-only.
8. **Build trust and accessibility throughout.** Enforce tenant isolation and
   authorization on the server; validate recovery, permission, keyboard, and
   mobile experiences as workflows change.
9. **Coexist with the system of record.** Reconcile external writes, make retries
   idempotent, and avoid duplicate staff entry wherever integration supports it.
10. **Release reversibly.** Use `staging` for development and `main` for production.
    Promotion requires the relevant checks and an explicit release decision;
    deployment and live behavior must be verified before being claimed.
11. **Measure outcomes, not feature counts.** Give metrics a baseline, source,
    definition, and owner. Expand only when observed value justifies added scope.
