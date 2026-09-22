# Workload Allocation Tool

Internal, on-prem tool that turns inbound work requests into time-bound job
tickets and auto-allocates them to available FTEs by SLA and shift rules.

**Stack:** Next.js (App Router) · Prisma · SQL Server · Windows Integrated Auth
behind IIS. No cloud hosting, no third-party data stores.

> This app lives in `workload-tool/` inside a repository that also contains an
> unrelated storefront application at the repo root. It is fully self-contained:
> its own `package.json`, `node_modules`, config and build. Run every command
> below from **this** directory.
>
> The root `tsconfig.json` and `eslint.config.mjs` exclude `workload-tool/`.
> Keep it that way: the root `include` is `**/*.ts`, and its `@/*` alias points
> at the root's own `src/`, so without the exclusion the storefront's build
> type-checks this app against the wrong paths and fails.

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

This app runs locally, against a local SQL Server. It is not deployable to a
cloud host: the database is on-prem, and dev-mode auth refuses to start when
`NODE_ENV=production` (see [Authentication](#authentication)).

You need Node 20.9+ and a SQL Server reachable on `localhost:1433` — Developer
or Express edition, or a container:

```bash
docker run -d --name wat-sql \
  -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Dev_Passw0rd!" \
  -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
```

**Create the database before migrating.** `prisma migrate deploy` connects to
an existing database and will not create one for you:

```bash
docker exec -i wat-sql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Dev_Passw0rd!' -C \
  -Q "CREATE DATABASE workload_allocation"
```

(On images before 2022 the path is `/opt/mssql-tools/bin/sqlcmd` and `-C` is not
needed. With a locally installed SQL Server, run the same `CREATE DATABASE`
from sqlcmd or SSMS.)

Then:

```bash
cp .env.example .env          # adjust DATABASE_URL for your instance
npm install
npm run db:deploy             # apply prisma/migrations
npm run db:seed               # agents, shifts, SLA rules, sample tickets
npm run dev                   # http://localhost:3000
```

In a second terminal, start the allocator:

```bash
npm run worker                # loops; Ctrl-C to stop
npm run worker:once           # a single pass, then exits
```

`npm run db:migrate` (`prisma migrate dev`) is what you want after changing
`schema.prisma`. It also creates the database if it is missing and runs the
seed automatically, so it is a workable first-run shortcut — but it is a
development command and must never be pointed at production. `db:deploy` only
applies migrations that already exist, and is the production command.

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

### Running on Postgres / Supabase

SQL Server on-prem is the production target. Postgres is supported as a **second
target** for a hosted demo — not a replacement, and not a fork.

`prisma/schema.prisma` stays the single source of truth.
`prisma/postgres/schema.prisma` is **generated** from it by
`scripts/gen-postgres-schema.ts`, which changes only the connector-specific
parts. Never edit the generated file: change the source and run
`npm run pg:schema`.

#### This database is shared

The demo database is the same Supabase project that hosts an unrelated
storefront. They coexist by owning different schemas:

| Schema | Owner |
| --- | --- |
| `public` | the storefront (11 tables) — **not ours, never touched** |
| `workload` | this app (8 tables + its own `_prisma_migrations`) |

What makes that safe is `schemas = ["workload"]` in the generated datasource.
Prisma neither reads nor migrates anything outside it, so the storefront's
tables can never register as drift and can never be dropped by a migration.
Every statement in `prisma/postgres/migrations/` is schema-qualified, so nothing
depends on `search_path` either.

> **There is deliberately no `pg:reset` script.** `prisma migrate reset` drops
> and recreates schemas, and on a shared database that is not a risk worth
> keeping one keystroke away. To rebuild the demo data, re-run the seed — it
> only ever touches `workload`.

#### Commands

```bash
# set DATABASE_URL first (see .env.example) — it is the only one needed
npm run pg:generate    # regenerate the variant schema + Prisma Client
npm run pg:deploy      # apply prisma/postgres/migrations
SEED_ALLOW_NONLOCAL=1 npm run pg:seed
```

There is no `DIRECT_URL`. `directUrl` exists to give migrations a non-pooled
connection when the app runs through a transaction-mode pooler; this app cannot
use one at all (see below), so a second variable would only be the same value
twice with a chance of the two drifting apart.

If you cannot reach the database with Prisma (no password to hand), emit the
seed as SQL instead and paste it into the Supabase SQL editor — same dataset,
same module, so the two cannot diverge:

```bash
npx tsx scripts/seed-to-sql.ts > seed.sql
```

Both targets generate the Prisma Client to the same place, so **whichever you
generated last is the active one**. Switch back with `npm run db:generate`.

#### Four things to know

1. **Use the session-mode connection (`:5432`), not the transaction pooler
   (`:6543`).** The four interactive transactions in `lifecycle.ts`, `run.ts`,
   `tickets.ts` and `leader/actions.ts` are what guarantee a ticket cannot move
   without its audit row committing alongside it. Interactive transactions do
   not work reliably through a transaction-mode pooler, and the failures would
   land exactly on the audit-integrity path.
2. **Postgres is case-sensitive; SQL Server's default collation is not.** AD
   issues UPNs like `First.Last@CONTOSO.LOCAL`. The auth providers lowercase
   before the `adUpn` lookup and the seed stores lowercase, so this holds — but
   any new code path that forgets will fail on Postgres while working on
   SQL Server.
3. **RLS is enabled with no policies on every `workload` table.** The schema is
   not in PostgREST's exposed-schema list, so the anon key cannot reach it;
   deny-by-default makes that explicit if anyone ever exposes the schema.
   Prisma connects as the table owner and bypasses RLS, so the app is
   unaffected — authorization stays in the application layer, exactly as it is
   on-prem. **Do not add `workload` to the exposed schemas.**
4. **It does not change authentication.** Supabase replaces the database only.
   Auth is still `iis` or `dev`, and dev mode refuses to start under
   `NODE_ENV=production` — so this alone does not make the app publicly
   viewable.

This is a deliberate exception to the "no third-party data stores" constraint in
the brief, for demo use. Production stays on-prem SQL Server.

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
| `npm run pg:schema` | regenerate the Postgres schema variant from the source schema |
| `npm run pg:generate` / `pg:deploy` / `pg:seed` | the same flow against Postgres/Supabase |
| `npm run pg:seed:sql` | emit the seed as SQL for a database Prisma cannot reach |
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
