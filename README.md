# Palnadu.dev Smart Pricing

Standalone Smart Pricing applications are intended to run independently for
each client. The approved architecture, ownership rules, and open decisions are
documented in [`docs/architecture/`](docs/architecture/).

## Repository status

This repository currently contains the approved architecture and the Phase 1
repository foundation. No product applications or feature packages have been
created. Workspace directories are added only when they contain a real,
implemented responsibility.

The proposed application boundaries and dependency rules are in
[`INITIAL_ARCHITECTURE.md`](docs/architecture/INITIAL_ARCHITECTURE.md). The
decision record is
[`DECISION_REGISTER.md`](docs/architecture/DECISION_REGISTER.md).

## Prerequisites

- Node.js 24 or later
- pnpm 11.2.2 (the repository pins this version through Corepack)

Install dependencies from the lockfile:

```sh
corepack pnpm install --frozen-lockfile
```

## Local checks

```sh
pnpm check:workspace
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm audit --audit-level high
```

The current tests cover workspace structure only. Build verification is not
configured because there are no deployable application packages yet. Add
package-specific test and build checks when those packages are implemented;
do not report application checks as passing before they exist and run.

## Governance and security

Read [`AGENTS.md`](AGENTS.md) and the mandatory
[`ENGINEERING_GOVERNANCE.md`](docs/standards/ENGINEERING_GOVERNANCE.md) before
making changes. GitHub Secret Scanning and push protection are enabled for this
repository. Branch protection cannot be configured until a default branch
exists.
