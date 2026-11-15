# Repository instructions

Before implementation, read
[`docs/standards/ENGINEERING_GOVERNANCE.md`](docs/standards/ENGINEERING_GOVERNANCE.md),
[`docs/architecture/INITIAL_ARCHITECTURE.md`](docs/architecture/INITIAL_ARCHITECTURE.md),
and [`docs/architecture/DECISION_REGISTER.md`](docs/architecture/DECISION_REGISTER.md).
The governance standard is mandatory. The decision register is authoritative
for approved and pending owner decisions.

## Approved foundation direction

- Keep one codebase and release train; web, API, and worker may run separately.
- Smart Pricing owns products in new standalone installations. Obtain explicit
  ownership rules before synchronizing with an ERP.
- Use local administrator accounts, secure server-side sessions, least-
  privilege role-based access, MFA for privileged users where supported, and
  secure account recovery. Document the detailed permission matrix during admin
  module implementation.
- Support existing client websites through the versioned REST API and
  server-side integration. Do not add a widget unless an owner-approved client
  need requires it.
- Do not add Redis or other infrastructure without measured justification.

## Workspace boundaries

Follow the proposed responsibilities in
[`INITIAL_ARCHITECTURE.md`](docs/architecture/INITIAL_ARCHITECTURE.md):

- `apps/web`: Next.js public/admin presentation; no business calculations or
  direct database access.
- `apps/api`: Fastify HTTP boundary and composition; call application services
  rather than duplicating business rules.
- `apps/worker`: background job execution using the same application services.
- `packages/contracts`, `domain`, `application`, `persistence`, and
  `server-config`: create only when their documented responsibilities have
  actual implementation work.
- Provider adapters translate external systems through documented ports.

The Phase 2 foundation uses `packages/contracts` for shared Zod API contracts,
`packages/server-config` for validated server settings, `packages/persistence`
for Drizzle/PostgreSQL access, and `apps/api` for Fastify composition. Do not add
domain/application packages until real business use cases require them. The
current API exposes only operational health/readiness and OpenAPI endpoints.

Do not create empty or speculative packages. Keep domain logic independent of
frameworks, databases, and provider SDKs. Public responses must never expose
hidden prices; integrations and client data remain installation-specific.

## Phase and validation

The authorized scope is Phase 2 database and backend foundation only. Do not
implement product CRUD, pricing, inventory, customer, quotation, import/export,
ERP, or UI features. Authentication direction is approved by D-06, but login,
sessions, permission enforcement, MFA, recovery, and related security tests
belong to Phase 3 / Issue #6. Do not provision production infrastructure,
deploy, publish packages, or alter approved owner decisions.

Run the applicable root checks before proposing changes:

```sh
pnpm install --frozen-lockfile
pnpm check:workspace
pnpm format:check
pnpm lint
pnpm build
pnpm typecheck
pnpm test
pnpm audit --audit-level high
```

The full test suite requires a disposable PostgreSQL database configured by
`TEST_DATABASE_URL`; never point it at production data. `pnpm test:unit` runs
without PostgreSQL. There are no public/admin UI packages, so browser,
responsive, and feature-workflow results must not be claimed. Report checks
that are not applicable or have not run. Do not work directly on `main`.
