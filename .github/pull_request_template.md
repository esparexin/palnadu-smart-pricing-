## Summary

<!-- Provide a clear, concise summary of the changes and their intended purpose. -->

## Problem Category

- [ ] Core Foundation / CI / Governance
- [ ] Contracts / Schema / SSOT
- [ ] Persistence / Database / Migrations
- [ ] API Endpoints / Controllers
- [ ] Frontend / Presentation (Phase 5+)
- [ ] Bug Fix / Security Patch

## Engineering Governance Checklist

- [ ] **Small PR**: Focused on a single problem category without cross-cutting refactoring.
- [ ] **SSOT**: Preserves Single Source of Truth; no duplicated business logic or schemas.
- [ ] **No Dead/Dummy Code**: Zero placeholder logic, mock data in production, zombie code, or swallowed exceptions.
- [ ] **File Size Limit**: All modified and new source files are <= 249 lines (or explicitly justified).
- [ ] **Naming Standards**: All files follow lowercase kebab-case / dot-delimited naming.
- [ ] **Circular Dependencies**: Zero circular dependencies introduced.
- [ ] **Leaf Purity**: `packages/contracts` does not import from persistence, api, or server-config.
- [ ] **Strict TypeScript**: Strict type safety adhered to; no `any` or unapproved suppressions.
- [ ] **Security**: No secrets, credentials, or private keys committed. Least privilege enforced.

## Verification Evidence

Local checks executed and passing:

- [ ] `pnpm check:workspace`
- [ ] `pnpm check:governance`
- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] `pnpm typecheck`
- [ ] `pnpm test` (or `pnpm test:unit`)
- [ ] `pnpm audit --audit-level high`

## Documentation & Decisions

- [ ] Documentation updated in `docs/` if architecture, APIs, or contracts changed.
- [ ] Decision register updated if new decisions were approved.
