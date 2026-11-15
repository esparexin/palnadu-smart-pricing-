# Contributing to Palnadu Smart Pricing

Thank you for contributing to Palnadu Smart Pricing. All contributors must follow the mandatory governance standards defined in [`docs/standards/ENGINEERING_GOVERNANCE.md`](docs/standards/ENGINEERING_GOVERNANCE.md) and repository instructions in [`AGENTS.md`](AGENTS.md).

---

## 1. Core Principles

- **Small, Reviewable Changes**: One pull request = one problem category. Do not combine unrelated refactoring, feature work, or configuration changes.
- **Single Source of Truth (SSOT)**: Every business calculation, data model, validation schema, and configuration item must have exactly one authoritative implementation.
- **Zero Dummy / Zombie Code**: No placeholder implementations, fake mock data, dead code, alien patterns, or swallowed exceptions in production paths.
- **Strict File Limits**: Source files in `apps`, `packages`, and `scripts` must not exceed 249 lines unless granted an architectural exception.
- **Strict Naming**: All source files must follow lowercase kebab-case or dot-delimited naming (`[a-z0-9]+([.-][a-z0-9]+)*\.(ts|js|mjs)`).

---

## 2. Development Workflow

1. **Branching**: Never commit directly to `main`. Create a feature or fix branch from up-to-date `main`:
   ```sh
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   ```
2. **Package Boundaries**: Respect monorepo workspace boundaries:
   - `packages/contracts`: Pure schemas, types, and authoritative calculation engines. Leaf package with zero dependencies on apps or persistence.
   - `packages/server-config`: Validated server environment settings.
   - `packages/persistence`: Database schema, migrations, Drizzle ORM client, and repositories.
   - `apps/api`: Fastify HTTP boundary and routing composition.
   - `apps/web`: Future presentation layer (Phase 5+).
3. **Local Validation**: Before pushing or creating a pull request, execute all mandatory checks:
   ```sh
   pnpm install --frozen-lockfile
   pnpm check:workspace
   pnpm check:governance
   pnpm format:check
   pnpm lint
   pnpm build
   pnpm typecheck
   pnpm test:unit
   pnpm audit --audit-level high
   ```
   If a disposable PostgreSQL 17 database is available, run full integration tests:
   ```sh
   export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/palnadu_smart_pricing_test"
   pnpm test
   ```

---

## 3. Pull Request Requirements

- PR title must follow [Conventional Commits](https://www.conventionalcommits.org/) format: `feat(...)`, `fix(...)`, `refactor(...)`, `chore(...)`, `docs(...)`.
- Fill out all sections of `.github/pull_request_template.md`.
- All mandatory CI checks must pass:
  - **Foundation quality checks** (`ci.yml`)
  - **Security audit & secret scanning** (`security.yml`)
  - **Architecture & governance validation** (`architecture.yml`)
  - **UI/UX and accessibility quality checks** (`ui-ux.yml`)
- Merging requires review and approval per [`CODEOWNERS`](.github/CODEOWNERS).
