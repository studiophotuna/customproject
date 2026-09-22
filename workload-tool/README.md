# Workload Allocation Tool

Internal, on-prem tool that turns inbound work requests into time-bound job
tickets and auto-allocates them to available FTEs by SLA and shift rules.

**Stack:** Next.js (App Router) · Prisma · SQL Server · Windows Integrated Auth
behind IIS. No cloud hosting, no third-party data stores.

> This app lives in `workload-tool/` inside a repository that also contains an
> unrelated storefront application at the repo root. It is fully self-contained:
> its own `package.json`, `node_modules`, config and build. Run every command
> below from **this** directory.

## What is built (Phases 1–2)

| Scope | State |
| --- | --- |
| Prisma schema wired to SQL Server, init migration, seed | done |
| Auth abstraction — `iis` / `entra` / `dev`, four roles from AD groups | done |
| Ticket lifecycle NEW → ASSIGNED → IN_PROGRESS → ON_HOLD → RESOLVED → CLOSED, audit row per transition | done |
| Manual create-ticket screen and queue view | done |
| Allocation worker as a standalone process | done |
| Leader board with manual override / reassignment | done |
| Mail ingestion | interface + dev stub only — see [Mail ingestion](#mail-ingestion) |
| Business-hours calendar | working-day window implemented; holidays left as a hook |

## Local setup

You need a local SQL Server (Developer or Express edition, or the
`mcr.microsoft.com/mssql/server:2022-latest` container) reachable on
`localhost:1433`, and Node 20.9+.

```bash
cp .env.example .env          # adjust DATABASE_URL for your local instance
npm install
npm run db:deploy             # apply prisma/migrations to the database
npm run db:seed               # agents, shifts, SLA rules, sample tickets
npm run dev                   # http://localhost:3000
```

In a second terminal, start the allocator:

```bash
npm run worker                # loops; Ctrl-C to stop
npm run worker:once           # a single pass, then exits
```

`npm run db:migrate` (`prisma migrate dev`) is the command to use when you
change `schema.prisma` and need a new migration; `db:deploy` just applies what
already exists and is what you want for a first run and for production.

### Clicking through it

The app starts in `AUTH_MODE=dev` with a fake identity and an identity switcher
in the header (dev mode only). Seeded logins:

| UPN | Role | Notes |
| --- | --- | --- |
| `admin@contoso.local` | ADMIN | |
| `manager@contoso.local` | MANAGER | |
| `leader@contoso.local` | LEADER | sees the allocation board |
| `alice@contoso.local` | MEMBER | on shift, allocatable |
| `bob@contoso.local` | MEMBER | cap of 3 — reaches it quickly |
| `carol@contoso.local` | MEMBER | on leave in the scheduler stub, so skipped |
| `dan@contoso.local` | MEMBER | off shift, so skipped |

A useful loop: open `/leader` as Sam Leader, note the five unallocated NEW
tickets and the availability table, run `npm run worker:once`, refresh. Carol
and Dan stay empty; the rest fill up least-loaded-first until they hit cap.

## How it fits together

```
 inbound (email, later)        manual UI
         │                         │
         └────────► Ticket (status NEW, dueAt snapshotted) ◄────┘
                                │
                     worker process (standalone)
                                │
     resolveCandidates(now) ────┤──── allocate()  ← pure, no I/O
       shifts + scheduler       │     src/lib/allocation/allocation-engine.ts
       + open-ticket counts     │
                                ▼
                 assignment rows + audit rows (one transaction)
```

### The allocation engine stays pure

`src/lib/allocation/allocation-engine.ts` is used as supplied: no Prisma, no
I/O, no clock of its own. The data layer resolves availability and open-ticket
counts and hands it plain objects; `src/lib/allocation/run.ts` is the only place
that touches both sides.

The two decision switches are one line each, read from the environment:

```bash
ALLOCATION_ORDERING=priorityBandedFifo   # | pureFifo | strictSlaFirst
ALLOCATION_POLICY=leastLoaded            # | roundRobin
```

Tickets nobody can take are left in the queue. That is also how shift handover
works: an unresolved ticket keeps its `receivedAt`, so it keeps its FIFO
position and its SLA clock, and is reconsidered on the next pass.

### Authentication

`AUTH_MODE` selects a provider in `src/lib/auth/providers/`:

- **`iis`** — reads the identity IIS forwards after Negotiate/NTLM
  (`x-iisnode-logon_user`, `X-Forwarded-User`). *The Node process must not be
  reachable directly:* bind it to `127.0.0.1` and let IIS be the only public
  listener, with Anonymous Authentication disabled.
- **`entra`** — parses the `X-MS-CLIENT-PRINCIPAL` header a fronting proxy
  injects after it has validated the token. Makes no outbound calls. If tokens
  are ever terminated in this process instead, JWT validation must be added
  first.
- **`dev`** — fake identity from `DEV_UPN`, overridable per browser by the
  header switcher. Throws if `NODE_ENV=production`.

Role comes from AD group membership (`AD_GROUP_ADMIN` … `AD_GROUP_MEMBER`,
most-privileged wins), falling back to the `Agent.role` row. The fallback
matters: Windows auth does not carry group membership on the wire, so until a
token-groups lookup is wired up the database is the source of roles.

### Mail ingestion

Deliberately **not** implemented. `src/lib/mail/adapter.ts` defines the contract
and `stub.ts` is the only registered adapter; `MAIL_ADAPTER` set to anything
else throws rather than pretending to work. The worker already calls ingestion
through that interface (`src/worker/ingest.ts`), including mailbox rule
matching, so writing a real EWS/IMAP or Graph adapter changes nothing upstream.

### Leave / WFH availability

`src/lib/scheduler/` defines the interface; `stub.ts` reads
`data/leave-wfh.stub.json`. The real source is expected to be a view onto the
existing scheduler's tables in the same SQL Server instance — add a
`sqlScheduler` and select it in `getScheduler()`.

### SLA clock

`dueAt` is computed once at creation and stored, so later edits to the SLA
matrix never move the clock on tickets already in flight. Calendar-hours is a
plain addition; business-hours walks `BUSINESS_DAYS` / `BUSINESS_DAY_START` /
`BUSINESS_DAY_END`. **Public holidays and per-team calendars are not
implemented** — they go behind `HolidayCalendar` in `src/lib/sla.ts`.

Going ON_HOLD stops the clock: the elapsed hold is added to
`holdAccumulatedMinutes` and `dueAt` is pushed out by the same amount on resume.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm run worker` / `worker:once` | allocation worker |
| `npm run db:deploy` | apply existing migrations |
| `npm run db:migrate` | create a migration after a schema change |
| `npm run db:seed` | reseed local dev data (destructive; refuses non-local hosts) |
| `npm run db:reset` | drop, re-migrate, reseed |
| `npm run check:core` | engine / SLA / lifecycle / role checks, no database needed |
| `npm run lint` | ESLint |

## Deviations from the supplied foundation

Both files were taken as source of truth. Two changes were unavoidable:

1. **`prisma/schema.prisma` — `Assignment.agent` gained
   `onUpdate: NoAction, onDelete: NoAction`.** Without it the schema does not
   compile: SQL Server rejects multiple cascade paths, and `Agent` reaches
   `Assignment` both directly and via `Ticket`. Structure is unchanged, and the
   behaviour is right anyway — an agent with assignment history should not be
   deletable (deactivate with `active` instead).
2. **`prisma/schema.prisma` — the `AuditLog.event` comment lists three more
   values** (`UNASSIGNED`, `STARTED`, `REOPENED`). The lifecycle needs an audit
   row for *every* transition, and the original eight did not cover
   start-work, unassign, or reopen. Comment only; the column is unchanged. The
   vocabulary is enforced in `src/lib/domain/constants.ts` and by a CHECK
   constraint.

`allocation-engine.ts` is unmodified.

A second migration (`20260922090100_enum_check_constraints`) adds CHECK
constraints for the string-enum columns, as `schema.prisma` itself suggests, plus
an invariant tying `onHoldSince` to the `ON_HOLD` status.

## Not yet verified

The init migration was generated with `prisma migrate diff` because no SQL
Server instance was available in the build environment. **It has not been
applied to a live database, and the seed has not been run.** The first thing to
do locally is `npm run db:deploy && npm run db:seed` and confirm both succeed.
Everything that does not need a database — build, typecheck, lint, and the 15
core checks in `npm run check:core` — passes.
