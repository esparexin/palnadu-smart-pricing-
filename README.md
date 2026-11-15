# Palnadu.dev Smart Pricing

Standalone Smart Pricing applications are intended to run independently for
each client. The approved architecture, ownership rules, and open decisions are
documented in [`docs/architecture/`](docs/architecture/).

## Repository status

This repository contains the Phase 1 repository foundation and the authorized
Phase 2 database/backend foundation. The API currently exposes health,
readiness, and OpenAPI endpoints; product, pricing, inventory, identity, and
other business workflows are not implemented. Workspace directories are
added only when they contain a real, implemented responsibility.

The proposed application boundaries and dependency rules are in
[`INITIAL_ARCHITECTURE.md`](docs/architecture/INITIAL_ARCHITECTURE.md). The
decision record is
[`DECISION_REGISTER.md`](docs/architecture/DECISION_REGISTER.md).

## Prerequisites

- Node.js 24 or later
- pnpm 11.2.2 (the repository pins this version through Corepack)
- PostgreSQL for migrations and the full integration test suite

Install dependencies from the lockfile and prepare a local `.env` from the
example. Use separate disposable databases for development and tests:

```sh
corepack pnpm install --frozen-lockfile
cp .env.example .env
```

The example credentials are for local development only. Never reuse them in
production, commit `.env`, or point `TEST_DATABASE_URL` at production data.

## Local checks

```sh
pnpm check:workspace
pnpm format:check
pnpm lint
pnpm build
pnpm typecheck
pnpm test:unit
pnpm db:check
pnpm db:migrate
pnpm test
pnpm audit --audit-level high
```

`pnpm test` runs the full suite and requires `TEST_DATABASE_URL`; the database
integration test applies migrations to that database. `pnpm test:unit` does not
require PostgreSQL. Keep the test database separate and disposable. The initial migration contains only the
standalone catalogue foundation (brands, categories, products, product-category
links, and variants). Pricing, inventory, customer, quotation, import, and ERP
schemas remain gated by the existing decision register. Authentication follows
approved D-06 direction but is not implemented in this phase.

Start the API after building and setting valid server environment variables:

```sh
pnpm --filter @palnadu/api start
```

The API health, readiness, and OpenAPI endpoints are under `/api/v1`. No
product CRUD routes or public/admin UI exist yet.

## Governance and security

Read [`AGENTS.md`](AGENTS.md) and the mandatory
[`ENGINEERING_GOVERNANCE.md`](docs/standards/ENGINEERING_GOVERNANCE.md) before
making changes. GitHub Secret Scanning and push protection are enabled for this
repository. Branch protection cannot be configured until a default branch
exists.
