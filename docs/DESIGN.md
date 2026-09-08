# DentalHQ interface design

This document is the durable specification for the clinic login and daily
dashboard. It complements [VISION.md](VISION.md); the approved visual concepts
remain reference material, while this file defines behavior and boundaries.

## Design intent

DentalHQ should feel calm, trustworthy, and operationally clear. Use generous
spacing, restrained color, plain language, and a visible next action. The daily
queue leads the experience; metrics support decisions instead of dominating the
screen.

The palette uses deep forest green (`#174F3B`), soft sage (`#DDE9DF`), warm
ivory (`#F7F5EF`), white surfaces, charcoal-green text, and pale gray-green
borders. Status always combines color with text. Controls use a 44px minimum
target, visible focus rings, and native semantics.

## Login

Desktop uses a 45/55 split layout: a quiet value panel on the left and one
centered sign-in card on the right. The value panel includes the DentalHQ
wordmark, “Your clinic day, clearly organized.”, a short coordination message,
and the benefits Save time, Work together, and Deliver great care.

The card contains “Sign in to your clinic”, labeled email and password fields,
a password visibility control, a full-width sign-in action, secure-access
language, and administrator support copy. Public registration and social login
do not belong here. Password recovery remains hidden until that flow exists.

Below 760px, the page becomes one column, removes nonessential decoration and
benefit rows, and keeps the form nearly full width without horizontal scrolling.

Required states include default, field focus, inline validation, submitting,
neutral invalid credentials, rate limiting, network failure with retry, and an
expired-session message. Failed sign-in must preserve the entered email.

## Clinic dashboard

The dashboard is the clinic team's daily operational start. It answers what
needs attention, who owns the action, and what changed after the team acted.

Desktop has a 232px navigation rail, a primary work column, and a secondary
insight rail. Navigation contains the active clinic plus Today, Appointments,
Patients, Inbox, and Settings. The top bar contains search, notifications, and
the signed-in team member menu.

The Needs attention queue is the dominant element. Every row has a text status,
patient-safe context, owner, due time, and one primary action. The prototype's
synthetic data contains:

| Item | Status | Owner | Timing | Action |
| --- | --- | --- | --- | --- |
| 3 booking requests | Urgent | You · Front Desk | Due now | Review requests |
| 2 forms due today | Pending | You · Front Desk | By 12:00 PM | Follow up |
| 1 patient reply | New | You · Front Desk | By 1:00 PM | View reply |
| Open chair at 2:30 PM | Opportunity | Front Desk | Time-sensitive | Find a patient |

Synthetic queue, readiness, and outcome claims appear only in explicit demo
mode. Normal database-backed sessions show honest empty states until those
workflows exist. Acting on a demo row removes it and reports what changed.

The insight rail shows 12 appointments, 9 ready, and 3 needing attention, plus
the verified-demo outcomes “2 calls avoided” and “1 opening recovered.” These
values must never be represented as production data.

On tablet, insights move below the queue. On mobile, the sidebar becomes an
accessible drawer, queue actions become full width, and critical state remains
visible without hover. Loading uses stable skeletons; empty, search-empty,
network-error, no-membership, permission, and missing-route states all provide a
clear explanation and safe next step.

## Interaction and accessibility principles

- Use outcome-oriented verbs and one dominant next action per queue row.
- Reserve confirmation for destructive or difficult-to-reverse actions.
- Treat the server as the source of truth and preserve tenant scope everywhere.
- Keep browser code free of database clients, private variables, and server code.
- Meet WCAG 2.2 AA contrast, keyboard, landmark, label, and focus requirements.
- Announce loading, errors, and successful changes without stealing focus.
- Respect reduced-motion settings and support 200% zoom and narrow screens.
- Never expose raw identifiers, provider errors, secrets, or unnecessary patient data.
