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

Do not create empty or speculative packages. Keep domain logic independent of
frameworks, databases, and provider SDKs. Public responses must never expose
hidden prices; integrations and client data remain installation-specific.

## Phase and validation

The current authorized scope is Phase 1 repository foundation only. Do not
implement product features, database migrations, deployment, or package
publishing without separate approval. Do not alter approved owner decisions;
raise any conflict for review.

Run the applicable root checks before proposing changes:

```sh
pnpm check:workspace
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

There are no application packages yet, so application build, browser, and
feature-test results must not be claimed. Report checks that are not applicable
or have not run. Do not work directly on `main`.
